<?php

namespace App\Repository;

use App\Entity\Project;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Project>
 */
class ProjectRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Project::class);
    }

    /**
     * Same as findAll(), but eager-loads client/manager in a single query
     * (LEFT JOIN + addSelect) instead of one extra SELECT per distinct user
     * via lazy loading. Use this for any listing that serializes client/manager.
     *
     * @return Project[]
     */
    public function findAllWithRelations(): array
    {
        return $this->createQueryBuilder('p')
            ->addSelect('client', 'manager')
            ->leftJoin('p.client', 'client')
            ->leftJoin('p.manager', 'manager')
            ->getQuery()
            ->getResult();
    }

    /**
     * Paginated, eager-loaded listing, most recent first.
     *
     * @return Project[]
     */
    public function findPageWithRelations(int $limit, int $offset): array
    {
        return $this->createQueryBuilder('p')
            ->addSelect('client', 'manager')
            ->leftJoin('p.client', 'client')
            ->leftJoin('p.manager', 'manager')
            ->orderBy('p.id', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    public function countAll(): int
    {
        return (int) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->getQuery()
            ->getSingleScalarResult();
    }

//    /**
//     * @return Project[] Returns an array of Project objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('p')
//            ->andWhere('p.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('p.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?Project
//    {
//        return $this->createQueryBuilder('p')
//            ->andWhere('p.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
