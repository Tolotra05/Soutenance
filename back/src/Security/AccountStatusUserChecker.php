<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Only "active" accounts may authenticate. Without this, a freshly registered
 * membre/chef de projet (accountStatus "pending") got a JWT straight from
 * /api/login_check and could use the whole app before any admin had
 * validated it -- making the approval workflow purely cosmetic.
 *
 * Wired on the login, refresh and api firewalls (security.yaml), so it also:
 *  - blocks /api/token/refresh for a pending/rejected account;
 *  - cuts off an already-issued JWT as soon as its account is rejected.
 *
 * messageData.accountStatus is read by AuthenticationFailureListener to
 * answer 403 + a machine-readable status the front can show to the user.
 */
class AccountStatusUserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
    }

    /**
     * Post-auth on purpose: pre-auth runs BEFORE the password is checked, so
     * a 403 "pending" there would reveal an account's existence and status to
     * anyone who merely knows its e-mail.
     */
    public function checkPostAuth(UserInterface $user /* , ?TokenInterface $token = null */): void
    {
        if (!$user instanceof User) {
            return;
        }

        $message = match ($user->getAccountStatus()) {
            'pending' => 'Votre compte est en attente de validation par un administrateur.',
            'rejected' => 'Votre demande de compte a été refusée par un administrateur.',
            default => null,
        };

        if ($message !== null) {
            throw new CustomUserMessageAccountStatusException($message, ['accountStatus' => $user->getAccountStatus()]);
        }
    }
}
