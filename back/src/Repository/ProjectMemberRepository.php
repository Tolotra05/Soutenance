<?php

namespace App\Repository;

use App\Entity\Project;
use App\Entity\ProjectMember;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ProjectMember>
 */
class ProjectMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ProjectMember::class);
    }

    /**
     * @return ProjectMember[]
     */
    public function findByProject(Project $project): array
    {
        return $this->createQueryBuilder('pm')
            ->andWhere('pm.project = :project')
            ->setParameter('project', $project)
            ->orderBy('pm.joinedAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
