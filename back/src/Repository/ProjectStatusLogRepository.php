<?php

namespace App\Repository;

use App\Entity\Project;
use App\Entity\ProjectStatusLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ProjectStatusLog>
 */
class ProjectStatusLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ProjectStatusLog::class);
    }

    /**
     * @return ProjectStatusLog[]
     */
    public function findByProject(Project $project): array
    {
        return $this->createQueryBuilder('l')
            ->andWhere('l.project = :project')
            ->setParameter('project', $project)
            ->orderBy('l.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
