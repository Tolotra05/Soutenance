<?php

namespace App\Controller;

use App\Entity\Notification;
use App\Entity\User;
use App\Repository\NotificationRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Notifications : auparavant 100% locales (lib/contexts/notifications-context.tsx,
 * state React perdu au refresh, jamais partagé entre appareils/utilisateurs).
 * Désormais persistées ; les autres contrôleurs les créent en effet de bord
 * de leurs actions (ex : validation de projet, assignation...).
 */
#[OA\Tag(name: 'Notifications')]
class NotificationController extends AbstractController
{
    private function serialize(Notification $n): array
    {
        return [
            'id' => $n->getPublicId(),
            'userId' => $n->getRecipient()?->getPublicId(),
            'type' => $n->getType(),
            'title' => $n->getTitle(),
            'message' => $n->getMessage(),
            'projectId' => $n->getProject()?->getPublicId(),
            'read' => $n->isRead(),
            'createdAt' => $n->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    #[Route('/api/notifications', name: 'api_notifications_list', methods: ['GET'])]
    #[OA\Response(response: 200, description: 'Notifications du compte connecté, les plus récentes en premier.')]
    public function list(NotificationRepository $repository): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json(array_map(fn (Notification $n) => $this->serialize($n), $repository->findByRecipient($user)));
    }

    #[Route('/api/notifications/{id}/read', name: 'api_notifications_read', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Notification marquée comme lue.')]
    #[OA\Response(response: 403, description: "N'appartient pas à l'utilisateur connecté.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Notification introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function markRead(
        #[MapEntity(mapping: ['id' => 'publicId'])] Notification $notification,
        EntityManagerInterface $em,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if ($notification->getRecipient()?->getId() !== $user->getId()) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $notification->setIsRead(true);
        $em->flush();

        return $this->json($this->serialize($notification));
    }

    #[Route('/api/notifications/read-all', name: 'api_notifications_read_all', methods: ['POST'])]
    #[OA\Response(response: 200, description: 'Toutes les notifications du compte connecté sont marquées comme lues.')]
    public function markAllRead(NotificationRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        foreach ($repository->findByRecipient($user) as $notification) {
            $notification->setIsRead(true);
        }
        $em->flush();

        return $this->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }
}
