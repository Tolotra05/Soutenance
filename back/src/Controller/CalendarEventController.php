<?php

namespace App\Controller;

use App\Entity\CalendarEvent;
use App\Entity\Project;
use App\Entity\User;
use App\Repository\CalendarEventRepository;
use App\Service\ProjectAccessService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Agenda projet : rendez-vous client et autres jalons (cadrage, design,
 * développement, recette, livraison, deadline...), type = 'rendez_vous' pour
 * un rendez-vous client.
 */
#[OA\Tag(name: 'Calendar events')]
class CalendarEventController extends AbstractController
{
    private const ALLOWED_TYPES = [
        'cadrage', 'design', 'developpement', 'recette', 'livraison', 'rendez_vous', 'deadline',
    ];

    private function serialize(CalendarEvent $event): array
    {
        return [
            'id' => $event->getPublicId(),
            'projectId' => $event->getProject()?->getPublicId(),
            'title' => $event->getTitle(),
            'date' => $event->getDate()?->format(\DateTimeInterface::ATOM),
            'type' => $event->getType(),
            'description' => $event->getDescription(),
            'createdBy' => $event->getCreatedBy() ? [
                'id' => $event->getCreatedBy()->getPublicId(),
                'name' => $event->getCreatedBy()->getName(),
            ] : null,
            'createdAt' => $event->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    #[Route('/api/projects/{id}/events', name: 'api_projects_events_list', methods: ['GET'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\Response(
        response: 200,
        description: "Liste des événements/rendez-vous de l'agenda du projet.",
        content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/CalendarEvent'))
    )]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function list(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        CalendarEventRepository $eventRepository,
        ProjectAccessService $access
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $events = $eventRepository->findByProject($project);

        return $this->json(array_map(fn (CalendarEvent $e) => $this->serialize($e), $events));
    }

    #[Route('/api/projects/{id}/events', name: 'api_projects_events_create', methods: ['POST'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['title'],
            properties: [
                new OA\Property(property: 'title', type: 'string', example: 'Réunion de cadrage'),
                new OA\Property(property: 'type', type: 'string', enum: ['cadrage', 'design', 'developpement', 'recette', 'livraison', 'rendez_vous', 'deadline'], example: 'rendez_vous'),
                new OA\Property(property: 'date', type: 'string', format: 'date-time', description: 'Défaut : maintenant.'),
                new OA\Property(property: 'description', type: 'string', nullable: true),
            ]
        )
    )]
    #[OA\Response(response: 201, description: 'Événement créé.', content: new OA\JsonContent(ref: '#/components/schemas/CalendarEvent'))]
    #[OA\Response(response: 400, description: 'Titre, type ou date invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function create(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        $title = trim((string) ($data['title'] ?? ''));
        $type = (string) ($data['type'] ?? 'rendez_vous');
        $dateRaw = (string) ($data['date'] ?? '');

        if ($title === '') {
            return $this->json(['message' => 'Le titre est obligatoire.'], 400);
        }
        if (!in_array($type, self::ALLOWED_TYPES, true)) {
            return $this->json(['message' => 'Type d\'événement invalide.'], 400);
        }

        try {
            $date = new \DateTimeImmutable($dateRaw !== '' ? $dateRaw : 'now');
        } catch (\Exception) {
            return $this->json(['message' => 'Date invalide.'], 400);
        }

        $event = new CalendarEvent();
        $event->setProject($project);
        $event->setTitle($title);
        $event->setDate($date);
        $event->setType($type);
        $event->setDescription($data['description'] ?? null);
        $event->setCreatedBy($user);

        $em->persist($event);
        $em->flush();

        return $this->json($this->serialize($event), 201);
    }

    #[Route('/api/projects/{id}/events/{eventId}', name: 'api_projects_events_update', methods: ['PATCH'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'Identifiant du projet.')]
    #[OA\Parameter(name: 'eventId', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: "Identifiant public (UUID) de l'événement.")]
    #[OA\RequestBody(
        required: false,
        description: 'Tous les champs sont optionnels ; seuls ceux fournis sont mis à jour.',
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'title', type: 'string'),
                new OA\Property(property: 'type', type: 'string', enum: ['cadrage', 'design', 'developpement', 'recette', 'livraison', 'rendez_vous', 'deadline']),
                new OA\Property(property: 'date', type: 'string', format: 'date-time'),
                new OA\Property(property: 'description', type: 'string', nullable: true),
            ]
        )
    )]
    #[OA\Response(response: 200, description: 'Événement mis à jour.', content: new OA\JsonContent(ref: '#/components/schemas/CalendarEvent'))]
    #[OA\Response(response: 400, description: 'Titre, type ou date invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou événement introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function update(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        #[MapEntity(mapping: ['eventId' => 'publicId'])] CalendarEvent $event,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        if ($event->getProject()?->getId() !== $project->getId()) {
            return $this->json(['message' => 'Événement introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'Données JSON invalides.'], 400);
        }

        if (isset($data['title'])) {
            $title = trim((string) $data['title']);
            if ($title === '') {
                return $this->json(['message' => 'Le titre est obligatoire.'], 400);
            }
            $event->setTitle($title);
        }
        if (isset($data['type'])) {
            if (!in_array($data['type'], self::ALLOWED_TYPES, true)) {
                return $this->json(['message' => 'Type d\'événement invalide.'], 400);
            }
            $event->setType($data['type']);
        }
        if (isset($data['date'])) {
            try {
                $event->setDate(new \DateTimeImmutable((string) $data['date']));
            } catch (\Exception) {
                return $this->json(['message' => 'Date invalide.'], 400);
            }
        }
        if (array_key_exists('description', $data)) {
            $event->setDescription($data['description']);
        }

        $em->flush();

        return $this->json($this->serialize($event));
    }

    #[Route('/api/projects/{id}/events/{eventId}', name: 'api_projects_events_delete', methods: ['DELETE'])]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: 'Identifiant public (UUID) du projet.')]
    #[OA\Parameter(name: 'eventId', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid'), description: "Identifiant public (UUID) de l'événement à supprimer.")]
    #[OA\Response(
        response: 200,
        description: 'Événement supprimé.',
        content: new OA\JsonContent(properties: [new OA\Property(property: 'message', type: 'string')])
    )]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou événement introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function delete(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        #[MapEntity(mapping: ['eventId' => 'publicId'])] CalendarEvent $event,
        ProjectAccessService $access,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        if ($event->getProject()?->getId() !== $project->getId()) {
            return $this->json(['message' => 'Événement introuvable.'], 404);
        }

        $em->remove($event);
        $em->flush();

        return $this->json(['message' => 'Événement supprimé.']);
    }
}
