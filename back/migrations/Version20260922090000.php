<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Lot 1 — backend "Projets" : équipe projet relationnelle (ProjectMember),
 * agenda / rendez-vous client (CalendarEvent), et historique du workflow
 * soumission -> validation/rejet -> assignation (ProjectStatusLog).
 *
 * N'altère aucune table existante : uniquement 3 nouvelles tables.
 */
final class Version20260922090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute project_member, calendar_event et project_status_log pour le workflow Projets (Lot 1)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE project_member (id INT AUTO_INCREMENT NOT NULL, project_id INT NOT NULL, user_id INT NOT NULL, role VARCHAR(20) NOT NULL, joined_at DATETIME NOT NULL, INDEX IDX_D80A6D0E166D1F9C (project_id), INDEX IDX_D80A6D0EA76ED395 (user_id), UNIQUE INDEX UNIQ_PROJECT_USER (project_id, user_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE project_member ADD CONSTRAINT FK_D80A6D0E166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE project_member ADD CONSTRAINT FK_D80A6D0EA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');

        $this->addSql('CREATE TABLE calendar_event (id INT AUTO_INCREMENT NOT NULL, project_id INT NOT NULL, created_by_id INT DEFAULT NULL, title VARCHAR(255) NOT NULL, date DATETIME NOT NULL, type VARCHAR(30) NOT NULL, description LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, INDEX IDX_9EDA0BB5166D1F9C (project_id), INDEX IDX_9EDA0BB5B03A8386 (created_by_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE calendar_event ADD CONSTRAINT FK_9EDA0BB5166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE calendar_event ADD CONSTRAINT FK_9EDA0BB5B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id) ON DELETE SET NULL');

        $this->addSql('CREATE TABLE project_status_log (id INT AUTO_INCREMENT NOT NULL, project_id INT NOT NULL, actor_id INT DEFAULT NULL, from_status VARCHAR(20) DEFAULT NULL, to_status VARCHAR(20) NOT NULL, reason LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, INDEX IDX_C1CE7EA4166D1F9C (project_id), INDEX IDX_C1CE7EA410DAF24A (actor_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE project_status_log ADD CONSTRAINT FK_C1CE7EA4166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE project_status_log ADD CONSTRAINT FK_C1CE7EA410DAF24A FOREIGN KEY (actor_id) REFERENCES user (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project_member DROP FOREIGN KEY FK_D80A6D0E166D1F9C');
        $this->addSql('ALTER TABLE project_member DROP FOREIGN KEY FK_D80A6D0EA76ED395');
        $this->addSql('DROP TABLE project_member');

        $this->addSql('ALTER TABLE calendar_event DROP FOREIGN KEY FK_9EDA0BB5166D1F9C');
        $this->addSql('ALTER TABLE calendar_event DROP FOREIGN KEY FK_9EDA0BB5B03A8386');
        $this->addSql('DROP TABLE calendar_event');

        $this->addSql('ALTER TABLE project_status_log DROP FOREIGN KEY FK_C1CE7EA4166D1F9C');
        $this->addSql('ALTER TABLE project_status_log DROP FOREIGN KEY FK_C1CE7EA410DAF24A');
        $this->addSql('DROP TABLE project_status_log');
    }
}
