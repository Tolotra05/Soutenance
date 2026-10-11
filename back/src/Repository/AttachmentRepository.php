<?php

namespace App\Repository;

use App\Entity\Attachment;
use App\Entity\Project;
use App\Entity\Subtask;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Attachment>
 */
class AttachmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Attachment::class);
    }

    /**
     * @param Project[] $projects
     * @return Attachment[]
     */
    public function findByProjects(array $projects): array
    {
        if ($projects === []) {
            return [];
        }

        return $this->createQueryBuilder('a')
            ->andWhere('a.project IN (:projects)')
            ->setParameter('projects', $projects)
            ->orderBy('a.uploadedAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @param Subtask[] $subtasks
     * @return Attachment[]
     */
    public function findBySubtasks(array $subtasks): array
    {
        if ($subtasks === []) {
            return [];
        }

        return $this->createQueryBuilder('a')
            ->andWhere('a.subtask IN (:subtasks)')
            ->setParameter('subtasks', $subtasks)
            ->orderBy('a.uploadedAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
