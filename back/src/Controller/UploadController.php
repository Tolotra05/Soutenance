<?php

namespace App\Controller;

use App\Service\FileUploadService;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Upload de fichier générique (avatar, logo de projet, photo jointe à une
 * demande de tâche ou une requête...). Remplace le pattern FileReader()
 * -> data: URL en base64 utilisé partout côté front, qui ne persistait
 * jamais réellement le fichier nulle part.
 */
#[OA\Tag(name: 'Uploads')]
class UploadController extends AbstractController
{
    #[Route('/api/uploads', name: 'api_uploads_create', methods: ['POST'])]
    #[OA\RequestBody(
        required: true,
        content: new OA\MediaType(mediaType: 'multipart/form-data', schema: new OA\Schema(properties: [
            new OA\Property(property: 'file', type: 'string', format: 'binary'),
        ]))
    )]
    #[OA\Response(
        response: 201,
        description: 'Fichier stocké, URL publique renvoyée.',
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'url', type: 'string', example: '/uploads/3f1c2b7e9a4d4f0e8b1c6a2d9e7f5c3a.png'),
            new OA\Property(property: 'fileName', type: 'string'),
            new OA\Property(property: 'fileType', type: 'string'),
        ])
    )]
    #[OA\Response(response: 400, description: 'Fichier manquant, trop volumineux ou type non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function upload(Request $request, FileUploadService $uploader): JsonResponse
    {
        $file = $request->files->get('file');
        if ($file === null) {
            return $this->json(['message' => 'Le fichier est obligatoire.'], 400);
        }

        try {
            return $this->json($uploader->store($file), 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        }
    }
}
