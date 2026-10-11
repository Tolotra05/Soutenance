<?php

namespace App\Service;

use App\Entity\Project;
use App\Entity\Subtask;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Subtask state transitions, mirroring the rules the front used to apply
 * only to its local React state (lib/contexts/projects-context.tsx):
 * a project's progress is the average progress of its non-cancelled
 * subtasks, and a project auto-completes once every subtask is "done".
 */
class SubtaskWorkflowService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function updateStatus(Subtask $subtask, string $status): void
    {
        $progress = match (true) {
            $status === 'done' => 100,
            $status === 'review' => max($subtask->getProgress(), 85),
            default => $subtask->getProgress(),
        };
        $subtask->setStatus($status)->setProgress($progress);

        if ($subtask->isActive() && $status !== 'in_progress') {
            $this->closeRunningSession($subtask);
        }

        $this->recalculateProject($subtask->getProject());
    }

    public function approve(Subtask $subtask): void
    {
        $subtask->setStatus('done')->setProgress(100);
        $this->recalculateProject($subtask->getProject());
    }

    public function updateProgress(Subtask $subtask, int $progress): void
    {
        $subtask->setProgress($progress);
        $this->recalculateProject($subtask->getProject());
    }

    /** Starts a new timed work session, or closes the running one. */
    public function toggleTimer(Subtask $subtask): void
    {
        $now = new \DateTimeImmutable();

        if (!$subtask->isActive()) {
            $sessions = $subtask->getWorkSessions();
            $sessions[] = ['start' => $now->format(\DateTimeInterface::ATOM), 'end' => null, 'duration' => 0];
            $subtask->setWorkSessions($sessions);
            $subtask->setIsActive(true);
            if ($subtask->getStatus() !== 'done') {
                $subtask->setStatus('in_progress');
            }

            return;
        }

        $this->closeRunningSession($subtask, $now);
        $subtask->setIsActive(false);
    }

    private function closeRunningSession(Subtask $subtask, ?\DateTimeImmutable $endedAt = null): void
    {
        $endedAt ??= new \DateTimeImmutable();
        $sessions = $subtask->getWorkSessions();
        foreach ($sessions as &$session) {
            if ($session['end'] === null) {
                $start = new \DateTimeImmutable($session['start']);
                $session['end'] = $endedAt->format(\DateTimeInterface::ATOM);
                $session['duration'] = max(0, $endedAt->getTimestamp() - $start->getTimestamp());
            }
        }
        unset($session);
        $subtask->setWorkSessions($sessions)->setIsActive(false);
    }

    private function recalculateProject(?Project $project): void
    {
        if ($project === null) {
            return;
        }

        $subtasks = array_filter(
            $this->em->getRepository(Subtask::class)->findBy(['project' => $project]),
            fn (Subtask $s) => $s->getStatus() !== 'cancelled'
        );

        if ($subtasks !== []) {
            $total = array_sum(array_map(fn (Subtask $s) => $s->getProgress(), $subtasks));
            $project->setProgress((int) round($total / count($subtasks)));
        }

        $all = $this->em->getRepository(Subtask::class)->findBy(['project' => $project]);
        if ($all !== [] && array_reduce($all, fn ($carry, Subtask $s) => $carry && $s->getStatus() === 'done', true)) {
            $project->setStatus('completed');
        }
    }
}
