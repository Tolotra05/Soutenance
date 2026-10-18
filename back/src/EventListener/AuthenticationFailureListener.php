<?php

namespace App\EventListener;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationFailureEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;

/**
 * /api/login_check failure for a non-active account (see
 * AccountStatusUserChecker): answer 403 with the account status instead of
 * Lexik's generic 401 "Invalid credentials", so the login page can tell
 * "wrong password" apart from "account awaiting validation / rejected".
 *
 * Only reached after the password was verified, so the status is never
 * revealed to someone who doesn't know the account's password.
 */
#[AsEventListener(event: Events::AUTHENTICATION_FAILURE)]
class AuthenticationFailureListener
{
    public function __invoke(AuthenticationFailureEvent $event): void
    {
        $exception = $event->getException();
        if (!$exception instanceof CustomUserMessageAccountStatusException) {
            return;
        }

        $status = $exception->getMessageData()['accountStatus'] ?? null;
        if ($status === null) {
            return;
        }

        $event->setResponse(new JsonResponse([
            'code' => 403,
            'message' => $exception->getMessageKey(),
            'accountStatus' => $status,
        ], 403));
    }
}
