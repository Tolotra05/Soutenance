<?php

namespace App\Controller;

use App\Entity\Project;
use App\Entity\ProjectMember;
use App\Entity\User;
use App\Repository\ProjectMemberRepository;
use App\Repository\UserRepository;
use App\Service\ProjectAccessService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Équipe projet basée sur une vraie table (ProjectMember), en plus du champ
 * JSON `members` déjà présent sur Project (laissé tel quel).
 * Routes sous /team-members pour ne pas entrer en conflit avec les routes
 * existantes /api/projects/{id}/members.
 */
#[OA\Tag(name: 'Project team')]
class ProjectTeamController extends AbstractController
{
    private function serialize(ProjectMember $pm): array
    {
        return [
            'id' => $pm->getPublicId(),
            'role' => $pm->getRole(),
            'joinedAt' => $pm->getJoinedAt()?->format(\DateTimeInterface::ATOM),
            'user' => $pm->getUser() ? [
                'id' => $pm->getUser()->getPublicId(),
                'name' => $pm->getUser()->getName(),
                'email' => $pm->getUser()->getEmail(),
            ] : null,
        ];
    }

    #[Route('/api/projects/{id}/team-members', name: 'api_projects_team_list', methods: ['GET'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\Response(
        response: 200,
        description: "Liste de l'équipe du projet (table ProjectMember).",
        content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/TeamMemberEntry'))
    )]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function list(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        ProjectMemberRepository $projectMemberRepository,
        ProjectAccessService $access
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $members = $projectMemberRepository->findByProject($project);

        return $this->json(array_map(fn (ProjectMember $m) => $this->serialize($m), $members));
    }

    #[Route('/api/projects/{id}/team-members', name: 'api_projects_team_add', methods: ['POST'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['userId'],
            properties: [
                new OA\Property(property: 'userId', type: 'string', format: 'uuid', description: "Identifiant public (UUID) de l'utilisateur.", example: 'f62b9ea6-8fb7-4c18-8db2-3b8f5634c614'),
                new OA\Property(property: 'role', type: 'string', enum: ['membre', 'chef_de_projet', 'client'], example: 'membre'),
            ]
        )
    )]
    #[OA\Response(
        response: 201,
        description: 'Membre ajouté à la table ProjectMember.',
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'message', type: 'string'),
            new OA\Property(property: 'member', ref: '#/components/schemas/TeamMemberEntry'),
        ])
    )]
    #[OA\Response(response: 400, description: "Données invalides, utilisateur ou rôle manquant/invalide.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: "Non autorisé (réservé à l'admin ou au chef de projet).", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou utilisateur introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: 'Utilisateur déjà membre du projet.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function add(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        UserRepository $userRepository,
        ProjectAccessService $access,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $currentUser */
        $currentUser = $this->getUser();

        $isAdmin = $access->isAdmin($currentUser);
        $isManager = $access->isManager($project, $currentUser);
        if (!$isAdmin && !$isManager) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        $userId = (string) ($data['userId'] ?? '');
        $role = (string) ($data['role'] ?? 'membre');
        $allowedRoles = ['membre', 'chef_de_projet', 'client'];

        if ($userId === '') {
            return $this->json(['message' => 'L\'utilisateur est obligatoire.'], 400);
        }
        if (!in_array($role, $allowedRoles, true)) {
            return $this->json(['message' => 'Rôle invalide.'], 400);
        }

        $member = $userRepository->findOneBy(['publicId' => $userId]);
        if (!$member) {
            return $this->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        $existing = $em->getRepository(ProjectMember::class)->findOneBy([
            'project' => $project,
            'user' => $member,
        ]);
        if ($existing) {
            return $this->json(['message' => 'Cet utilisateur est déjà membre du projet.'], 409);
        }

        $projectMember = new ProjectMember();
        $projectMember->setProject($project);
        $projectMember->setUser($member);
        $projectMember->setRole($role);

        $em->persist($projectMember);
        $em->flush();

        return $this->json([
            'message' => 'Membre ajouté à l\'équipe.',
            'member' => $this->serialize($projectMember),
        ], 201);
    }

    #[Route('/api/projects/{id}/team-members/{memberId}', name: 'api_projects_team_remove', methods: ['DELETE'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\Parameter(name: 'memberId', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: "Identifiant public (UUID) de la ligne ProjectMember à retirer.")]
    #[OA\Response(
        response: 200,
        description: "Membre retiré de l'équipe.",
        content: new OA\JsonContent(properties: [new OA\Property(property: 'message', type: 'string')])
    )]
    #[OA\Response(response: 403, description: "Non autorisé (réservé à l'admin ou au chef de projet).", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou membre introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function remove(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        #[MapEntity(mapping: ['memberId' => 'publicId'])] ProjectMember $projectMember,
        ProjectAccessService $access,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $currentUser */
        $currentUser = $this->getUser();

        $isAdmin = $access->isAdmin($currentUser);
        $isManager = $access->isManager($project, $currentUser);
        if (!$isAdmin && !$isManager) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        if ($projectMember->getProject()?->getId() !== $project->getId()) {
            return $this->json(['message' => 'Membre introuvable.'], 404);
        }

        $em->remove($projectMember);
        $em->flush();

        return $this->json(['message' => 'Membre retiré de l\'équipe.']);
    }
}
