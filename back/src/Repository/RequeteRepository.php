<?php

namespace App\Repository;

use App\Entity\Project;
use App\Entity\Requete;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Requete>
 */
class RequeteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Requete::class);
    }

    /**
     * @param Project[] $projects
     * @return Requete[]
     */
    public function findByProjects(array $projects): array
    {
        if ($projects === []) {
            return [];
        }

        return $this->createQueryBuilder('r')
            ->andWhere('r.project IN (:projects)')
            ->setParameter('projects', $projects)
            ->orderBy('r.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
