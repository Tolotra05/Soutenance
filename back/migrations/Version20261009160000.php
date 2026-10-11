<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * The "subtasks" API/entity added in Version20261009140000 gave every
 * project a real, persisted task list -- but the demo projects seeded
 * earlier (Version20260922130000) never got any Subtask rows, unlike the
 * frontend's old mock-data.ts (which had a rich subtask list for its first
 * 3 projects). Result: dashboards/kanbans for the demo accounts went from
 * "populated" (mocks) to "empty" (real, but nothing seeded) the moment the
 * front was wired to the real API -- not a bug in that wiring, just missing
 * seed data for a feature that didn't persist anything before.
 *
 * Ports front/lib/mock-data.ts's subtask1/subtask2/subtask3 (+ their
 * comments) onto the 3 matching real projects, resolving project/user ids
 * by title/email (idempotent via WHERE NOT EXISTS, same pattern as the
 * other seed migrations).
 */
final class Version20261009160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "Seed demo subtasks (+ comments) for the first 3 demo projects, ported from the front's old mock-data.ts.";
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        $hex = bin2hex($data);

        return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20, 12));
    }

    /**
     * @return list<array{title: string, description: string, status: string, priority: string, assignedTo: ?string, startDate: string, dueDate: string, progress: int, comments: list<array{author: string, content: string, at: string}>}>
     */
    private function project1Subtasks(): array
    {
        return [
            ['title' => 'Cadrage & analyse des besoins', 'description' => "Recueillir et documenter les besoins fonctionnels du client, valider le périmètre.", 'status' => 'done', 'priority' => 'high', 'assignedTo' => 'aicha.diallo@proflow.io', 'startDate' => '2026-06-01 00:00:00', 'dueDate' => '2026-06-07 00:00:00', 'progress' => 100, 'comments' => [
                ['author' => 'camille@techstart.fr', 'content' => "Bonjour, n'oubliez pas que le paiement Stripe est prioritaire.", 'at' => '2026-06-02 09:00:00'],
                ['author' => 'aicha.diallo@proflow.io', 'content' => "C'est noté. Le périmètre inclut la connexion Stripe et la gestion des devis.", 'at' => '2026-06-02 11:30:00'],
            ]],
            ['title' => 'Wireframes & maquettes', 'description' => "Créer les wireframes et maquettes haute fidélité de l'interface.", 'status' => 'done', 'priority' => 'high', 'assignedTo' => 'lina.chen@proflow.io', 'startDate' => '2026-06-08 00:00:00', 'dueDate' => '2026-06-20 00:00:00', 'progress' => 100, 'comments' => [
                ['author' => 'camille@techstart.fr', 'content' => "Les maquettes sont superbes, j'aime beaucoup la direction visuelle !", 'at' => '2026-06-18 10:00:00'],
                ['author' => 'lina.chen@proflow.io', 'content' => "Merci ! Prochaine étape : l'intégration frontend.", 'at' => '2026-06-18 12:00:00'],
            ]],
            ['title' => 'Développement Frontend', 'description' => 'Intégrer les maquettes en React/Next.js avec TailwindCSS.', 'status' => 'in_progress', 'priority' => 'urgent', 'assignedTo' => 'thomas.dubois@proflow.io', 'startDate' => '2026-06-21 00:00:00', 'dueDate' => '2026-07-15 00:00:00', 'progress' => 60, 'comments' => [
                ['author' => 'thomas.dubois@proflow.io', 'content' => 'La page catalogue est prête, je passe aux pages produit maintenant.', 'at' => '2026-06-28 14:00:00'],
            ]],
            ['title' => 'Développement Backend & API', 'description' => "Créer l'API REST (Laravel) et la base de données MySQL.", 'status' => 'in_progress', 'priority' => 'high', 'assignedTo' => 'marco.rossi@proflow.io', 'startDate' => '2026-06-10 00:00:00', 'dueDate' => '2026-07-10 00:00:00', 'progress' => 70, 'comments' => [
                ['author' => 'marco.rossi@proflow.io', 'content' => "J'ai ajouté le cache Redis pour optimiser les performances, en attente d'approbation.", 'at' => '2026-06-30 09:00:00'],
            ]],
            ['title' => 'Tests & QA', 'description' => 'Rédiger et exécuter les scénarios de test, corriger les bugs.', 'status' => 'todo', 'priority' => 'medium', 'assignedTo' => 'jakub.nowak@proflow.io', 'startDate' => '2026-07-16 00:00:00', 'dueDate' => '2026-07-25 00:00:00', 'progress' => 0, 'comments' => []],
            ['title' => 'Déploiement & livraison', 'description' => 'Déployer sur Netlify et remettre le projet au client.', 'status' => 'todo', 'priority' => 'high', 'assignedTo' => null, 'startDate' => '2026-07-26 00:00:00', 'dueDate' => '2026-07-31 00:00:00', 'progress' => 0, 'comments' => []],
        ];
    }

    /** @return list<array> */
    private function project2Subtasks(): array
    {
        return [
            ['title' => 'Cadrage & audit UX existant', 'description' => 'Analyser le site actuel et identifier les points de friction.', 'status' => 'done', 'priority' => 'medium', 'assignedTo' => 'lina.chen@proflow.io', 'startDate' => '2026-07-01 00:00:00', 'dueDate' => '2026-07-05 00:00:00', 'progress' => 100, 'comments' => []],
            ['title' => 'Refonte visuelle', 'description' => 'Nouvelle charte graphique et design system.', 'status' => 'review', 'priority' => 'high', 'assignedTo' => 'lina.chen@proflow.io', 'startDate' => '2026-07-06 00:00:00', 'dueDate' => '2026-07-18 00:00:00', 'progress' => 85, 'comments' => [
                ['author' => 'elodie.martin@proflow.io', 'content' => "J'ai validé la direction, il reste les variantes de boutons à finaliser.", 'at' => '2026-07-15 10:00:00'],
            ]],
            ['title' => 'Intégration nouvelle UI', 'description' => 'Remplacer les anciens composants par les nouveaux.', 'status' => 'todo', 'priority' => 'high', 'assignedTo' => 'thomas.dubois@proflow.io', 'startDate' => '2026-07-19 00:00:00', 'dueDate' => '2026-08-05 00:00:00', 'progress' => 0, 'comments' => []],
        ];
    }

    /** @return list<array> */
    private function project3Subtasks(): array
    {
        return [
            ['title' => 'Cadrage & architecture technique', 'description' => "Définir l'architecture, le choix des technos et le schéma de base de données.", 'status' => 'todo', 'priority' => 'high', 'assignedTo' => 'marco.rossi@proflow.io', 'startDate' => '2026-09-01 00:00:00', 'dueDate' => '2026-09-07 00:00:00', 'progress' => 0, 'comments' => []],
            ['title' => 'Design & prototypage', 'description' => 'Maquettes et prototype interactif.', 'status' => 'todo', 'priority' => 'medium', 'assignedTo' => 'lina.chen@proflow.io', 'startDate' => '2026-09-01 00:00:00', 'dueDate' => '2026-09-10 00:00:00', 'progress' => 0, 'comments' => []],
        ];
    }

    private function seedForProject(string $projectTitle, array $subtasks, string $createdAt): void
    {
        $projectId = $this->connection->fetchOne('SELECT id FROM project WHERE title = ?', [$projectTitle]);
        if (!$projectId) {
            return; // demo project not present in this environment -- nothing to attach to
        }

        foreach ($subtasks as $s) {
            $exists = $this->connection->fetchOne(
                'SELECT id FROM subtask WHERE project_id = ? AND title = ?',
                [$projectId, $s['title']]
            );
            if ($exists) {
                continue;
            }

            $assignedToId = $s['assignedTo']
                ? $this->connection->fetchOne('SELECT id FROM user WHERE email = ?', [$s['assignedTo']])
                : null;

            // Needs the auto-generated id back within this same up() call (for
            // the comments below), so this uses executeStatement() directly
            // instead of addSql() -- addSql() only queues the statement to run
            // after up() returns, which is too late to read lastInsertId().
            $this->connection->executeStatement(
                'INSERT INTO subtask (public_id, project_id, title, description, status, priority, assigned_to_id, depends_on_id, start_date, due_date, progress, is_active, work_sessions, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 0, NULL, ?)',
                [$this->uuid(), $projectId, $s['title'], $s['description'], $s['status'], $s['priority'], $assignedToId ?: null, $s['startDate'], $s['dueDate'], $s['progress'], $createdAt]
            );
            $subtaskId = $this->connection->lastInsertId();

            foreach ($s['comments'] as $c) {
                $authorId = $this->connection->fetchOne('SELECT id FROM user WHERE email = ?', [$c['author']]);
                if (!$authorId) {
                    continue;
                }
                $this->connection->executeStatement(
                    'INSERT INTO subtask_comment (public_id, subtask_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
                    [$this->uuid(), $subtaskId, $authorId, $c['content'], $c['at']]
                );
            }
        }
    }

    public function up(Schema $schema): void
    {
        $this->seedForProject('Plateforme E-commerce TechStart', $this->project1Subtasks(), '2026-05-28 08:00:00');
        $this->seedForProject('Refonte Site Vitrine EcoShop', $this->project2Subtasks(), '2026-06-28 08:00:00');
        $this->seedForProject('Application Mobile UrbanVibes Fitness', $this->project3Subtasks(), '2026-08-28 08:00:00');
    }

    public function down(Schema $schema): void
    {
        foreach (['Plateforme E-commerce TechStart', 'Refonte Site Vitrine EcoShop', 'Application Mobile UrbanVibes Fitness'] as $title) {
            $this->addSql(
                'DELETE sc FROM subtask_comment sc INNER JOIN subtask s ON s.id = sc.subtask_id INNER JOIN project p ON p.id = s.project_id WHERE p.title = ?',
                [$title]
            );
            $this->addSql(
                'DELETE s FROM subtask s INNER JOIN project p ON p.id = s.project_id WHERE p.title = ?',
                [$title]
            );
        }
    }
}
