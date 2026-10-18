<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

/**
 * E-mails sent around account approval (registration of a "pending" account).
 *
 * Best effort by design: callers invoke it AFTER the account and its in-app
 * notifications have been flushed, and every failure (SMTP down, bad address
 * in ADMIN_NOTIFY_EMAIL...) is logged -- visible in `docker compose logs back`
 * -- never thrown, so a mail problem can't block a registration.
 *
 * Config (env): MAILER_DSN (null://null = nothing is sent), MAILER_FROM, and
 * ADMIN_NOTIFY_EMAIL (comma-separated; empty = every active admin's e-mail).
 */
class AccountNotificationMailer
{
    /**
     * Set on the first transport failure (SMTP unreachable...): the remaining
     * e-mails of the same request are skipped instead of each waiting for its
     * own connection timeout, which made a registration take ~4s per e-mail.
     */
    private bool $transportDown = false;

    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly UserRepository $userRepository,
        private readonly LoggerInterface $logger,
        #[Autowire('%env(MAILER_FROM)%')] private readonly string $from,
        #[Autowire('%env(ADMIN_NOTIFY_EMAIL)%')] private readonly string $adminNotifyEmail,
        #[Autowire('%frontend_url%')] private readonly string $frontendUrl,
        private readonly RequestStack $requestStack,
    ) {
    }

    /**
     * Base URL for links in e-mails: the scheme + host the current request
     * came in on (front and API share one origin behind nginx), so links stay
     * right when the server's IP changes. FRONTEND_URL is only the fallback
     * outside an HTTP request (CLI).
     */
    private function baseUrl(): string
    {
        $request = $this->requestStack->getMainRequest();

        return rtrim($request?->getSchemeAndHttpHost() ?? $this->frontendUrl, '/');
    }

    public function notifyAdminsOfPendingAccount(User $account, string $roleLabel): void
    {
        $text = sprintf(
            "Bonjour,\n\n« %s » (%s) vient de créer un compte %s.\n" .
            "Ce compte est en attente de validation : la personne ne peut pas se connecter tant qu'un administrateur ne l'a pas validé.\n\n" .
            "Valider ou refuser le compte : %s\n",
            $account->getName(),
            $account->getEmail(),
            $roleLabel,
            $this->baseUrl() . '/admin/users',
        );

        // One e-mail per admin (not one with every admin in To:), so admins
        // don't see each other's addresses.
        foreach ($this->adminRecipients() as $to) {
            $this->send($to, sprintf('Compte en attente de validation : %s', $account->getName()), $text);
        }
    }

    public function confirmPendingToUser(User $account, string $roleLabel): void
    {
        $text = sprintf(
            "Bonjour %s,\n\nVotre compte %s a bien été créé.\n" .
            "Il doit maintenant être validé par un administrateur : vous pourrez vous connecter dès qu'il l'aura été.\n\n" .
            "Connexion : %s\n",
            $account->getName(),
            $roleLabel,
            $this->baseUrl() . '/login',
        );

        $this->send((string) $account->getEmail(), 'Votre compte est en attente de validation', $text);
    }

    /** @return string[] */
    private function adminRecipients(): array
    {
        $configured = array_values(array_filter(array_map('trim', explode(',', $this->adminNotifyEmail))));
        if ($configured !== []) {
            return $configured;
        }

        return array_map(fn (User $admin) => (string) $admin->getEmail(), $this->userRepository->findAdmins());
    }

    private function send(string $to, string $subject, string $text): void
    {
        if ($this->transportDown) {
            $this->logger->error('E-mail "{subject}" à {to} non envoyé : serveur SMTP indisponible (échec précédent).', [
                'subject' => $subject,
                'to' => $to,
            ]);

            return;
        }

        try {
            // Built inside the try too: an invalid address throws here, not in send().
            $email = (new Email())
                ->from(new Address($this->from, 'TaskManager'))
                ->to($to)
                ->subject($subject)
                ->text($text);

            $this->mailer->send($email);
        } catch (\Throwable $e) {
            if ($e instanceof TransportExceptionInterface) {
                $this->transportDown = true;
            }

            $this->logger->error('Échec de l\'envoi de l\'e-mail "{subject}" à {to} : {error}', [
                'subject' => $subject,
                'to' => $to,
                'error' => $e->getMessage(),
                'exception' => $e,
            ]);
        }
    }
}
