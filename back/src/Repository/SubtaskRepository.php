<?php

namespace App\Repository;

use App\Entity\Project;
use App\Entity\Subtask;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Subtask>
 */
class SubtaskRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Subtask::class);
    }

    /**
     * @return Subtask[]
     */
    public function findByProject(Project $project): array
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.project = :project')
            ->setParameter('project', $project)
            ->orderBy('s.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @param Project[] $projects
     * @return Subtask[]
     */
    public function findByProjects(array $projects): array
    {
        if ($projects === []) {
            return [];
        }

        return $this->createQueryBuilder('s')
            ->andWhere('s.project IN (:projects)')
            ->setParameter('projects', $projects)
            ->orderBy('s.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
