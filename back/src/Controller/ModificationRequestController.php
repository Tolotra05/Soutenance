<?php

namespace App\Controller;

use App\Entity\ModificationRequest;
use App\Entity\Project;
use App\Entity\Subtask;
use App\Entity\User;
use App\Service\ModificationWorkflowService;
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

#[OA\Tag(name: 'Modification requests')]
class ModificationRequestController extends AbstractController
{
    private const ALLOWED_TARGETS = ['subtask', 'project'];

    #[Route('/api/projects/{id}/modifications', name: 'api_modifications_create', methods: ['POST'])]
    #[OA\Response(response: 201, description: 'Demande de modification créée.')]
    #[OA\Response(response: 400, description: 'Données invalides.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
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
        if (!$access->canAccess($project, $user)) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $target = (string) ($data['target'] ?? '');
        if (!in_array($target, self::ALLOWED_TARGETS, true)) {
            return $this->json(['message' => 'Cible invalide (subtask/project attendu).'], 400);
        }
        $field = trim((string) ($data['field'] ?? ''));
        if ($field === '') {
            return $this->json(['message' => 'Le champ concerné est obligatoire.'], 400);
        }

        $subtask = null;
        if ($target === 'subtask') {
            $subtask = $em->getRepository(Subtask::class)->findOneBy(['publicId' => (string) ($data['subtaskId'] ?? '')]);
            if (!$subtask) {
                return $this->json(['message' => 'Sous-tâche introuvable.'], 404);
            }
        }

        $mod = new ModificationRequest();
        $mod->setProject($project);
        $mod->setSubtask($subtask);
        $mod->setTarget($target);
        $mod->setRequestedBy($user);
        $mod->setField($field);
        $mod->setOldValue((string) ($data['oldValue'] ?? ''));
        $mod->setNewValue((string) ($data['newValue'] ?? ''));
        $mod->setReason((string) ($data['reason'] ?? ''));

        $isAdminRequester = in_array('ROLE_ADMIN', $user->getRoles(), true);
        if ($isAdminRequester && $project->getClient()) {
            $notifications->push($project->getClient(), 'modification_requested', 'Demande de modification', sprintf('%s demande une modification sur %s.', $user->getName(), $target === 'project' ? 'le projet' : 'une sous-tâche'), $project);
        } else {
            $notifications->pushToAdmins('modification_requested', 'Demande de modification', sprintf('%s demande une modification sur %s.', $user->getName(), $target === 'project' ? 'le projet' : 'une sous-tâche'), $project);
        }

        $em->persist($mod);
        $em->flush();

        return $this->json($serializer->serializeModification($mod), 201);
    }

    #[Route('/api/modifications/{id}/review', name: 'api_modifications_review', methods: ['PATCH'])]
    #[OA\Response(response: 200, description: 'Décision enregistrée.')]
    #[OA\Response(response: 400, description: 'Décision invalide.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 403, description: 'Non autorisé.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 404, description: 'Demande introuvable.', content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    #[OA\Response(response: 409, description: "La demande n'est plus en attente.", content: new OA\JsonContent(ref: '#/components/schemas/ErrorMessage'))]
    public function review(
        #[MapEntity(mapping: ['id' => 'publicId'])] ModificationRequest $mod,
        Request $request,
        ProjectAccessService $access,
        ModificationWorkflowService $workflow,
        EntityManagerInterface $em,
        ProjectSerializer $serializer,
        NotificationService $notifications,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        $isAdmin = $access->isAdmin($user);
        $isClient = $access->isClient($mod->getProject(), $user);
        if (!$isAdmin && !$isClient) {
            return $this->json(['message' => 'Non autorisé.'], 403);
        }

        if (!in_array($mod->getStatus(), ['pending', 'pending_client'], true)) {
            return $this->json(['message' => "Cette demande n'est plus en attente."], 409);
        }

        $data = json_decode($request->getContent(), true);
        $decision = (string) ($data['decision'] ?? '');
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            return $this->json(['message' => 'Décision invalide.'], 400);
        }

        $workflow->review($mod, $user, $decision, (string) ($data['note'] ?? ''));

        if ($mod->getStatus() === 'pending_client' && $mod->getProject()->getClient()) {
            $notifications->push($mod->getProject()->getClient(), 'modification_requested', 'Approbation requise', sprintf('La demande de modification (%s) a été approuvée par l\'équipe et attend votre validation finale.', $mod->getField()), $mod->getProject());
        } elseif (in_array($mod->getStatus(), ['approved', 'rejected'], true) && $mod->getRequestedBy()) {
            $notifications->push(
                $mod->getRequestedBy(),
                'modification_reviewed',
                $mod->getStatus() === 'approved' ? 'Modification approuvée' : 'Modification rejetée',
                sprintf('Votre demande de modification (%s) a été %s.', $mod->getField(), $mod->getStatus() === 'approved' ? 'approuvée' : 'rejetée'),
                $mod->getProject(),
            );
        }

        $em->flush();

        return $this->json($serializer->serializeModification($mod));
    }
}
