<?php

namespace App\Service;

use App\Entity\Attachment;
use App\Entity\CalendarEvent;
use App\Entity\ModificationRequest;
use App\Entity\Project;
use App\Entity\Requete;
use App\Entity\Subtask;
use App\Entity\SubtaskComment;
use App\Entity\TaskRequest;

/**
 * Builds the JSON shape the front expects for a full Project object, with all
 * of its nested work-tracking data (subtasks, comments, attachments,
 * modification requests, client task requests, requêtes, calendar events).
 *
 * Takes pre-grouped collections (batch-fetched by the caller via
 * findByProjects()/findBySubtasks()) rather than lazy-loading relations one
 * project at a time, to keep GET /api/projects at a constant number of
 * queries regardless of how many projects are returned.
 */
class ProjectSerializer
{
    public function serializeSubtask(Subtask $subtask, array $commentsBySubtask, array $attachmentsBySubtask): array
    {
        $subtaskId = $subtask->getId();

        return [
            'id' => $subtask->getPublicId(),
            'projectId' => $subtask->getProject()?->getPublicId(),
            'title' => $subtask->getTitle(),
            'description' => $subtask->getDescription(),
            'status' => $subtask->getStatus(),
            'priority' => $subtask->getPriority(),
            'assignedToId' => $subtask->getAssignedTo()?->getPublicId(),
            'dependsOnId' => $subtask->getDependsOn()?->getPublicId(),
            'startDate' => $subtask->getStartDate()?->format(\DateTimeInterface::ATOM),
            'dueDate' => $subtask->getDueDate()?->format(\DateTimeInterface::ATOM),
            'progress' => $subtask->getProgress(),
            'attachments' => array_map(
                fn (Attachment $a) => $this->serializeAttachment($a),
                $attachmentsBySubtask[$subtaskId] ?? []
            ),
            'comments' => array_map(
                fn (SubtaskComment $c) => $this->serializeComment($c),
                $commentsBySubtask[$subtaskId] ?? []
            ),
            'isActive' => $subtask->isActive(),
            'workSessions' => $subtask->getWorkSessions(),
            'createdAt' => $subtask->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    public function serializeComment(SubtaskComment $comment): array
    {
        return [
            'id' => $comment->getPublicId(),
            'subtaskId' => $comment->getSubtask()?->getPublicId(),
            'authorId' => $comment->getAuthor()?->getPublicId(),
            'content' => $comment->getContent(),
            'createdAt' => $comment->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    public function serializeAttachment(Attachment $attachment): array
    {
        return [
            'id' => $attachment->getPublicId(),
            'fileName' => $attachment->getFileName(),
            'fileType' => $attachment->getFileType(),
            'url' => $attachment->getUrl(),
            'uploadedBy' => $attachment->getUploadedBy()?->getPublicId(),
            'uploadedAt' => $attachment->getUploadedAt()?->format(\DateTimeInterface::ATOM),
            'attachmentType' => $attachment->getAttachmentType(),
            'validationStatus' => $attachment->getValidationStatus(),
            'validatedBy' => $attachment->getValidatedBy()?->getPublicId(),
            'validatedAt' => $attachment->getValidatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    public function serializeModification(ModificationRequest $mod): array
    {
        return [
            'id' => $mod->getPublicId(),
            'projectId' => $mod->getProject()?->getPublicId(),
            'subtaskId' => $mod->getSubtask()?->getPublicId(),
            'target' => $mod->getTarget(),
            'requestedById' => $mod->getRequestedBy()?->getPublicId(),
            'requestedByName' => $mod->getRequestedBy()?->getName(),
            'field' => $mod->getField(),
            'oldValue' => $mod->getOldValue(),
            'newValue' => $mod->getNewValue(),
            'reason' => $mod->getReason(),
            'status' => $mod->getStatus(),
            'reviewedById' => $mod->getReviewedBy()?->getPublicId(),
            'reviewNote' => $mod->getReviewNote(),
            'createdAt' => $mod->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'reviewedAt' => $mod->getReviewedAt()?->format(\DateTimeInterface::ATOM),
            'teamReview' => $mod->getTeamReview(),
            'clientReview' => $mod->getClientReview(),
        ];
    }

    public function serializeTaskRequest(TaskRequest $taskRequest): array
    {
        return [
            'id' => $taskRequest->getPublicId(),
            'projectId' => $taskRequest->getProject()?->getPublicId(),
            'clientId' => $taskRequest->getClient()?->getPublicId(),
            'title' => $taskRequest->getTitle(),
            'description' => $taskRequest->getDescription(),
            'priority' => $taskRequest->getPriority(),
            'besoinDate' => $taskRequest->getBesoinDate()?->format(\DateTimeInterface::ATOM),
            'photoUrl' => $taskRequest->getPhotoUrl(),
            'photoName' => $taskRequest->getPhotoName(),
            'status' => $taskRequest->getStatus(),
            'reviewedById' => $taskRequest->getReviewedBy()?->getPublicId(),
            'reviewedAt' => $taskRequest->getReviewedAt()?->format(\DateTimeInterface::ATOM),
            'reviewNote' => $taskRequest->getReviewNote(),
            'createdAt' => $taskRequest->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    public function serializeRequete(Requete $requete): array
    {
        return [
            'id' => $requete->getPublicId(),
            'projectId' => $requete->getProject()?->getPublicId(),
            'subtaskId' => $requete->getSubtask()?->getPublicId(),
            'createdById' => $requete->getCreatedBy()?->getPublicId(),
            'createdByName' => $requete->getCreatedBy()?->getName(),
            'content' => $requete->getContent(),
            'status' => $requete->getStatus(),
            'createdAt' => $requete->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'respondedAt' => $requete->getRespondedAt()?->format(\DateTimeInterface::ATOM),
            'response' => $requete->getResponse(),
        ];
    }

    public function serializeCalendarEvent(CalendarEvent $event): array
    {
        return [
            'id' => $event->getPublicId(),
            'projectId' => $event->getProject()?->getPublicId(),
            'title' => $event->getTitle(),
            'date' => $event->getDate()?->format(\DateTimeInterface::ATOM),
            'type' => $event->getType(),
            'description' => $event->getDescription(),
        ];
    }

    /**
     * @param Subtask[] $subtasks
     * @param SubtaskComment[] $comments
     * @param Attachment[] $attachments all attachments for the project's subtasks AND the project itself
     * @param ModificationRequest[] $modifications
     * @param TaskRequest[] $taskRequests
     * @param Requete[] $requetes
     * @param CalendarEvent[] $events
     */
    public function serializeProject(
        Project $project,
        array $subtasks,
        array $comments,
        array $attachments,
        array $modifications,
        array $taskRequests,
        array $requetes,
        array $events,
    ): array {
        $projectId = $project->getId();

        $commentsBySubtask = [];
        foreach ($comments as $comment) {
            $commentsBySubtask[$comment->getSubtask()?->getId()][] = $comment;
        }

        $attachmentsBySubtask = [];
        $projectAttachments = [];
        foreach ($attachments as $attachment) {
            if ($attachment->getSubtask() !== null) {
                $attachmentsBySubtask[$attachment->getSubtask()->getId()][] = $attachment;
            } elseif ($attachment->getProject()?->getId() === $projectId) {
                $projectAttachments[] = $attachment;
            }
        }

        return [
            'id' => $project->getPublicId(),
            'title' => $project->getTitle(),
            'description' => $project->getDescription(),
            'status' => $project->getStatus(),
            'priority' => $project->getPriority(),
            'budget' => $project->getBudget(),
            'progress' => $project->getProgress(),
            'startDate' => $project->getStartDate()?->format(\DateTimeInterface::ATOM),
            'endDate' => $project->getEndDate()?->format(\DateTimeInterface::ATOM),
            'category' => $project->getCategory(),
            'createdAt' => $project->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'statusChangedAt' => $project->getStatusChangedAt()?->format(\DateTimeInterface::ATOM),
            'client' => $project->getClient() ? [
                'id' => $project->getClient()->getPublicId(),
                'name' => $project->getClient()->getName(),
                'email' => $project->getClient()->getEmail(),
            ] : null,
            'manager' => $project->getManager() ? [
                'id' => $project->getManager()->getPublicId(),
                'name' => $project->getManager()->getName(),
                'email' => $project->getManager()->getEmail(),
            ] : null,
            'members' => $project->getMembers() ?? [],
            'attachments' => array_map(fn (Attachment $a) => $this->serializeAttachment($a), $projectAttachments),
            'subtasks' => array_map(
                fn (Subtask $s) => $this->serializeSubtask($s, $commentsBySubtask, $attachmentsBySubtask),
                $subtasks
            ),
            'calendarEvents' => array_map(fn (CalendarEvent $e) => $this->serializeCalendarEvent($e), $events),
            'modifications' => array_map(fn (ModificationRequest $m) => $this->serializeModification($m), $modifications),
            'taskRequests' => array_map(fn (TaskRequest $t) => $this->serializeTaskRequest($t), $taskRequests),
            'requetes' => array_map(fn (Requete $r) => $this->serializeRequete($r), $requetes),
        ];
    }
}
