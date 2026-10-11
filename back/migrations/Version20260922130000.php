<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Seeds the frontend's demo dataset (front/lib/mock-data.ts -> mockProjects)
 * into the tables that actually exist on the backend: `project`,
 * `project_member` (relational team, kept in sync with the `members` JSON
 * column as the rest of the app already does), `calendar_event` and a
 * simplified `project_status_log` history (initial `pending` step, then one
 * more step to the project's current status when it isn't `pending` — the
 * real, fine-grained workflow transitions aren't replayed here, this is seed
 * data, not a historical replay).
 *
 * Sub-tasks, comments, attachments, modification/task requests and requêtes
 * have no backend table yet, so they are intentionally NOT seeded here.
 *
 * Must run after Version20260922120000 (users) since it looks users up by
 * email via subqueries.
 */
final class Version20260922130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "Seed the frontend's demo projects (mock-data.ts) into project/project_member/calendar_event.";
    }

    /**
     * @return list<array{
     *   title: string, description: string, status: string, priority: string,
     *   budget: int, progress: int, category: string,
     *   startDate: string, endDate: string, createdAt: string,
     *   clientEmail: string, managerEmail: ?string, rejectionReason: ?string,
     *   members: list<array{email: string, role: string, joinedAt: string}>,
     *   events: list<array{title: string, date: string, type: string, description: ?string}>,
     * }>
     */
    private function seedProjects(): array
    {
        return [
            [
                'title' => 'Plateforme E-commerce TechStart',
                'description' => "Création d'une plateforme e-commerce complète avec gestion de catalogue, panier, paiement Stripe et espace client. La plateforme doit être responsive et optimisée SEO.",
                'status' => 'in_progress', 'priority' => 'high', 'budget' => 45000, 'progress' => 55, 'category' => 'E-commerce',
                'startDate' => '2026-06-01 00:00:00', 'endDate' => '2026-07-31 00:00:00', 'createdAt' => '2026-05-20 08:00:00',
                'clientEmail' => 'camille@techstart.fr', 'managerEmail' => 'karim.benali@proflow.io', 'rejectionReason' => null,
                'members' => [
                    ['email' => 'camille@techstart.fr', 'role' => 'client', 'joinedAt' => '2026-05-20 00:00:00'],
                    ['email' => 'karim.benali@proflow.io', 'role' => 'chef_de_projet', 'joinedAt' => '2026-05-22 00:00:00'],
                    ['email' => 'thomas.dubois@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-06-01 00:00:00'],
                    ['email' => 'lina.chen@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-06-01 00:00:00'],
                    ['email' => 'marco.rossi@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-06-01 00:00:00'],
                    ['email' => 'aicha.diallo@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-06-01 00:00:00'],
                    ['email' => 'jakub.nowak@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-06-15 00:00:00'],
                ],
                'events' => [
                    ['title' => 'Début du cadrage', 'date' => '2026-06-01 00:00:00', 'type' => 'cadrage', 'description' => null],
                    ['title' => 'Rendez-vous client — rapport de cadrage', 'date' => '2026-06-10 00:00:00', 'type' => 'rendez_vous', 'description' => 'Présentation du cadrage et du périmètre au client.'],
                    ['title' => 'Fin du développement', 'date' => '2026-07-15 00:00:00', 'type' => 'developpement', 'description' => null],
                    ['title' => 'Livraison finale', 'date' => '2026-07-31 00:00:00', 'type' => 'livraison', 'description' => null],
                ],
            ],
            [
                'title' => 'Refonte Site Vitrine EcoShop',
                'description' => "Refonte complète du site vitrine d'EcoShop avec nouveau design system, amélioration des performances et accessibilité. Migration vers Next.js.",
                'status' => 'in_progress', 'priority' => 'medium', 'budget' => 22000, 'progress' => 35, 'category' => 'Site vitrine',
                'startDate' => '2026-07-01 00:00:00', 'endDate' => '2026-08-15 00:00:00', 'createdAt' => '2026-06-25 08:00:00',
                'clientEmail' => 'olivier@ecoshop.com', 'managerEmail' => 'elodie.martin@proflow.io', 'rejectionReason' => null,
                'members' => [
                    ['email' => 'olivier@ecoshop.com', 'role' => 'client', 'joinedAt' => '2026-06-25 00:00:00'],
                    ['email' => 'elodie.martin@proflow.io', 'role' => 'chef_de_projet', 'joinedAt' => '2026-06-26 00:00:00'],
                    ['email' => 'lina.chen@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-07-01 00:00:00'],
                    ['email' => 'thomas.dubois@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-07-01 00:00:00'],
                ],
                'events' => [
                    ['title' => 'Début du cadrage', 'date' => '2026-07-01 00:00:00', 'type' => 'cadrage', 'description' => null],
                    ['title' => 'Rendez-vous client — rapport de cadrage', 'date' => '2026-07-08 00:00:00', 'type' => 'rendez_vous', 'description' => null],
                    ['title' => 'Livraison finale', 'date' => '2026-08-15 00:00:00', 'type' => 'livraison', 'description' => null],
                ],
            ],
            [
                'title' => 'Application Mobile UrbanVibes Fitness',
                'description' => 'Application mobile de coaching fitness personnalisé avec suivi des entraînements, plans nutritionnels et communauté. iOS + Android (React Native).',
                'status' => 'pending', 'priority' => 'urgent', 'budget' => 75000, 'progress' => 0, 'category' => 'Application mobile',
                'startDate' => '2026-09-01 00:00:00', 'endDate' => '2026-12-15 00:00:00', 'createdAt' => '2026-08-20 08:00:00',
                'clientEmail' => 'nadia@urbanvibes.io', 'managerEmail' => null, 'rejectionReason' => null,
                'members' => [
                    ['email' => 'nadia@urbanvibes.io', 'role' => 'client', 'joinedAt' => '2026-08-20 00:00:00'],
                ],
                'events' => [
                    ['title' => 'Début du cadrage', 'date' => '2026-09-01 00:00:00', 'type' => 'cadrage', 'description' => null],
                ],
            ],
            [
                'title' => 'Dashboard Analytics B2B',
                'description' => 'Tableau de bord analytics B2B avec visualisation de données en temps réel, exports PDF/Excel et gestion multi-tenant.',
                'status' => 'validated', 'priority' => 'high', 'budget' => 38000, 'progress' => 0, 'category' => 'Dashboard',
                'startDate' => '2026-09-10 00:00:00', 'endDate' => '2026-11-30 00:00:00', 'createdAt' => '2026-08-25 08:00:00',
                'clientEmail' => 'camille@techstart.fr', 'managerEmail' => null, 'rejectionReason' => null,
                'members' => [
                    ['email' => 'camille@techstart.fr', 'role' => 'client', 'joinedAt' => '2026-08-25 00:00:00'],
                ],
                'events' => [],
            ],
            [
                'title' => 'Refonte Logo & Identité — UrbanVibes',
                'description' => "Création d'une nouvelle identité visuelle : logo, charte graphique, déclinaisons print et digital.",
                'status' => 'rejected', 'priority' => 'low', 'budget' => 8000, 'progress' => 0, 'category' => 'Design',
                'startDate' => '2026-08-15 00:00:00', 'endDate' => '2026-09-15 00:00:00', 'createdAt' => '2026-08-10 08:00:00',
                'clientEmail' => 'nadia@urbanvibes.io', 'managerEmail' => null,
                'rejectionReason' => 'Le budget alloué est insuffisant par rapport au périmètre demandé. Nous vous invitons à revoir le budget ou réduire le périmètre (par ex. ne garder que le logo dans un premier temps).',
                'members' => [
                    ['email' => 'nadia@urbanvibes.io', 'role' => 'client', 'joinedAt' => '2026-08-10 00:00:00'],
                ],
                'events' => [],
            ],
            [
                'title' => 'Application de réservation de restaurant',
                'description' => 'Application web de réservation de tables avec gestion des disponibilités et notifications.',
                'status' => 'completed', 'priority' => 'medium', 'budget' => 28000, 'progress' => 100, 'category' => 'Application web',
                'startDate' => '2026-03-01 00:00:00', 'endDate' => '2026-05-31 00:00:00', 'createdAt' => '2026-02-15 08:00:00',
                'clientEmail' => 'olivier@ecoshop.com', 'managerEmail' => 'karim.benali@proflow.io', 'rejectionReason' => null,
                'members' => [
                    ['email' => 'olivier@ecoshop.com', 'role' => 'client', 'joinedAt' => '2026-02-15 00:00:00'],
                    ['email' => 'karim.benali@proflow.io', 'role' => 'chef_de_projet', 'joinedAt' => '2026-02-20 00:00:00'],
                    ['email' => 'thomas.dubois@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-03-01 00:00:00'],
                    ['email' => 'lina.chen@proflow.io', 'role' => 'membre', 'joinedAt' => '2026-03-01 00:00:00'],
                ],
                'events' => [],
            ],
            [
                'title' => 'Audit de sécurité applicative',
                'description' => "Audit complet de la sécurité de l'application existante avec rapport détaillé.",
                'status' => 'rejected', 'priority' => 'low', 'budget' => 5000, 'progress' => 0, 'category' => 'Audit',
                'startDate' => '2026-06-01 00:00:00', 'endDate' => '2026-06-30 00:00:00', 'createdAt' => '2026-05-28 08:00:00',
                'clientEmail' => 'camille@techstart.fr', 'managerEmail' => null,
                'rejectionReason' => "Périmètre trop vague. Merci de détailler les applicatifs concernés et la méthodologie d'audit.",
                'members' => [
                    ['email' => 'camille@techstart.fr', 'role' => 'client', 'joinedAt' => '2026-05-28 00:00:00'],
                ],
                'events' => [],
            ],
        ];
    }

    private function q(?string $s): string
    {
        return $s === null ? 'NULL' : $this->connection->quote($s);
    }

    private function userIdSubquery(string $email): string
    {
        return '(SELECT id FROM user WHERE email = ' . $this->q($email) . ')';
    }

    private function projectIdSubquery(string $title): string
    {
        return '(SELECT id FROM project WHERE title = ' . $this->q($title) . ')';
    }

    /** @param list<array{email: string, role: string, joinedAt: string}> $members */
    private function membersJsonExpr(array $members): string
    {
        $objects = array_map(
            fn (array $m) => 'JSON_OBJECT(\'userId\', CAST(' . $this->userIdSubquery($m['email']) . ' AS CHAR), '
                . "'role', " . $this->q($m['role']) . ', '
                . "'joinedAt', " . $this->q($m['joinedAt']) . ')',
            $members
        );

        return 'JSON_ARRAY(' . implode(', ', $objects) . ')';
    }

    public function up(Schema $schema): void
    {
        foreach ($this->seedProjects() as $p) {
            $title = $this->q($p['title']);
            $clientId = $this->userIdSubquery($p['clientEmail']);
            $managerId = $p['managerEmail'] !== null ? $this->userIdSubquery($p['managerEmail']) : 'NULL';
            $members = $this->membersJsonExpr($p['members']);

            $this->addSql(
                'INSERT INTO project (title, description, status, priority, budget, progress, category, created_at, start_date, end_date, client_id, manager_id, members) '
                . 'SELECT '
                . $title . ', ' . $this->q($p['description']) . ', ' . $this->q($p['status']) . ', ' . $this->q($p['priority']) . ', '
                . (int) $p['budget'] . ', ' . (int) $p['progress'] . ', ' . $this->q($p['category']) . ', '
                . $this->q($p['createdAt']) . ', ' . $this->q($p['startDate']) . ', ' . $this->q($p['endDate']) . ', '
                . $clientId . ', ' . $managerId . ', ' . $members . ' '
                . 'FROM DUAL '
                . 'WHERE NOT EXISTS (SELECT 1 FROM project WHERE title = ' . $title . ')'
            );

            foreach ($p['members'] as $m) {
                $this->addSql(
                    'INSERT INTO project_member (project_id, user_id, role, joined_at) '
                    . 'SELECT ' . $this->projectIdSubquery($p['title']) . ', ' . $this->userIdSubquery($m['email']) . ', '
                    . $this->q($m['role']) . ', ' . $this->q($m['joinedAt']) . ' '
                    . 'FROM DUAL '
                    . 'WHERE NOT EXISTS (SELECT 1 FROM project_member WHERE project_id = ' . $this->projectIdSubquery($p['title'])
                    . ' AND user_id = ' . $this->userIdSubquery($m['email']) . ')'
                );
            }

            foreach ($p['events'] as $e) {
                $this->addSql(
                    'INSERT INTO calendar_event (project_id, title, date, type, description, created_by_id, created_at) '
                    . 'SELECT ' . $this->projectIdSubquery($p['title']) . ', ' . $this->q($e['title']) . ', ' . $this->q($e['date']) . ', '
                    . $this->q($e['type']) . ', ' . $this->q($e['description']) . ', NULL, ' . $this->q($e['date']) . ' '
                    . 'FROM DUAL '
                    . 'WHERE NOT EXISTS (SELECT 1 FROM calendar_event WHERE project_id = ' . $this->projectIdSubquery($p['title'])
                    . ' AND title = ' . $this->q($e['title']) . ')'
                );
            }

            // Simplified history: pending at creation, then one more step to the
            // current status if it moved past pending. Not a full replay of the
            // real workflow (validate -> assign -> in_progress -> ...).
            $this->addSql(
                'INSERT INTO project_status_log (project_id, from_status, to_status, actor_id, reason, created_at) '
                . 'SELECT ' . $this->projectIdSubquery($p['title']) . ', NULL, \'pending\', NULL, NULL, ' . $this->q($p['createdAt']) . ' '
                . 'FROM DUAL '
                . 'WHERE NOT EXISTS (SELECT 1 FROM project_status_log WHERE project_id = ' . $this->projectIdSubquery($p['title']) . ')'
            );
            if ($p['status'] !== 'pending') {
                $this->addSql(
                    'INSERT INTO project_status_log (project_id, from_status, to_status, actor_id, reason, created_at) '
                    . 'SELECT ' . $this->projectIdSubquery($p['title']) . ', \'pending\', ' . $this->q($p['status']) . ', NULL, '
                    . $this->q($p['rejectionReason']) . ', ' . $this->q($p['createdAt']) . ' '
                    . 'FROM DUAL '
                    . 'WHERE NOT EXISTS (SELECT 1 FROM project_status_log WHERE project_id = ' . $this->projectIdSubquery($p['title'])
                    . " AND to_status = " . $this->q($p['status']) . ')'
                );
            }
        }
    }

    public function down(Schema $schema): void
    {
        foreach ($this->seedProjects() as $p) {
            $projectId = $this->projectIdSubquery($p['title']);
            $this->addSql('DELETE FROM project_status_log WHERE project_id = ' . $projectId);
            $this->addSql('DELETE FROM calendar_event WHERE project_id = ' . $projectId);
            $this->addSql('DELETE FROM project_member WHERE project_id = ' . $projectId);
            $this->addSql('DELETE FROM project WHERE title = ' . $this->q($p['title']));
        }
    }
}
