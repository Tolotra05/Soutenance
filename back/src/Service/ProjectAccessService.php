<?php

namespace App\Service;

use App\Entity\Project;
use App\Entity\User;
use App\Repository\ProjectMemberRepository;

/**
 * Centralise les règles de droits déjà utilisées dans ProjectController
 * (admin, client du projet, manager du projet, ou membre du projet)
 * afin de les réutiliser dans les nouveaux contrôleurs (workflow, équipe, agenda)
 * sans dupliquer/modifier le code existant.
 */
class ProjectAccessService
{
    public function __construct(
        private readonly ProjectMemberRepository $projectMemberRepository,
    ) {
    }

    public function isAdmin(User $user): bool
    {
        return in_array('ROLE_ADMIN', $user->getRoles(), true);
    }

    public function isClient(Project $project, User $user): bool
    {
        return $project->getClient()?->getId() === $user->getId();
    }

    public function isManager(Project $project, User $user): bool
    {
        return $project->getManager()?->getId() === $user->getId();
    }

    /**
     * Vérifie l'appartenance au projet en tenant compte à la fois de
     * l'ancien stockage JSON (Project::members) et de la nouvelle table
     * relationnelle ProjectMember.
     */
    public function isMember(Project $project, User $user): bool
    {
        $legacyMembers = $project->getMembers() ?? [];
        foreach ($legacyMembers as $m) {
            if (($m['userId'] ?? '') === $user->getPublicId()) {
                return true;
            }
        }

        foreach ($this->projectMemberRepository->findByProject($project) as $pm) {
            if ($pm->getUser()?->getId() === $user->getId()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Droit "lecture / participation" : admin, client, manager ou membre.
     */
    public function canAccess(Project $project, User $user): bool
    {
        return $this->isAdmin($user)
            || $this->isClient($project, $user)
            || $this->isManager($project, $user)
            || $this->isMember($project, $user);
    }
}
