<?php

namespace App\Controller;

use App\Entity\Project;
use App\Entity\ProjectMember;
use App\Entity\Subtask;
use App\Entity\SubtaskComment;
use App\Entity\User;
use App\Service\NotificationService;
use App\Service\ProjectAccessService;
use App\Service\ProjectSerializer;
use App\Service\SubtaskWorkflowService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sous-tâches : auparavant uniquement du state React local
 * (lib/contexts/projects-context.tsx), aucune de ces actions ne touchait le
 * backend. La logique de recalcul (progression projet, auto-complétion,
 * timer) vit dans SubtaskWorkflowService, pas ici.
 */
#[OA\Tag(name: 'Subtasks')]
class SubtaskController extends AbstractController
{
    private const ALLOWED_STATUSES = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
    private const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    #[Route('/api/projects/{id}/subtasks', name: 'api_subtasks_create', methods: ['POST'])]
    #[OA\Response(response: 201, description: 'Sous-tâche créée.')]
    #[OA\Response(response: 400, description: 'Données invalides.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function create(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
        NotificationService $notifications,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            return $this->json(['message' => 'Le titre est obligatoire.'], 400);
        }
        $priority = (string) ($data['priority'] ?? 'medium');
        if (!in_array($priority, self::ALLOWED_PRIORITIES, true)) {
            return $this->json(['message' => 'Priorité invalide.'], 400);
        }

        $assignedTo = null;
        if (!empty($data['assignedToId'])) {
            $assignedTo = $em->getRepository(User::class)->findOneBy(['publicId' => (string) $data['assignedToId']]);
            if (!$assignedTo) {
                return $this->json(['message' => 'Utilisateur assigné introuvable.'], 404);
            }
        }

        try {
            $startDate = new \DateTimeImmutable((string) ($data['startDate'] ?? 'now'));
            $dueDate = new \DateTimeImmutable((string) ($data['dueDate'] ?? '+7 days'));
        } catch (\Exception) {
            return $this->json(['message' => 'Date invalide.'], 400);
        }

        $subtask = new Subtask();
        $subtask->setProject($project);
        $subtask->setTitle($title);
        $subtask->setDescription((string) ($data['description'] ?? ''));
        $subtask->setPriority($priority);
        $subtask->setAssignedTo($assignedTo);
        $subtask->setStartDate($startDate);
        $subtask->setDueDate($dueDate);

        if ($project->getStatus() === 'assigned') {
            $project->setStatus('in_progress');
        }

        if ($assignedTo !== null) {
            $members = $project->getMembers() ?? [];
            $already = false;
            foreach ($members as $m) {
                if (($m['userId'] ?? null) === $assignedTo->getPublicId()) {
                    $already = true;
                    break;
                }
            }
            if (!$already) {
                $members[] = ['userId' => $assignedTo->getPublicId(), 'role' => 'membre', 'joinedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM)];
                $project->setMembers($members);
            }

            $existingMember = $em->getRepository(ProjectMember::class)->findOneBy(['project' => $project, 'user' => $assignedTo]);
            if (!$existingMember) {
                $pm = new ProjectMember();
                $pm->setProject($project)->setUser($assignedTo)->setRole('membre');
                $em->persist($pm);
            }
        }

        if ($assignedTo !== null) {
            $notifications->push($assignedTo, 'subtask_assigned', 'Nouvelle sous-tâche', sprintf('Vous avez été assigné à « %s ».', $title), $project);
        }

        $em->persist($subtask);
        $em->flush();

        return $this->json($serializer->serializeSubtask($subtask, [], []), 201);
    }

    #[Route('/api/subtasks/{id}/status', name: 'api_subtasks_status', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Statut mis à jour.')]
    #[OA\Response(response: 400, description: 'Statut invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Sous-tâche introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function updateStatus(
        #[MapEntity(mapping: ['id' => 'publicId'])] Subtask $subtask,
        Request $request,
        ProjectAccessService $access,
        SubtaskWorkflowService $workflow,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
        NotificationService $notifications,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$access->canAccess($subtask->getProject(), $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $status = (string) ($data['status'] ?? '');
        if (!in_array($status, self::ALLOWED_STATUSES, true)) {
            return $this->json(['message' => 'Statut invalide.'], 400);
        }

        $workflow->updateStatus($subtask, $status);

        if ($status === 'review') {
            $project = $subtask->getProject();
            if ($project->getManager() && $project->getManager()->getId() !== $user->getId()) {
                $notifications->push($project->getManager(), 'subtask_reviewed', 'Sous-tâche à valider', sprintf('« %s » est terminée et attend votre validation.', $subtask->getTitle()), $project);
            }
        }

        $em->flush();

        return $this->json($serializer->serializeSubtask($subtask, [], []));
    }

    #[Route('/api/subtasks/{id}/approve', name: 'api_subtasks_approve', methods: ['POST'])]
    #[OA\Response(response: 200, description: 'Sous-tâche approuvée (passe à `done`).')]
    #[OA\Response(response: 404, description: 'Sous-tâche introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function approve(
        #[MapEntity(mapping: ['id' => 'publicId'])] Subtask $subtask,
        ProjectAccessService $access,
        SubtaskWorkflowService $workflow,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
        NotificationService $notifications,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        $isAdmin = $access->isAdmin($user);
        $isManager = $access->isManager($subtask->getProject(), $user);
        if (!$isAdmin && !$isManager) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $workflow->approve($subtask);

        $project = $subtask->getProject();
        foreach ([$subtask->getAssignedTo(), $project->getClient()] as $recipient) {
            if ($recipient !== null && $recipient->getId() !== $user->getId()) {
                $notifications->push($recipient, 'subtask_reviewed', 'Sous-tâche validée', sprintf('Votre sous-tâche « %s » a été validée.', $subtask->getTitle()), $project);
            }
        }

        $em->flush();

        return $this->json($serializer->serializeSubtask($subtask, [], []));
    }

    #[Route('/api/subtasks/{id}/assign', name: 'api_subtasks_assign', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Sous-tâche assignée.')]
    #[OA\Response(response: 404, description: 'Sous-tâche ou utilisateur introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function assign(
        #[MapEntity(mapping: ['id' => 'publicId'])] Subtask $subtask,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        $isAdmin = $access->isAdmin($user);
        $isManager = $access->isManager($subtask->getProject(), $user);
        if (!$isAdmin && !$isManager) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $employeeId = $data['employeeId'] ?? null;

        $assignedTo = null;
        if ($employeeId) {
            $assignedTo = $em->getRepository(User::class)->findOneBy(['publicId' => (string) $employeeId]);
            if (!$assignedTo) {
                return $this->json(['message' => 'Utilisateur introuvable.'], 404);
            }

            $project = $subtask->getProject();
            $members = $project->getMembers() ?? [];
            $already = array_filter($members, fn ($m) => ($m['userId'] ?? null) === $assignedTo->getPublicId());
            if (!$already) {
                $members[] = ['userId' => $assignedTo->getPublicId(), 'role' => 'membre', 'joinedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM)];
                $project->setMembers($members);
            }
        }

        $subtask->setAssignedTo($assignedTo);
        $em->flush();

        return $this->json($serializer->serializeSubtask($subtask, [], []));
    }

    #[Route('/api/subtasks/{id}/progress', name: 'api_subtasks_progress', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Progression mise à jour.')]
    #[OA\Response(response: 400, description: 'Progression invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function updateProgress(
        #[MapEntity(mapping: ['id' => 'publicId'])] Subtask $subtask,
        Request $request,
        ProjectAccessService $access,
        SubtaskWorkflowService $workflow,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$access->canAccess($subtask->getProject(), $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!isset($data['progress']) || !is_numeric($data['progress'])) {
            return $this->json(['message' => 'Progression invalide.'], 400);
        }

        $workflow->updateProgress($subtask, (int) $data['progress']);
        $em->flush();

        return $this->json($serializer->serializeSubtask($subtask, [], []));
    }

    #[Route('/api/subtasks/{id}/timer', name: 'api_subtasks_timer_toggle', methods: ['POST'])]
    #[OA\Response(response: 200, description: 'Timer démarré ou arrêté (toggle).')]
    public function toggleTimer(
        #[MapEntity(mapping: ['id' => 'publicId'])] Subtask $subtask,
        ProjectAccessService $access,
        SubtaskWorkflowService $workflow,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$access->canAccess($subtask->getProject(), $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $workflow->toggleTimer($subtask);
        $em->flush();

        return $this->json($serializer->serializeSubtask($subtask, [], []));
    }

    #[Route('/api/subtasks/{id}/comments', name: 'api_subtasks_comments_create', methods: ['POST'])]
    #[OA\Response(response: 201, description: 'Commentaire ajouté.')]
    #[OA\Response(response: 400, description: 'Contenu manquant.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function addComment(
        #[MapEntity(mapping: ['id' => 'publicId'])] Subtask $subtask,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$access->canAccess($subtask->getProject(), $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $content = trim((string) ($data['content'] ?? ''));
        if ($content === '') {
            return $this->json(['message' => 'Le commentaire ne peut pas être vide.'], 400);
        }

        $comment = new SubtaskComment();
        $comment->setSubtask($subtask)->setAuthor($user)->setContent($content);
        $em->persist($comment);
        $em->flush();

        return $this->json($serializer->serializeComment($comment), 201);
    }
}
