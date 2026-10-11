<?php

namespace App\Controller;

use App\Entity\Project;
use App\Entity\ProjectStatusLog;
use App\Entity\User;
use App\Repository\AttachmentRepository;
use App\Repository\CalendarEventRepository;
use App\Repository\ModificationRequestRepository;
use App\Repository\ProjectRepository;
use App\Repository\RequeteRepository;
use App\Repository\SubtaskCommentRepository;
use App\Repository\SubtaskRepository;
use App\Repository\TaskRequestRepository;
use App\Repository\UserRepository;
use App\Service\ProjectSerializer;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[OA\Tag(name: 'Projects')]
class ProjectController extends AbstractController
{
    private function parseOptionalDate(mixed $value, ?\DateTimeImmutable $default = null): ?\DateTimeImmutable
    {
        if ($value === null || $value === '') {
            return $default;
        }

        try {
            return new \DateTimeImmutable((string) $value);
        } catch (\Exception) {
            throw new \InvalidArgumentException('Date de projet invalide.');
        }
    }

    private const DEFAULT_PAGE_LIMIT = 50;
    private const MAX_PAGE_LIMIT = 200;

    #[Route('/api/projects', name: 'api_projects_list', methods: ['GET'])]
    #[OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 50, maximum: 200, minimum: 1), description: 'Nombre maximum de projets à renvoyer.')]
    #[OA\Parameter(name: 'offset', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 0, minimum: 0), description: 'Nombre de projets à sauter (pagination), triés du plus récent au plus ancien.')]
    #[OA\Response(
        response: 200,
        description: 'Page de projets, triés du plus récent au plus ancien, avec métadonnées de pagination.',
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Project')),
            new OA\Property(property: 'meta', properties: [
                new OA\Property(property: 'total', type: 'integer', description: 'Nombre total de projets, toutes pages confondues.', example: 42),
                new OA\Property(property: 'limit', type: 'integer', example: 50),
                new OA\Property(property: 'offset', type: 'integer', example: 0),
            ], type: 'object'),
        ])
    )]
    public function list(
        Request $request,
        ProjectRepository $projectRepository,
        SubtaskRepository $subtaskRepository,
        SubtaskCommentRepository $commentRepository,
        AttachmentRepository $attachmentRepository,
        ModificationRequestRepository $modificationRepository,
        TaskRequestRepository $taskRequestRepository,
        RequeteRepository $requeteRepository,
        CalendarEventRepository $eventRepository,
        ProjectSerializer $serializer,
    ): JsonResponse {
        $limit = max(1, min(self::MAX_PAGE_LIMIT, (int) $request->query->get('limit', self::DEFAULT_PAGE_LIMIT)));
        $offset = max(0, (int) $request->query->get('offset', 0));

        $projects = $projectRepository->findPageWithRelations($limit, $offset);
        $total = $projectRepository->countAll();

        // Batch-fetch every nested collection for the whole page (a handful of
        // extra queries total), instead of N+1 queries per project.
        $subtasks = $subtaskRepository->findByProjects($projects);
        $comments = $commentRepository->findBySubtasks($subtasks);
        $attachments = $attachmentRepository->findByProjects($projects);
        $subtaskAttachments = $attachmentRepository->findBySubtasks($subtasks);
        $modifications = $modificationRepository->findByProjects($projects);
        $taskRequests = $taskRequestRepository->findByProjects($projects);
        $requetes = $requeteRepository->findByProjects($projects);

        $subtasksByProject = [];
        foreach ($subtasks as $subtask) {
            $subtasksByProject[$subtask->getProject()?->getId()][] = $subtask;
        }
        $commentsByProject = [];
        foreach ($comments as $comment) {
            $pid = $comment->getSubtask()?->getProject()?->getId();
            $commentsByProject[$pid][] = $comment;
        }
        $attachmentsByProject = [];
        foreach ([...$attachments, ...$subtaskAttachments] as $attachment) {
            $pid = $attachment->getProject()?->getId() ?? $attachment->getSubtask()?->getProject()?->getId();
            $attachmentsByProject[$pid][] = $attachment;
        }
        $modificationsByProject = [];
        foreach ($modifications as $mod) {
            $modificationsByProject[$mod->getProject()?->getId()][] = $mod;
        }
        $taskRequestsByProject = [];
        foreach ($taskRequests as $tr) {
            $taskRequestsByProject[$tr->getProject()?->getId()][] = $tr;
        }
        $requetesByProject = [];
        foreach ($requetes as $r) {
            $requetesByProject[$r->getProject()?->getId()][] = $r;
        }
        $events = $eventRepository->findByProjects($projects);
        $eventsByProject = [];
        foreach ($events as $e) {
            $eventsByProject[$e->getProject()?->getId()][] = $e;
        }

        $data = array_map(function (Project $p) use (
            $serializer, $subtasksByProject, $commentsByProject, $attachmentsByProject,
            $modificationsByProject, $taskRequestsByProject, $requetesByProject, $eventsByProject,
        ) {
            $pid = $p->getId();

            return $serializer->serializeProject(
                $p,
                $subtasksByProject[$pid] ?? [],
                $commentsByProject[$pid] ?? [],
                $attachmentsByProject[$pid] ?? [],
                $modificationsByProject[$pid] ?? [],
                $taskRequestsByProject[$pid] ?? [],
                $requetesByProject[$pid] ?? [],
                $eventsByProject[$pid] ?? [],
            );
        }, $projects);

        return $this->json([
            'data' => $data,
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ]);
    }

    #[Route('/api/projects', name: 'api_projects_create', methods: ['POST'])]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['title'],
            properties: [
                new OA\Property(property: 'title', type: 'string', example: 'Refonte site vitrine'),
                new OA\Property(property: 'description', type: 'string', example: 'Refonte complète du site marketing.'),
                new OA\Property(property: 'priority', type: 'string', enum: ['low', 'medium', 'high'], example: 'medium'),
                new OA\Property(property: 'budget', type: 'integer', example: 5000),
                new OA\Property(property: 'startDate', type: 'string', format: 'date-time', description: 'Défaut : maintenant.'),
                new OA\Property(property: 'endDate', type: 'string', format: 'date-time', description: 'Défaut : +30 jours.'),
                new OA\Property(property: 'category', type: 'string', example: 'web'),
            ]
        )
    )]
    #[OA\Response(
        response: 201,
        description: "Projet créé avec le statut `pending`. Le client authentifié devient automatiquement membre.",
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'id', type: 'string', format: 'uuid'),
                new OA\Property(property: 'title', type: 'string'),
                new OA\Property(property: 'description', type: 'string'),
                new OA\Property(property: 'status', type: 'string', example: 'pending'),
                new OA\Property(property: 'priority', type: 'string'),
                new OA\Property(property: 'budget', type: 'integer'),
                new OA\Property(property: 'progress', type: 'integer', example: 0),
                new OA\Property(property: 'startDate', type: 'string', format: 'date-time', nullable: true),
                new OA\Property(property: 'endDate', type: 'string', format: 'date-time', nullable: true),
                new OA\Property(property: 'category', type: 'string'),
                new OA\Property(property: 'createdAt', type: 'string', format: 'date-time'),
                new OA\Property(property: 'members', type: 'array', items: new OA\Items(ref: '#/components/schemas/ProjectMemberEntry')),
            ]
        )
    )]
    public function create(Request $request, EntityManagerInterface $em, \App\Service\NotificationService $notifications): JsonResponse
    {
        /** @var User $client */
        $client = $this->getUser();

        $data = json_decode($request->getContent(), true);

        $project = new Project();
        $project->setTitle($data['title'] ?? '');
        $project->setDescription($data['description'] ?? '');
        $project->setStatus('pending');
        $project->setPriority($data['priority'] ?? 'medium');
        $project->setBudget((int) ($data['budget'] ?? 0));
        $project->setProgress(0);
        $project->setStartDate($this->parseOptionalDate($data['startDate'] ?? null, new \DateTimeImmutable()));
        $project->setEndDate($this->parseOptionalDate($data['endDate'] ?? null, (new \DateTimeImmutable())->modify('+30 days')));
        $project->setCategory($data['category'] ?? '');
        $project->setClient($client);

        // Initialize members with the client
        $members = [
            [
                'userId' => $client->getPublicId(),
                'role' => 'client',
                'joinedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ],
        ];
        $project->setMembers($members);

        // Keep the relational ProjectMember table synchronized with the JSON
        // members field used by the existing frontend.
        $projectMember = new \App\Entity\ProjectMember();
        $projectMember->setProject($project);
        $projectMember->setUser($client);
        $projectMember->setRole('client');
        $em->persist($projectMember);

        $statusLog = new ProjectStatusLog();
        $statusLog->setProject($project);
        $statusLog->setFromStatus(null);
        $statusLog->setToStatus('pending');
        $statusLog->setActor($client);

        $notifications->pushToAdmins(
            'project_submitted',
            'Nouveau projet soumis',
            sprintf('« %s » attend validation.', $project->getTitle()),
            $project,
        );

        $em->persist($project);
        $em->persist($statusLog);
        $em->flush();

        return $this->json([
            'id' => $project->getPublicId(),
            'title' => $project->getTitle(),
            'description' => $project->getDescription(),
            'status' => $project->getStatus(),
            'priority' => $project->getPriority(),
            'budget' => $project->getBudget(),
            'progress' => $project->getProgress(),
            'startDate' => $project->getStartDate()?->format(\DateTimeInterface::ATOM),
            'endDate' => $project->getEndDate()?->format(\DateTimeInterface::ATOM),
            'category' => $project->getCategory(),
            'createdAt' => $project->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'members' => $project->getMembers(),
        ], 201);
    }

    #[Route('/api/projects/{id}/status', name: 'api_projects_status', methods: ['PATCH'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['status'],
            properties: [
                new OA\Property(property: 'status', type: 'string', enum: ['pending', 'validated', 'assigned', 'in_progress', 'completed', 'rejected']),
            ]
        )
    )]
    #[OA\Response(
        response: 200,
        description: 'Statut mis à jour.',
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'id', type: 'string', format: 'uuid'),
            new OA\Property(property: 'status', type: 'string'),
        ])
    )]
    #[OA\Response(response: 400, description: 'Statut invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: "Non autorisé (réservé à l'admin ou au chef de projet assigné).", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function updateStatus(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $currentUser */
        $currentUser = $this->getUser();

        $isAdmin = in_array('ROLE_ADMIN', $currentUser->getRoles(), true);
        $isManager = $project->getManager()?->getId() === $currentUser->getId();
        if (!$isAdmin && !$isManager) return $this->json(['message' => 'Non autorisé.'], 403);

        $data = json_decode($request->getContent(), true);
        $status = (string) ($data['status'] ?? '');
        $allowed = ['pending', 'validated', 'assigned', 'in_progress', 'completed', 'rejected'];
        if (!in_array($status, $allowed, true)) return $this->json(['message' => 'Statut invalide.'], 400);

        $log = new ProjectStatusLog();
        $log->setProject($project);
        $log->setFromStatus($project->getStatus());
        $log->setToStatus($status);
        $log->setActor($currentUser);
        $project->setStatus($status);
        $em->persist($log);
        $em->flush();

        return $this->json(['id' => $project->getPublicId(), 'status' => $project->getStatus()]);
    }

    #[Route('/api/projects/{id}/members', name: 'api_projects_add_member', methods: ['POST'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['userId'],
            properties: [
                new OA\Property(property: 'userId', type: 'string', description: "Identifiant public (UUID) ou e-mail de l'utilisateur.", example: 'f62b9ea6-8fb7-4c18-8db2-3b8f5634c614'),
                new OA\Property(property: 'role', type: 'string', enum: ['membre', 'chef_de_projet', 'client'], example: 'membre'),
            ]
        )
    )]
    #[OA\Response(
        response: 200,
        description: 'Membre ajouté au champ JSON `members` du projet.',
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'message', type: 'string'),
            new OA\Property(property: 'members', type: 'array', items: new OA\Items(ref: '#/components/schemas/ProjectMemberEntry')),
        ])
    )]
    #[OA\Response(response: 400, description: "Données invalides, utilisateur ou rôle manquant/invalide.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou utilisateur introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: 'Utilisateur déjà membre du projet.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function addMember(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $currentUser */
        $currentUser = $this->getUser();

        // Vérifier les permissions : admin, client du projet, ou chef_de_projet déjà membre
        $isAdmin = in_array('ROLE_ADMIN', $currentUser->getRoles(), true);
        $isClient = $project->getClient()?->getId() === $currentUser->getId();
        $isManager = $project->getManager()?->getId() === $currentUser->getId();
        $members = $project->getMembers() ?? [];
        $isMember = false;
        foreach ($members as $m) {
            if (($m['userId'] ?? '') === $currentUser->getPublicId()) {
                $isMember = true;
                break;
            }
        }
        $isProjectMember = $isClient || $isManager || $isMember;
        if (!$isAdmin && !$isProjectMember) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        $userId = (string) ($data['userId'] ?? '');
        $role = (string) ($data['role'] ?? 'membre');

        if ($userId === '') {
            return $this->json(['message' => 'L\'utilisateur est obligatoire.'], 400);
        }

        $member = str_contains($userId, '@')
            ? $userRepository->findOneBy(['email' => $userId])
            : $userRepository->findOneBy(['publicId' => $userId]);
        if (!$member) {
            return $this->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        $allowedRoles = ['membre', 'chef_de_projet', 'client'];
        if (!in_array($role, $allowedRoles, true)) {
            return $this->json(['message' => 'Rôle invalide.'], 400);
        }

        $members = $project->getMembers() ?? [];
        foreach ($members as $existingMember) {
            if (($existingMember['userId'] ?? '') === $member->getPublicId()) {
                return $this->json(['message' => 'Cet Utilisateur est déjà un membre du projet.'], 409);
            }
        }

        $members[] = [
            'userId' => $member->getPublicId(),
            'role' => $role,
            'joinedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];

        $project->setMembers($members);
        $em->flush();

        return $this->json([
            'message' => 'Membre ajouté avec succès.',
            'members' => $members,
        ], 200);
    }

    #[Route('/api/projects/{projectId}/members/{userId}', name: 'api_projects_remove_member', methods: ['DELETE'])]
    #[OA\Parameter(name: 'projectId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'Identifiant du projet.')]
    #[OA\Parameter(name: 'userId', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: "Identifiant public (UUID) de l'utilisateur à retirer.")]
    #[OA\Response(
        response: 200,
        description: 'Membre retiré du champ JSON `members` du projet.',
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'message', type: 'string'),
            new OA\Property(property: 'members', type: 'array', items: new OA\Items(ref: '#/components/schemas/ProjectMemberEntry')),
        ])
    )]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou membre introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function removeMember(
        #[MapEntity(mapping: ['projectId' => 'publicId'])] Project $project,
        string $userId,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $currentUser */
        $currentUser = $this->getUser();

        // Vérifier les permissions : admin, client du projet, ou chef_de_projet déjà membre
        $isAdmin = in_array('ROLE_ADMIN', $currentUser->getRoles(), true);
        $isClient = $project->getClient()?->getId() === $currentUser->getId();
        $isManager = $project->getManager()?->getId() === $currentUser->getId();
        $members = $project->getMembers() ?? [];
        $isMember = false;
        foreach ($members as $m) {
            if (($m['userId'] ?? '') === $currentUser->getPublicId()) {
                $isMember = true;
                break;
            }
        }
        $isProjectMember = $isClient || $isManager || $isMember;
        if (!$isAdmin && !$isProjectMember) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $members = $project->getMembers() ?? [];
        $newMembers = array_filter($members, function ($m) use ($userId) {
            return ($m['userId'] ?? '') !== $userId;
        });

        if (count($newMembers) === count($members)) {
            return $this->json(['message' => 'Membre non trouvé.'], 404);
        }

        $project->setMembers(array_values($newMembers));
        $em->flush();

        return $this->json([
            'message' => 'Membre retiré avec succès.',
            'members' => $project->getMembers(),
        ], 200);
    }
}