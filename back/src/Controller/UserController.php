<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Édition de profil (soi-même), édition d'un utilisateur par un admin, et
 * validation/refus des comptes en attente -- toutes ces actions ne
 * touchaient auparavant que le state React local (users-context.tsx).
 */
#[OA\Tag(name: 'Users')]
class UserController extends AbstractController
{
    private const ALLOWED_ROLES = ['admin', 'chef_de_projet', 'membre', 'client'];
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
            'accountStatus' => $user->getAccountStatus(),
            'createdAt' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function applyProfileFields(User $user, array $data): void
    {
        if (isset($data['name'])) {
            $user->setName((string) $data['name']);
        }
        if (isset($data['phone'])) {
            $user->setPhone((string) $data['phone']);
        }
        if (isset($data['company'])) {
            $user->setCompany((string) $data['company']);
        }
        if (isset($data['address'])) {
            $user->setAddress((string) $data['address']);
        }
        if (isset($data['bio'])) {
            $user->setBio((string) $data['bio']);
        }
        if (isset($data['avatarUrl'])) {
            $user->setAvatarUrl((string) $data['avatarUrl']);
        }
        if (isset($data['memberSpecialty']) && in_array($data['memberSpecialty'], self::ALLOWED_SPECIALTIES, true)) {
            $user->setMemberSpecialty((string) $data['memberSpecialty']);
        }
    }

    #[Route('/api/users', name: 'api_users_list', methods: ['GET'])]
    #[OA\Response(response: 200, description: "Liste de tous les utilisateurs (identité de base), pour les avatars/sélecteurs de membre dans toute l'app.")]
    public function list(\App\Repository\UserRepository $userRepository): JsonResponse
    {
        return $this->json(array_map(fn (User $u) => $this->serialize($u), $userRepository->findAll()));
    }

    #[Route('/api/users/me', name: 'api_users_me', methods: ['GET'])]
    #[OA\Response(response: 200, description: 'Profil complet de son propre compte.')]
    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->serialize($user));
    }

    #[Route('/api/users/me', name: 'api_users_update_me', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Profil mis à jour.')]
    public function updateMe(Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        $this->applyProfileFields($user, $data);
        $em->flush();

        return $this->json($this->serialize($user));
    }

    #[Route('/api/users/{id}', name: 'api_users_update', methods: ['PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    #[OA\Response(response: 200, description: 'Utilisateur mis à jour (admin).')]
    #[OA\Response(response: 400, description: 'Rôle ou spécialité invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Utilisateur introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function update(
        #[MapEntity(mapping: ['id' => 'publicId'])] User $target,
        Request $request,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        if (isset($data['role'])) {
            if (!in_array($data['role'], self::ALLOWED_ROLES, true)) {
                return $this->json(['message' => 'Rôle invalide.'], 400);
            }
            $target->setRoles(match ($data['role']) {
                'admin' => ['ROLE_ADMIN'],
                'chef_de_projet' => ['ROLE_CHEF_DE_PROJET'],
                default => [],
            });
        }
        if (isset($data['email'])) {
            $target->setEmail((string) $data['email']);
        }
        if (!empty($data['password'])) {
            $target->setPassword($hasher->hashPassword($target, (string) $data['password']));
        }
        $this->applyProfileFields($target, $data);

        $em->flush();

        return $this->json($this->serialize($target));
    }

    #[Route('/api/users/{id}/review', name: 'api_users_review', methods: ['PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['decision'], properties: [new OA\Property(property: 'decision', type: 'string', enum: ['approved', 'rejected'])]))]
    #[OA\Response(response: 200, description: 'Compte validé ou refusé.')]
    #[OA\Response(response: 400, description: 'Décision invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Utilisateur introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function review(
        #[MapEntity(mapping: ['id' => 'publicId'])] User $target,
        Request $request,
        EntityManagerInterface $em,
        NotificationService $notifications,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $decision = (string) ($data['decision'] ?? '');
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            return $this->json(['message' => 'Décision invalide.'], 400);
        }

        $target->setAccountStatus($decision === 'approved' ? 'active' : 'rejected');

        $notifications->push(
            $target,
            $decision === 'approved' ? 'account_validated' : 'account_rejected',
            $decision === 'approved' ? 'Compte activé' : 'Compte refusé',
            $decision === 'approved'
                ? 'Votre compte a été validé par un administrateur. Vous pouvez maintenant vous connecter.'
                : 'Votre demande de compte a été refusée par un administrateur.',
        );

        $em->flush();

        return $this->json($this->serialize($target));
    }
}
