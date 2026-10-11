<?php

namespace App\Repository;

use App\Entity\ModificationRequest;
use App\Entity\Project;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ModificationRequest>
 */
class ModificationRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ModificationRequest::class);
    }

    /**
     * @param Project[] $projects
     * @return ModificationRequest[]
     */
    public function findByProjects(array $projects): array
    {
        if ($projects === []) {
            return [];
        }

        return $this->createQueryBuilder('m')
            ->andWhere('m.project IN (:projects)')
            ->setParameter('projects', $projects)
            ->orderBy('m.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
