<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AccountNotificationMailer;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Inscription (client ou candidature employé) + mot de passe oublié.
 * Routes publiques, déjà prévues dans security.yaml (access_control) mais
 * jamais implémentées jusqu'ici -- le front gérait tout ça en state local
 * (lib/contexts/users-context.tsx).
 */
#[OA\Tag(name: 'Auth')]
class AuthController extends AbstractController
{
    private const ALLOWED_ROLES = ['client', 'chef_de_projet', 'membre'];
    private const ALLOWED_SPECIALTIES = ['Designer', 'DevOps', 'Frontend', 'Backend', 'Fullstack', 'QA', 'Chef de projet junior', 'Autre'];

    private function serialize(User $user): array
    {
        return [
            'id' => $user->getPublicId(),
            'name' => $user->getName(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'accountStatus' => $user->getAccountStatus(),
            'createdAt' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'email', 'password', 'role'],
            properties: [
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'email', type: 'string', format: 'email'),
                new OA\Property(property: 'password', type: 'string', format: 'password'),
                new OA\Property(property: 'role', type: 'string', enum: ['client', 'chef_de_projet', 'membre']),
                new OA\Property(property: 'phone', type: 'string'),
                new OA\Property(property: 'company', type: 'string'),
                new OA\Property(property: 'memberSpecialty', type: 'string'),
                new OA\Property(property: 'bio', type: 'string'),
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Compte créé. `accountStatus` vaut `pending` pour un rôle autre que client (validation admin requise).")]
    #[OA\Response(response: 400, description: 'Champs manquants ou invalides.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: 'Un compte existe déjà avec cet e-mail.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function register(
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
        NotificationService $notifications,
        AccountNotificationMailer $accountMailer,
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
            return $this->json(['message' => "Le nom, l'e-mail et le mot de passe sont obligatoires."], 400);
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

        $needsApproval = $role !== 'client';
        $roles = match ($role) {
            'chef_de_projet' => ['ROLE_CHEF_DE_PROJET'],
            default => [],
        };

        $user = new User();
        $user->setEmail($email);
        $user->setName($name);
        $user->setRoles($roles);
        $user->setMemberSpecialty($memberSpecialty);
        $user->setAvatarUrl('https://api.dicebear.com/7.x/avataaars/svg?seed=' . rawurlencode($name));
        $user->setPhone(isset($data['phone']) ? (string) $data['phone'] : null);
        $user->setCompany(isset($data['company']) ? (string) $data['company'] : null);
        $user->setBio(isset($data['bio']) ? (string) $data['bio'] : null);
        $user->setAccountStatus($needsApproval ? 'pending' : 'active');
        $user->setPassword($hasher->hashPassword($user, $password));

        $em->persist($user);

        $roleLabel = $role === 'chef_de_projet' ? 'chef de projet' : 'membre';
        if ($needsApproval) {
            // BEFORE flush(): push() only persist()s. Called after the flush
            // (as it used to be), the notifications were never written and
            // admins were never told a pending account was waiting.
            $notifications->pushToAdmins(
                'account_created',
                'Nouveau compte employé',
                sprintf('« %s » a créé un compte %s. À valider.', $name, $roleLabel),
                relatedUser: $user,
            );
        }

        $em->flush();

        if ($needsApproval) {
            // After the flush, best effort: a mail failure is logged, never
            // thrown, so it can't undo or block the registration.
            $accountMailer->notifyAdminsOfPendingAccount($user, $roleLabel);
            $accountMailer->confirmPendingToUser($user, $roleLabel);
        }

        return $this->json($this->serialize($user), 201);
    }

    #[Route('/api/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['email'], properties: [new OA\Property(property: 'email', type: 'string', format: 'email')]))]
    #[OA\Response(
        response: 200,
        description: "Toujours 200 que l'e-mail existe ou non, pour ne pas révéler les comptes existants. " .
            "MAILER_DSN=null en dev : l'e-mail n'est pas envoyé, le code est retourné directement dans la réponse " .
            "(uniquement quand APP_ENV=dev) pour rester testable de bout en bout."
    )]
    public function forgotPassword(Request $request, UserRepository $userRepository, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = trim((string) ($data['email'] ?? ''));
        $user = $email !== '' ? $userRepository->findOneBy(['email' => $email]) : null;

        $response = ['message' => 'Si un compte existe avec cet e-mail, un code de confirmation a été envoyé.'];

        if ($user) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->setResetCode($code, (new \DateTimeImmutable())->modify('+15 minutes'));
            $em->flush();

            // Pas de mailer configuré (MAILER_DSN=null, voir .env) : le code est
            // renvoyé directement en dev pour que le flow reste testable --
            // ne JAMAIS faire ça en prod une fois un vrai mailer branché.
            if ($this->getParameter('kernel.environment') === 'dev') {
                $response['devCode'] = $code;
            }
        }

        return $this->json($response);
    }

    #[Route('/api/reset-password', name: 'api_reset_password', methods: ['POST'])]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['email', 'code', 'newPassword'],
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email'),
                new OA\Property(property: 'code', type: 'string', example: '123456'),
                new OA\Property(property: 'newPassword', type: 'string', format: 'password'),
            ]
        )
    )]
    #[OA\Response(response: 200, description: 'Mot de passe changé.')]
    #[OA\Response(response: 400, description: 'Code invalide, expiré, ou mot de passe trop court.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function resetPassword(
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = trim((string) ($data['email'] ?? ''));
        $code = trim((string) ($data['code'] ?? ''));
        $newPassword = (string) ($data['newPassword'] ?? '');

        if (strlen($newPassword) < 6) {
            return $this->json(['message' => 'Le mot de passe doit contenir au moins 6 caractères.'], 400);
        }

        $user = $userRepository->findOneBy(['email' => $email]);
        if (!$user || $user->getResetCode() === null || $user->getResetCode() !== $code) {
            return $this->json(['message' => 'Code invalide.'], 400);
        }
        if ($user->getResetCodeExpiresAt() === null || $user->getResetCodeExpiresAt() < new \DateTimeImmutable()) {
            return $this->json(['message' => 'Ce code a expiré, recommencez la procédure.'], 400);
        }

        $user->setPassword($hasher->hashPassword($user, $newPassword));
        $user->setResetCode(null, null);
        $em->flush();

        return $this->json(['message' => 'Mot de passe mis à jour.']);
    }
}
