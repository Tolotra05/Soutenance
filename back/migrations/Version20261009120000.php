<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Remédiation IDOR : ajoute une colonne `public_id` (UUID v4, unique, indexée)
 * sur chaque entité exposée via l'API (user, project, project_member,
 * calendar_event, project_status_log). L'id auto-incrémenté reste la PK
 * interne (FK, jointures, perf) ; `public_id` devient le seul identifiant
 * accepté/exposé par les routes et les réponses JSON (voir les contrôleurs).
 *
 * `Project::members` est un champ JSON dénormalisé qui stockait jusqu'ici
 * l'id interne de chaque utilisateur sous la clé `userId` -- directement
 * exposé tel quel dans les réponses de l'API. Cette migration réécrit aussi
 * ce JSON pour y stocker le `public_id` de chaque utilisateur à la place.
 */
final class Version20261009120000 extends AbstractMigration
{
    private const TABLES = ['user', 'project', 'project_member', 'calendar_event', 'project_status_log'];

    public function getDescription(): string
    {
        return 'Add unique public_id (UUID v4) to user/project/project_member/calendar_event/project_status_log, backfill it, and remap Project.members to reference it instead of the internal user id.';
    }

    private function generateUuidV4(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);

        $hex = bin2hex($data);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12)
        );
    }

    public function up(Schema $schema): void
    {
        foreach (self::TABLES as $table) {
            $this->addSql("ALTER TABLE {$table} ADD public_id CHAR(36) DEFAULT NULL");
        }

        // Backfill : une valeur par ligne existante, avant de pouvoir
        // contraindre la colonne en NOT NULL + UNIQUE.
        $userIdToPublicId = [];
        foreach (self::TABLES as $table) {
            $ids = $this->connection->fetchFirstColumn("SELECT id FROM {$table}");
            foreach ($ids as $id) {
                $publicId = $this->generateUuidV4();
                if ($table === 'user') {
                    $userIdToPublicId[(int) $id] = $publicId;
                }
                $this->addSql("UPDATE {$table} SET public_id = ? WHERE id = ?", [$publicId, $id]);
            }
        }

        // Project.members est un JSON dénormalisé qui stockait le userId
        // interne (exposé tel quel par l'API) -- on le réécrit pour y stocker
        // le public_id de chaque utilisateur à la place.
        $projects = $this->connection->fetchAllAssociative('SELECT id, members FROM project WHERE members IS NOT NULL');
        foreach ($projects as $row) {
            $members = json_decode((string) $row['members'], true);
            if (!is_array($members)) {
                continue;
            }

            $changed = false;
            foreach ($members as &$member) {
                $internalUserId = isset($member['userId']) ? (int) $member['userId'] : null;
                if ($internalUserId !== null && isset($userIdToPublicId[$internalUserId])) {
                    $member['userId'] = $userIdToPublicId[$internalUserId];
                    $changed = true;
                }
            }
            unset($member);

            if ($changed) {
                $this->addSql(
                    'UPDATE project SET members = ? WHERE id = ?',
                    [json_encode($members), $row['id']]
                );
            }
        }

        foreach (self::TABLES as $table) {
            $this->addSql("ALTER TABLE {$table} MODIFY public_id CHAR(36) NOT NULL");
            $this->addSql("ALTER TABLE {$table} ADD UNIQUE INDEX UNIQ_{$table}_public_id (public_id)");
        }
    }

    public function down(Schema $schema): void
    {
        foreach (self::TABLES as $table) {
            $this->addSql("ALTER TABLE {$table} DROP INDEX UNIQ_{$table}_public_id");
            $this->addSql("ALTER TABLE {$table} DROP COLUMN public_id");
        }

        // Le JSON members a été réécrit en place (userId interne -> public_id) ;
        // sans conserver une copie de l'ancien mapping, le down() ne peut pas
        // revenir sur ce remap spécifique. Les colonnes public_id sont
        // toutefois bien supprimées.
    }
}
