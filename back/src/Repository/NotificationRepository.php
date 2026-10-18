<?php

namespace App\Repository;

use App\Entity\Notification;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Notification>
 */
class NotificationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Notification::class);
    }

    /**
     * @return Notification[]
     */
    public function findByRecipient(User $user, int $limit = 100): array
    {
        return $this->createQueryBuilder('n')
            ->andWhere('n.recipient = :user')
            ->setParameter('user', $user)
            ->orderBy('n.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Marks as read every notification of $type about $relatedUser, whoever
     * its recipient is. Bulk DQL UPDATE: runs immediately, no flush() needed.
     *
     * @return int number of notifications updated
     */
    public function markReadByRelatedUser(User $relatedUser, string $type): int
    {
        return $this->createQueryBuilder('n')
            ->update()
            ->set('n.isRead', ':read')
            ->andWhere('n.relatedUser = :user')
            ->andWhere('n.type = :type')
            ->andWhere('n.isRead = :unread')
            ->setParameter('read', true)
            ->setParameter('unread', false)
            ->setParameter('user', $relatedUser)
            ->setParameter('type', $type)
            ->getQuery()
            ->execute();
    }
}
