<?php

namespace App\Service;

use App\Entity\Notification;
use App\Entity\Project;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Central place that creates Notification rows as a side effect of other
 * actions (project validated, member assigned, modification reviewed...),
 * mirroring the front's previous pushNotification()/pushNotifications()
 * (lib/contexts/notifications-context.tsx) -- except persisted, instead of
 * living only in React state until the next refresh.
 */
class NotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserRepository $userRepository,
    ) {
    }

    /**
     * Only persist()s: the caller MUST flush() afterwards (typically its own
     * flush at the end of the action), otherwise the notification is silently
     * dropped at the end of the request.
     */
    public function push(User $recipient, string $type, string $title, string $message, ?Project $project = null, ?User $relatedUser = null): void
    {
        $notification = new Notification();
        $notification->setRecipient($recipient);
        $notification->setType($type);
        $notification->setTitle($title);
        $notification->setMessage($message);
        $notification->setProject($project);
        $notification->setRelatedUser($relatedUser);

        $this->em->persist($notification);
    }

    /** Same flush() requirement as push(). Recipients: every active admin. */
    public function pushToAdmins(string $type, string $title, string $message, ?Project $project = null, ?User $relatedUser = null): void
    {
        foreach ($this->userRepository->findAdmins() as $admin) {
            $this->push($admin, $type, $title, $message, $project, $relatedUser);
        }
    }
}
