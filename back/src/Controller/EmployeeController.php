<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Création de comptes employés (chef de projet / membre) par un administrateur,
 * depuis la page "Équipe" du front. Persiste réellement en base (contrairement
 * à l'ancien comportement du front, qui ne mettait à jour que le state React).
 */
#[OA\Tag(name: 'Employees')]
class EmployeeController extends AbstractController
{
    private const ALLOWED_ROLES = ['admin', 'chef_de_projet', 'membre'];
    private const ALLOWED_SPECIALTIES = ['Designer', 'DevOps', 'Frontend', 'Backend', 'Fullstack', 'QA', 'Chef de projet junior', 'Autre'];

    private function serialize(User $user): array
    {
        return [
            'id' => $user->getPublicId(),
            'name' => $user->getName(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'memberSpecialty' => $user->getMemberSpecialty(),
            'avatarUrl' => $user->getAvatarUrl(),
            'phone' => $user->getPhone(),
            'company' => $user->getCompany(),
            'address' => $user->getAddress(),
            'bio' => $user->getBio(),
            'createdAt' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    #[Route('/api/employees', name: 'api_employees_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'email', 'password', 'role'],
            properties: [
                new OA\Property(property: 'name', type: 'string', example: 'Jane Doe'),
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'jane.doe@example.com'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Secret123!'),
                new OA\Property(property: 'role', type: 'string', enum: ['admin', 'chef_de_projet', 'membre'], example: 'membre'),
                new OA\Property(property: 'memberSpecialty', type: 'string', enum: ['Designer', 'DevOps', 'Frontend', 'Backend', 'Fullstack', 'QA', 'Chef de projet junior', 'Autre'], description: "Requis lorsque `role` vaut `membre`."),
                new OA\Property(property: 'phone', type: 'string', example: '+33 6 12 34 56 78'),
                new OA\Property(property: 'company', type: 'string'),
                new OA\Property(property: 'address', type: 'string'),
                new OA\Property(property: 'bio', type: 'string'),
                new OA\Property(property: 'avatarUrl', type: 'string', description: "Défaut : avatar généré à partir du nom si absent."),
            ]
        )
    )]
    #[OA\Response(
        response: 201,
        description: 'Employé créé.',
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'id', type: 'string', format: 'uuid'),
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'email', type: 'string'),
            new OA\Property(property: 'roles', type: 'array', items: new OA\Items(type: 'string')),
            new OA\Property(property: 'memberSpecialty', type: 'string', nullable: true),
            new OA\Property(property: 'avatarUrl', type: 'string'),
            new OA\Property(property: 'phone', type: 'string', nullable: true),
            new OA\Property(property: 'company', type: 'string', nullable: true),
            new OA\Property(property: 'address', type: 'string', nullable: true),
            new OA\Property(property: 'bio', type: 'string', nullable: true),
            new OA\Property(property: 'createdAt', type: 'string', format: 'date-time'),
        ])
    )]
    #[OA\Response(response: 400, description: 'Champs manquants ou invalides (rôle, spécialité...).', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Réservé à un administrateur.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: 'Un compte existe déjà avec cet e-mail.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function create(
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $em
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        $name = trim((string) ($data['name'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $role = (string) ($data['role'] ?? '');
        $memberSpecialty = $data['memberSpecialty'] ?? null;

        if ($name === '' || $email === '' || $password === '') {
            return $this->json(['message' => 'Le nom, l\'e-mail et le mot de passe sont obligatoires.'], 400);
        }
        if (!in_array($role, self::ALLOWED_ROLES, true)) {
            return $this->json(['message' => 'Rôle invalide.'], 400);
        }
        if ($role === 'membre') {
            if (!is_string($memberSpecialty) || !in_array($memberSpecialty, self::ALLOWED_SPECIALTIES, true)) {
                return $this->json(['message' => 'Spécialité invalide.'], 400);
            }
        } else {
            $memberSpecialty = null;
        }

        if ($userRepository->findOneBy(['email' => $email])) {
            return $this->json(['message' => 'Un compte existe déjà avec cet e-mail.'], 409);
        }

        $roles = match ($role) {
            'admin' => ['ROLE_ADMIN'],
            'chef_de_projet' => ['ROLE_CHEF_DE_PROJET'],
            default => [],
        };

        $user = new User();
        $user->setEmail($email);
        $user->setName($name);
        $user->setRoles($roles);
        $user->setMemberSpecialty($memberSpecialty);
        $user->setAvatarUrl((string) ($data['avatarUrl'] ?? '') !== ''
            ? (string) $data['avatarUrl']
            : 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . rawurlencode($name));
        $user->setPhone(isset($data['phone']) ? (string) $data['phone'] : null);
        $user->setCompany(isset($data['company']) ? (string) $data['company'] : null);
        $user->setAddress(isset($data['address']) ? (string) $data['address'] : null);
        $user->setBio(isset($data['bio']) ? (string) $data['bio'] : null);
        $user->setPassword($passwordHasher->hashPassword($user, $password));

        $em->persist($user);
        $em->flush();

        return $this->json($this->serialize($user), 201);
    }
}
