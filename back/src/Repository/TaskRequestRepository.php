<?php

namespace App\Repository;

use App\Entity\Project;
use App\Entity\TaskRequest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TaskRequest>
 */
class TaskRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TaskRequest::class);
    }

    /**
     * @param Project[] $projects
     * @return TaskRequest[]
     */
    public function findByProjects(array $projects): array
    {
        if ($projects === []) {
            return [];
        }

        return $this->createQueryBuilder('t')
            ->andWhere('t.project IN (:projects)')
            ->setParameter('projects', $projects)
            ->orderBy('t.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
