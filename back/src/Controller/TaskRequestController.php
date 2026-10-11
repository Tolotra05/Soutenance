<?php

namespace App\Controller;

use App\Entity\Project;
use App\Entity\Subtask;
use App\Entity\TaskRequest;
use App\Entity\User;
use App\Service\NotificationService;
use App\Service\ProjectAccessService;
use App\Service\ProjectSerializer;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Demandes de tâche formulées par le client, validées par l'admin / le chef
 * de projet. Une approbation crée directement une Subtask sur le projet
 * (comportement repris du front, lib/contexts/projects-context.tsx).
 */
#[OA\Tag(name: 'Task requests')]
class TaskRequestController extends AbstractController
{
    #[Route('/api/projects/{id}/task-requests', name: 'api_task_requests_create', methods: ['POST'])]
    #[OA\Response(response: 201, description: 'Demande de tâche créée.')]
    #[OA\Response(response: 400, description: 'Titre manquant.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Réservé au client du projet.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
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
        if (!$access->isClient($project, $user)) {
            return $this->json(['message' => 'Réservé au client du projet.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            return $this->json(['message' => 'Le titre est obligatoire.'], 400);
        }

        $taskRequest = new TaskRequest();
        $taskRequest->setProject($project);
        $taskRequest->setClient($user);
        $taskRequest->setTitle($title);
        $taskRequest->setDescription((string) ($data['description'] ?? ''));
        $taskRequest->setPriority((string) ($data['priority'] ?? 'medium'));
        $taskRequest->setPhotoUrl($data['photoUrl'] ?? null);
        $taskRequest->setPhotoName($data['photoName'] ?? null);
        if (!empty($data['besoinDate'])) {
            try {
                $taskRequest->setBesoinDate(new \DateTimeImmutable((string) $data['besoinDate']));
            } catch (\Exception) {
                return $this->json(['message' => 'Date de besoin invalide.'], 400);
            }
        }

        $notifications->pushToAdmins('task_requested', 'Demande de tâche client', sprintf('« %s » : %s demande une nouvelle tâche « %s ».', $project->getTitle(), $user->getName(), $title), $project);

        $em->persist($taskRequest);
        $em->flush();

        return $this->json($serializer->serializeTaskRequest($taskRequest), 201);
    }

    #[Route('/api/task-requests/{id}/review', name: 'api_task_requests_review', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Décision enregistrée ; une sous-tâche est créée si approuvée.')]
    #[OA\Response(response: 400, description: 'Décision invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: "La demande n'est plus en attente.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function review(
        #[MapEntity(mapping: ['id' => 'publicId'])] TaskRequest $taskRequest,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
        NotificationService $notifications,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        $isAdmin = $access->isAdmin($user);
        $isManager = $access->isManager($taskRequest->getProject(), $user);
        if (!$isAdmin && !$isManager) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        if ($taskRequest->getStatus() !== 'pending') {
            return $this->json(['message' => "Cette demande n'est plus en attente."], 409);
        }

        $data = json_decode($request->getContent(), true);
        $decision = (string) ($data['decision'] ?? '');
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            return $this->json(['message' => 'Décision invalide.'], 400);
        }

        $project = $taskRequest->getProject();
        $createdSubtask = null;

        if ($decision === 'approved') {
            $projectEnd = $project->getEndDate();
            $dueDate = $projectEnd;
            if ($taskRequest->getBesoinDate() !== null && $projectEnd !== null && $taskRequest->getBesoinDate() < $projectEnd) {
                $dueDate = $taskRequest->getBesoinDate();
            }

            $subtask = new Subtask();
            $subtask->setProject($project);
            $subtask->setTitle($taskRequest->getTitle());
            $subtask->setDescription($taskRequest->getDescription());
            $subtask->setPriority($taskRequest->getPriority());
            $subtask->setStartDate(new \DateTimeImmutable());
            $subtask->setDueDate($dueDate ?? (new \DateTimeImmutable())->modify('+7 days'));
            $em->persist($subtask);
            $createdSubtask = $subtask;

            if ($project->getStatus() === 'assigned') {
                $project->setStatus('in_progress');
            }
        }

        $taskRequest->setStatus($decision);
        $taskRequest->setReviewedBy($user);
        $taskRequest->setReviewedAt(new \DateTimeImmutable());
        $taskRequest->setReviewNote((string) ($data['note'] ?? ''));

        if ($taskRequest->getClient()) {
            $notifications->push(
                $taskRequest->getClient(),
                $decision === 'approved' ? 'task_request_approved' : 'task_request_rejected',
                $decision === 'approved' ? 'Tâche ajoutée' : 'Demande refusée',
                $decision === 'approved'
                    ? sprintf('Votre demande « %s » a été acceptée et ajoutée au projet « %s ».', $taskRequest->getTitle(), $project->getTitle())
                    : sprintf('Votre demande « %s » a été refusée.', $taskRequest->getTitle()),
                $project,
            );
        }

        $em->flush();

        return $this->json([
            ...$serializer->serializeTaskRequest($taskRequest),
            'createdSubtask' => $createdSubtask ? $serializer->serializeSubtask($createdSubtask, [], []) : null,
        ]);
    }
}
