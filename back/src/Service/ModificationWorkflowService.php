<?php

namespace App\Service;

use App\Entity\ModificationRequest;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Chaîne d'approbation des demandes de modification, telle qu'implémentée
 * auparavant uniquement côté front (lib/contexts/projects-context.tsx) :
 *  - Demandeur = admin  -> le client valide directement (approbation finale).
 *  - Demandeur = client -> l'admin valide directement.
 *  - Demandeur = chef de projet / membre -> l'admin valide d'abord
 *    (-> pending_client), puis le client valide définitivement.
 *
 * Ne reproduit pas l'archivage "ProjectVersion" (snapshot avant application)
 * du prototype front : jugé hors du périmètre sécurité/persistance de cet
 * audit, documenté comme simplification assumée dans le rapport final.
 */
class ModificationWorkflowService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function review(ModificationRequest $mod, User $approver, string $decision, string $note): void
    {
        $requester = $mod->getRequestedBy();
        $isAdminRequester = $requester && in_array('ROLE_ADMIN', $requester->getRoles(), true);
        $isClientRequester = $requester && $this->isClient($requester);
        $isClientApprover = $this->isClient($approver);
        $isAdminApprover = in_array('ROLE_ADMIN', $approver->getRoles(), true);

        $apply = false;
        if ($decision === 'rejected') {
            $nextStatus = 'rejected';
        } elseif ($isAdminRequester || $isClientRequester) {
            $nextStatus = 'approved';
            $apply = true;
        } elseif ($isAdminApprover) {
            $nextStatus = 'pending_client';
        } else {
            $nextStatus = 'approved';
            $apply = true;
        }

        $now = new \DateTimeImmutable();
        $review = ['userId' => $approver->getPublicId(), 'note' => $note, 'at' => $now->format(\DateTimeInterface::ATOM)];

        $mod->setStatus($nextStatus)
            ->setReviewedBy($approver)
            ->setReviewNote($note)
            ->setReviewedAt($now);

        if ($isAdminApprover && $decision === 'approved' && !$isAdminRequester) {
            $mod->setTeamReview($review);
        }
        if ($isClientApprover) {
            $mod->setClientReview($review);
        }

        if ($apply) {
            $this->applyChange($mod);
        }
    }

    /**
     * This app has no formal Role enum server-side (roles are JWT-style
     * strings) -- a "client" is a user with no elevated role at all.
     */
    private function isClient(User $user): bool
    {
        $roles = array_diff($user->getRoles(), ['ROLE_USER']);

        return $roles === [];
    }

    private function applyChange(ModificationRequest $mod): void
    {
        if ($mod->getTarget() === 'subtask' && $mod->getSubtask() !== null) {
            $subtask = $mod->getSubtask();
            match ($mod->getField()) {
                'title' => $subtask->setTitle($mod->getNewValue()),
                'description' => $subtask->setDescription($mod->getNewValue()),
                'dueDate' => $subtask->setDueDate(new \DateTimeImmutable($mod->getNewValue())),
                'priority' => $subtask->setPriority($mod->getNewValue()),
                default => null,
            };

            return;
        }

        $project = $mod->getProject();
        match ($mod->getField()) {
            'title' => $project->setTitle($mod->getNewValue()),
            'description' => $project->setDescription($mod->getNewValue()),
            'endDate' => $project->setEndDate(new \DateTimeImmutable($mod->getNewValue())),
            'priority' => $project->setPriority($mod->getNewValue()),
            'budget' => $project->setBudget((int) $mod->getNewValue()),
            default => null,
        };
    }
}
