<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Project.statusChangedAt was a field the front has always expected
 * (lib/status.ts's isProjectArchived() hides completed/rejected projects
 * from the main list 24h after they reach that status) but the backend
 * never persisted or returned it. Since it was always null for any
 * API-sourced project, isProjectArchived() treated EVERY terminal project
 * as archived immediately -- not just after 24h -- hiding all of them from
 * the /projects page regardless of the status filter, no matter how
 * recently they'd actually completed.
 *
 * Adds the column (Project::setStatus() now bumps it automatically on every
 * future change, see the entity) and backfills existing rows from the most
 * recent matching project_status_log entry, falling back to created_at if
 * there's no log (shouldn't happen, but a project's status is never null).
 */
final class Version20261010100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Project.statusChangedAt, backfilled from project_status_log, so terminal projects are only hidden 24h after they actually became terminal.';
    }

    public function up(Schema $schema): void
    {
        // executeStatement(), not addSql(): the backfill below needs the
        // column to actually exist within this same up() call, but addSql()
        // only queues its statement to run after up() returns.
        $this->connection->executeStatement('ALTER TABLE project ADD status_changed_at DATETIME DEFAULT NULL');

        $projects = $this->connection->fetchAllAssociative('SELECT id, status, created_at FROM project');
        foreach ($projects as $p) {
            $lastLogAt = $this->connection->fetchOne(
                'SELECT created_at FROM project_status_log WHERE project_id = ? AND to_status = ? ORDER BY created_at DESC LIMIT 1',
                [$p['id'], $p['status']]
            );
            $this->connection->executeStatement(
                'UPDATE project SET status_changed_at = ? WHERE id = ?',
                [$lastLogAt ?: $p['created_at'], $p['id']]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project DROP COLUMN status_changed_at');
    }
}
