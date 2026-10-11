<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Creates the `user` and `refresh_tokens` tables.
 *
 * These were missing from the migration history even though `Project`,
 * `ProjectMember`, `ProjectStatusLog` and `CalendarEvent` (added by later
 * migrations) all have foreign keys pointing at `user`, and the JWT refresh
 * flow (GesdinetJWTRefreshTokenBundle) requires `refresh_tokens`. Must run
 * before Version20260916185648, which adds the first FK to `user`.
 */
final class Version20260916185600 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create the user and refresh_tokens tables.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, avatar_url VARCHAR(255) NOT NULL, phone VARCHAR(30) DEFAULT NULL, company VARCHAR(255) DEFAULT NULL, address VARCHAR(255) DEFAULT NULL, bio LONGTEXT DEFAULT NULL, member_specialty VARCHAR(40) DEFAULT NULL, created_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_IDENTIFIER_EMAIL (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT NOT NULL, refresh_token VARCHAR(255) NOT NULL, username VARCHAR(255) NOT NULL, valid DATETIME NOT NULL, UNIQUE INDEX UNIQ_9BACE7E1C74F2195 (refresh_token), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('DROP TABLE user');
    }
}
