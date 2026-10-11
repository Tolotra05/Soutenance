<?php

namespace App\Controller;

use App\Entity\Project;
use App\Entity\ProjectMember;
use App\Entity\ProjectStatusLog;
use App\Entity\User;
use App\Repository\ProjectStatusLogRepository;
use App\Repository\UserRepository;
use App\Service\ProjectAccessService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Workflow "Projets" du Lot 1 :
 *   soumission client (ProjectController::create, status = pending)
 *     -> validation ou rejet par l'admin
 *     -> assignation d'un chef de projet (manager)
 *
 * Nouveau contrôleur : ne modifie aucun fichier existant.
 */
#[OA\Tag(name: 'Project workflow')]
class ProjectWorkflowController extends AbstractController
{
    private function serializeProject(Project $project): array
    {
        return [
            'id' => $project->getPublicId(),
            'title' => $project->getTitle(),
            'status' => $project->getStatus(),
            'client' => $project->getClient() ? [
                'id' => $project->getClient()->getPublicId(),
                'name' => $project->getClient()->getName(),
            ] : null,
            'manager' => $project->getManager() ? [
                'id' => $project->getManager()->getPublicId(),
                'name' => $project->getManager()->getName(),
            ] : null,
        ];
    }

    private function serializeLog(ProjectStatusLog $log): array
    {
        return [
            'id' => $log->getPublicId(),
            'fromStatus' => $log->getFromStatus(),
            'toStatus' => $log->getToStatus(),
            'reason' => $log->getReason(),
            'actor' => $log->getActor() ? [
                'id' => $log->getActor()->getPublicId(),
                'name' => $log->getActor()->getName(),
            ] : null,
            'createdAt' => $log->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    #[Route('/api/projects/{id}/validate', name: 'api_projects_validate', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\Response(
        response: 200,
        description: "Projet passé au statut `validated`.",
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'message', type: 'string'),
            new OA\Property(property: 'project', ref: '#/components/schemas/WorkflowProjectSummary'),
        ])
    )]
    #[OA\Response(response: 403, description: 'Réservé à un administrateur.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: "Le projet n'est pas au statut `pending`.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function validate(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $admin */
        $admin = $this->getUser();

        if ($project->getStatus() !== 'pending') {
            return $this->json(['message' => 'Seul un projet en attente peut être validé.'], 409);
        }

        $log = new ProjectStatusLog();
        $log->setProject($project);
        $log->setFromStatus($project->getStatus());
        $log->setToStatus('validated');
        $log->setActor($admin);

        $project->setStatus('validated');

        $em->persist($log);
        $em->flush();

        return $this->json([
            'message' => 'Projet validé.',
            'project' => $this->serializeProject($project),
        ]);
    }

    #[Route('/api/projects/{id}/reject', name: 'api_projects_reject', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['reason'],
            properties: [new OA\Property(property: 'reason', type: 'string', example: 'Budget insuffisant.')]
        )
    )]
    #[OA\Response(
        response: 200,
        description: "Projet passé au statut `rejected`.",
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'message', type: 'string'),
            new OA\Property(property: 'project', ref: '#/components/schemas/WorkflowProjectSummary'),
        ])
    )]
    #[OA\Response(response: 400, description: 'Le motif de rejet est obligatoire.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Réservé à un administrateur.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: "Le projet n'est pas au statut `pending`.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function reject(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $admin */
        $admin = $this->getUser();

        if ($project->getStatus() !== 'pending') {
            return $this->json(['message' => 'Seul un projet en attente peut être rejeté.'], 409);
        }

        $data = json_decode($request->getContent(), true);
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            return $this->json(['message' => 'Le motif de rejet est obligatoire.'], 400);
        }

        $log = new ProjectStatusLog();
        $log->setProject($project);
        $log->setFromStatus($project->getStatus());
        $log->setToStatus('rejected');
        $log->setActor($admin);
        $log->setReason($reason);

        $project->setStatus('rejected');

        $em->persist($log);
        $em->flush();

        return $this->json([
            'message' => 'Projet rejeté.',
            'project' => $this->serializeProject($project),
        ]);
    }

    #[Route('/api/projects/{id}/assign', name: 'api_projects_assign', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['managerId'],
            properties: [
                new OA\Property(property: 'managerId', type: 'string', description: "Identifiant public (UUID) ou e-mail d'un utilisateur ayant le rôle ROLE_CHEF_DE_PROJET.", example: '7d5572a7-a1d4-4e27-bdde-036061542296'),
            ]
        )
    )]
    #[OA\Response(
        response: 200,
        description: "Chef de projet assigné, projet passé au statut `assigned`.",
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'message', type: 'string'),
            new OA\Property(property: 'project', ref: '#/components/schemas/WorkflowProjectSummary'),
        ])
    )]
    #[OA\Response(response: 400, description: "Chef de projet manquant ou l'utilisateur n'a pas le rôle ROLE_CHEF_DE_PROJET.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Réservé à un administrateur.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou utilisateur introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: "Le projet n'est pas au statut `validated`.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function assign(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $em,
        \App\Service\NotificationService $notifications,
    ): JsonResponse {
        /** @var User $admin */
        $admin = $this->getUser();

        if ($project->getStatus() !== 'validated') {
            return $this->json(['message' => 'Seul un projet validé peut être assigné à un chef de projet.'], 409);
        }

        $data = json_decode($request->getContent(), true);
        $managerId = (string) ($data['managerId'] ?? '');
        if ($managerId === '') {
            return $this->json(['message' => 'Le chef de projet est obligatoire.'], 400);
        }

        $manager = str_contains($managerId, '@')
            ? $userRepository->findOneBy(['email' => $managerId])
            : $userRepository->findOneBy(['publicId' => $managerId]);
        if (!$manager) {
            return $this->json(['message' => 'Utilisateur introuvable.'], 404);
        }
        if (!in_array('ROLE_CHEF_DE_PROJET', $manager->getRoles(), true)) {
            return $this->json(['message' => 'Cet utilisateur n\'est pas un chef de projet.'], 400);
        }

        $log = new ProjectStatusLog();
        $log->setProject($project);
        $log->setFromStatus($project->getStatus());
        $log->setToStatus('assigned');
        $log->setActor($admin);
        $log->setReason(sprintf('Assigné à %s', $manager->getName()));

        $project->setManager($manager);
        $project->setStatus('assigned');

        // Ajoute (ou met à jour) le chef de projet dans l'équipe relationnelle du projet
        $existing = $em->getRepository(ProjectMember::class)->findOneBy([
            'project' => $project,
            'user' => $manager,
        ]);
        if (!$existing) {
            $projectMember = new ProjectMember();
            $projectMember->setProject($project);
            $projectMember->setUser($manager);
            $projectMember->setRole('chef_de_projet');
            $em->persist($projectMember);
        }

        $notifications->push(
            $manager,
            'project_submitted',
            'Projet assigné',
            sprintf('Vous avez été assigné au projet « %s ».', $project->getTitle()),
            $project,
        );

        $em->persist($log);
        $em->flush();

        return $this->json([
            'message' => 'Chef de projet assigné.',
            'project' => $this->serializeProject($project),
        ]);
    }

    #[Route('/api/projects/{id}/workflow-history', name: 'api_projects_workflow_history', methods: ['GET'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\Response(
        response: 200,
        description: 'Historique des changements de statut du projet, du plus ancien au plus récent.',
        content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/ProjectStatusLog'))
    )]
    #[OA\Response(response: 403, description: "Non autorisé à consulter ce projet.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function history(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        ProjectStatusLogRepository $logRepository,
        ProjectAccessService $access
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $logs = $logRepository->findByProject($project);

        return $this->json(array_map(fn (ProjectStatusLog $l) => $this->serializeLog($l), $logs));
    }
}
