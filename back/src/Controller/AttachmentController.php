<?php

namespace App\Controller;

use App\Entity\Attachment;
use App\Entity\Project;
use App\Entity\Subtask;
use App\Entity\User;
use App\Service\FileUploadService;
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
 * Pièces jointes projet/sous-tâche. Remplace l'ancien comportement du front
 * (FileReader -> data: URL en base64, jamais envoyée nulle part) par un
 * vrai upload persistant (voir FileUploadService).
 */
#[OA\Tag(name: 'Attachments')]
class AttachmentController extends AbstractController
{
    private const ALLOWED_TYPES = ['project', 'subtask_deliverable', 'comment'];

    #[Route('/api/attachments', name: 'api_attachments_create', methods: ['POST'])]
    #[OA\RequestBody(
        required: true,
        content: new OA\MediaType(mediaType: 'multipart/form-data', schema: new OA\Schema(properties: [
            new OA\Property(property: 'file', type: 'string', format: 'binary'),
            new OA\Property(property: 'projectId', type: 'string', format: 'uuid', description: 'Requis si subtaskId est absent.'),
            new OA\Property(property: 'subtaskId', type: 'string', format: 'uuid', description: 'Requis si projectId est absent.'),
            new OA\Property(property: 'attachmentType', type: 'string', enum: ['project', 'subtask_deliverable', 'comment']),
        ]))
    )]
    #[OA\Response(response: 201, description: 'Pièce jointe enregistrée.')]
    #[OA\Response(response: 400, description: 'Fichier manquant/invalide ou ni projectId ni subtaskId fourni.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Projet ou sous-tâche introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        ProjectAccessService $access,
        FileUploadService $uploader,
        ProjectSerializer $serializer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $file = $request->files->get('file');
        if ($file === null) {
            return $this->json(['message' => 'Le fichier est obligatoire.'], 400);
        }

        $projectId = $request->request->get('projectId');
        $subtaskId = $request->request->get('subtaskId');
        if (!$projectId && !$subtaskId) {
            return $this->json(['message' => 'projectId ou subtaskId est obligatoire.'], 400);
        }

        $project = null;
        $subtask = null;
        if ($subtaskId) {
            $subtask = $em->getRepository(Subtask::class)->findOneBy(['publicId' => (string) $subtaskId]);
            if (!$subtask) {
                return $this->json(['message' => 'Sous-tâche introuvable.'], 404);
            }
            $project = $subtask->getProject();
        } else {
            $project = $em->getRepository(Project::class)->findOneBy(['publicId' => (string) $projectId]);
            if (!$project) {
                return $this->json(['message' => 'Projet introuvable.'], 404);
            }
        }

        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $attachmentType = (string) $request->request->get('attachmentType', 'project');
        if (!in_array($attachmentType, self::ALLOWED_TYPES, true)) {
            return $this->json(['message' => 'Type de pièce jointe invalide.'], 400);
        }

        try {
            $stored = $uploader->store($file);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        }

        $attachment = new Attachment();
        $attachment->setProject($subtask ? null : $project);
        $attachment->setSubtask($subtask);
        $attachment->setFileName($stored['fileName']);
        $attachment->setFileType($stored['fileType']);
        $attachment->setUrl($stored['url']);
        $attachment->setUploadedBy($user);
        $attachment->setAttachmentType($attachmentType);
        if ($attachmentType === 'subtask_deliverable') {
            $attachment->setValidationStatus('pending');
        }

        $em->persist($attachment);
        $em->flush();

        return $this->json($serializer->serializeAttachment($attachment), 201);
    }

    #[Route('/api/attachments/{id}/validate', name: 'api_attachments_validate', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Validation enregistrée.')]
    #[OA\Response(response: 400, description: 'Décision invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Pièce jointe introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function validate(
        #[MapEntity(mapping: ['id' => 'publicId'])] Attachment $attachment,
        Request $request,
        ProjectAccessService $access,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        $project = $attachment->getProject() ?? $attachment->getSubtask()?->getProject();
        $isAdmin = $access->isAdmin($user);
        $isManager = $project && $access->isManager($project, $user);
        if (!$isAdmin && !$isManager) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $action = (string) ($data['action'] ?? '');
        if (!in_array($action, ['approve', 'reject'], true)) {
            return $this->json(['message' => 'Décision invalide (approve/reject attendu).'], 400);
        }

        $attachment->setValidationStatus($action === 'approve' ? 'approved' : 'rejected');
        $attachment->setValidatedBy($user);
        $attachment->setValidatedAt(new \DateTimeImmutable());
        $em->flush();

        return $this->json($serializer->serializeAttachment($attachment));
    }
}
