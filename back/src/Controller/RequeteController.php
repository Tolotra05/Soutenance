<?php

namespace App\Controller;

use App\Entity\Project;
use App\Entity\Requete;
use App\Entity\Subtask;
use App\Entity\User;
use App\Service\NotificationService;
use App\Service\ProjectAccessService;
use App\Service\ProjectSerializer;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * "Requêtes" : l'équipe demande une information / un fichier au client, qui
 * y répond. Direction opposée à TaskRequest (client -> équipe).
 */
#[OA\Tag(name: 'Requetes')]
class RequeteController extends AbstractController
{
    #[Route('/api/projects/{id}/requetes', name: 'api_requetes_create', methods: ['POST'])]
    #[OA\Response(response: 201, description: 'Requête envoyée au client.')]
    #[OA\Response(response: 400, description: 'Contenu manquant.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Réservé à l\'équipe (pas au client).', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function create(
        #[MapEntity(mapping: ['id' => 'publicId'])] Project $project,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
        NotificationService $notifications,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$access->canAccess($project, $user) || $access->isClient($project, $user)) {
            return $this->json(['message' => "Réservé à l'équipe (pas au client)."], 403);
        }

        $data = json_decode($request->getContent(), true);
        $content = trim((string) ($data['content'] ?? ''));
        if ($content === '') {
            return $this->json(['message' => 'Le contenu est obligatoire.'], 400);
        }

        $subtask = null;
        if (!empty($data['subtaskId'])) {
            $subtask = $em->getRepository(Subtask::class)->findOneBy(['publicId' => (string) $data['subtaskId']]);
        }

        $requete = new Requete();
        $requete->setProject($project);
        $requete->setSubtask($subtask);
        $requete->setCreatedBy($user);
        $requete->setContent($content);

        if ($project->getClient()) {
            $notifications->push($project->getClient(), 'requete_created', 'Nouvelle requête', sprintf('%s vous demande : « %s » (projet « %s »).', $user->getName(), $content, $project->getTitle()), $project);
        }

        $em->persist($requete);
        $em->flush();

        return $this->json($serializer->serializeRequete($requete), 201);
    }

    #[Route('/api/requetes/{id}/answer', name: 'api_requetes_answer', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Réponse enregistrée.')]
    #[OA\Response(response: 400, description: 'Réponse manquante.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Réservé au client du projet.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: 'Requête déjà répondue.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function answer(
        #[MapEntity(mapping: ['id' => 'publicId'])] Requete $requete,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$access->isClient($requete->getProject(), $user)) {
            return $this->json(['message' => 'Réservé au client du projet.'], 403);
        }

        if ($requete->getStatus() !== 'pending') {
            return $this->json(['message' => 'Cette requête a déjà une réponse.'], 409);
        }

        $data = json_decode($request->getContent(), true);
        $text = trim((string) ($data['text'] ?? ''));
        if ($text === '') {
            return $this->json(['message' => 'La réponse ne peut pas être vide.'], 400);
        }

        $now = new \DateTimeImmutable();
        $attachment = $data['attachment'] ?? null;
        $requete->setResponse([
            'text' => $text,
            'attachmentUrl' => $attachment['url'] ?? null,
            'attachmentName' => $attachment['fileName'] ?? null,
            'attachmentType' => $attachment['fileType'] ?? null,
            'at' => $now->format(\DateTimeInterface::ATOM),
        ]);
        $requete->setStatus('answered');
        $requete->setRespondedAt($now);
        $em->flush();

        return $this->json($serializer->serializeRequete($requete));
    }
}
