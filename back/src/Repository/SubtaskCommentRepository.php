<?php

namespace App\Repository;

use App\Entity\Subtask;
use App\Entity\SubtaskComment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SubtaskComment>
 */
class SubtaskCommentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SubtaskComment::class);
    }

    /**
     * @param Subtask[] $subtasks
     * @return SubtaskComment[]
     */
    public function findBySubtasks(array $subtasks): array
    {
        if ($subtasks === []) {
            return [];
        }

        return $this->createQueryBuilder('c')
            ->andWhere('c.subtask IN (:subtasks)')
            ->setParameter('subtasks', $subtasks)
            ->orderBy('c.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
