<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Audit de couverture API (front <-> back) : crée les tables pour toutes les
 * fonctionnalités qui n'étaient persistées qu'en state React local --
 * sous-tâches, commentaires, pièces jointes, demandes de modification,
 * demandes de tâche client, requêtes équipe<->client, notifications -- et
 * ajoute les colonnes de compte (accountStatus, code de réinitialisation)
 * sur `user`. SQL vérifié via `doctrine:schema:update --dump-sql`.
 */
final class Version20261009140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Subtask/SubtaskComment/Attachment/ModificationRequest/TaskRequest/Requete/Notification tables and User account columns.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE subtask (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT NOT NULL, status VARCHAR(20) NOT NULL, priority VARCHAR(20) NOT NULL, start_date DATETIME NOT NULL, due_date DATETIME NOT NULL, progress INT NOT NULL, is_active TINYINT NOT NULL, work_sessions JSON DEFAULT NULL, created_at DATETIME NOT NULL, public_id VARCHAR(36) NOT NULL, project_id INT NOT NULL, assigned_to_id INT DEFAULT NULL, depends_on_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_8BCBA9AEB5B48B91 (public_id), INDEX IDX_8BCBA9AE166D1F9C (project_id), INDEX IDX_8BCBA9AEF4BD7827 (assigned_to_id), INDEX IDX_8BCBA9AE1E088F8 (depends_on_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');

        $this->addSql('CREATE TABLE subtask_comment (id INT AUTO_INCREMENT NOT NULL, content LONGTEXT NOT NULL, created_at DATETIME NOT NULL, public_id VARCHAR(36) NOT NULL, subtask_id INT NOT NULL, author_id INT NOT NULL, UNIQUE INDEX UNIQ_30D1BFE6B5B48B91 (public_id), INDEX IDX_30D1BFE6C6D4A949 (subtask_id), INDEX IDX_30D1BFE6F675F31B (author_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');

        $this->addSql('CREATE TABLE attachment (id INT AUTO_INCREMENT NOT NULL, file_name VARCHAR(255) NOT NULL, file_type VARCHAR(120) NOT NULL, url VARCHAR(500) NOT NULL, uploaded_at DATETIME NOT NULL, attachment_type VARCHAR(30) DEFAULT NULL, validation_status VARCHAR(20) DEFAULT NULL, validated_at DATETIME DEFAULT NULL, public_id VARCHAR(36) NOT NULL, project_id INT DEFAULT NULL, subtask_id INT DEFAULT NULL, uploaded_by_id INT NOT NULL, validated_by_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_795FD9BBB5B48B91 (public_id), INDEX IDX_795FD9BB166D1F9C (project_id), INDEX IDX_795FD9BBC6D4A949 (subtask_id), INDEX IDX_795FD9BBA2B28FE8 (uploaded_by_id), INDEX IDX_795FD9BBC69DE5E5 (validated_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');

        $this->addSql('CREATE TABLE modification_request (id INT AUTO_INCREMENT NOT NULL, target VARCHAR(20) NOT NULL, field VARCHAR(60) NOT NULL, old_value LONGTEXT NOT NULL, new_value LONGTEXT NOT NULL, reason LONGTEXT NOT NULL, status VARCHAR(20) NOT NULL, review_note LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, reviewed_at DATETIME DEFAULT NULL, team_review JSON DEFAULT NULL, client_review JSON DEFAULT NULL, public_id VARCHAR(36) NOT NULL, project_id INT NOT NULL, subtask_id INT DEFAULT NULL, requested_by_id INT NOT NULL, reviewed_by_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_AF8314FAB5B48B91 (public_id), INDEX IDX_AF8314FA166D1F9C (project_id), INDEX IDX_AF8314FAC6D4A949 (subtask_id), INDEX IDX_AF8314FA4DA1E751 (requested_by_id), INDEX IDX_AF8314FAFC6B21F1 (reviewed_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');

        $this->addSql('CREATE TABLE task_request (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT NOT NULL, priority VARCHAR(20) NOT NULL, besoin_date DATETIME DEFAULT NULL, photo_url VARCHAR(500) DEFAULT NULL, photo_name VARCHAR(255) DEFAULT NULL, status VARCHAR(20) NOT NULL, reviewed_at DATETIME DEFAULT NULL, review_note LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, public_id VARCHAR(36) NOT NULL, project_id INT NOT NULL, client_id INT NOT NULL, reviewed_by_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_2476A575B5B48B91 (public_id), INDEX IDX_2476A575166D1F9C (project_id), INDEX IDX_2476A57519EB6921 (client_id), INDEX IDX_2476A575FC6B21F1 (reviewed_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');

        $this->addSql('CREATE TABLE requete (id INT AUTO_INCREMENT NOT NULL, content LONGTEXT NOT NULL, status VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, responded_at DATETIME DEFAULT NULL, response JSON DEFAULT NULL, public_id VARCHAR(36) NOT NULL, project_id INT NOT NULL, subtask_id INT DEFAULT NULL, created_by_id INT NOT NULL, UNIQUE INDEX UNIQ_1E6639AAB5B48B91 (public_id), INDEX IDX_1E6639AA166D1F9C (project_id), INDEX IDX_1E6639AAC6D4A949 (subtask_id), INDEX IDX_1E6639AAB03A8386 (created_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');

        $this->addSql('CREATE TABLE notification (id INT AUTO_INCREMENT NOT NULL, type VARCHAR(40) NOT NULL, title VARCHAR(255) NOT NULL, message LONGTEXT NOT NULL, is_read TINYINT NOT NULL, created_at DATETIME NOT NULL, public_id VARCHAR(36) NOT NULL, recipient_id INT NOT NULL, project_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_BF5476CAB5B48B91 (public_id), INDEX IDX_BF5476CAE92F8F78 (recipient_id), INDEX IDX_BF5476CA166D1F9C (project_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');

        $this->addSql('ALTER TABLE subtask ADD CONSTRAINT FK_8BCBA9AE166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subtask ADD CONSTRAINT FK_8BCBA9AEF4BD7827 FOREIGN KEY (assigned_to_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE subtask ADD CONSTRAINT FK_8BCBA9AE1E088F8 FOREIGN KEY (depends_on_id) REFERENCES subtask (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE subtask_comment ADD CONSTRAINT FK_30D1BFE6C6D4A949 FOREIGN KEY (subtask_id) REFERENCES subtask (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subtask_comment ADD CONSTRAINT FK_30D1BFE6F675F31B FOREIGN KEY (author_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE attachment ADD CONSTRAINT FK_795FD9BB166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE attachment ADD CONSTRAINT FK_795FD9BBC6D4A949 FOREIGN KEY (subtask_id) REFERENCES subtask (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE attachment ADD CONSTRAINT FK_795FD9BBA2B28FE8 FOREIGN KEY (uploaded_by_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE attachment ADD CONSTRAINT FK_795FD9BBC69DE5E5 FOREIGN KEY (validated_by_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE modification_request ADD CONSTRAINT FK_AF8314FA166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE modification_request ADD CONSTRAINT FK_AF8314FAC6D4A949 FOREIGN KEY (subtask_id) REFERENCES subtask (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE modification_request ADD CONSTRAINT FK_AF8314FA4DA1E751 FOREIGN KEY (requested_by_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE modification_request ADD CONSTRAINT FK_AF8314FAFC6B21F1 FOREIGN KEY (reviewed_by_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE task_request ADD CONSTRAINT FK_2476A575166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE task_request ADD CONSTRAINT FK_2476A57519EB6921 FOREIGN KEY (client_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE task_request ADD CONSTRAINT FK_2476A575FC6B21F1 FOREIGN KEY (reviewed_by_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE requete ADD CONSTRAINT FK_1E6639AA166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE requete ADD CONSTRAINT FK_1E6639AAC6D4A949 FOREIGN KEY (subtask_id) REFERENCES subtask (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE requete ADD CONSTRAINT FK_1E6639AAB03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CAE92F8F78 FOREIGN KEY (recipient_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CA166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE');

        $this->addSql("ALTER TABLE user ADD account_status VARCHAR(20) NOT NULL DEFAULT 'active', ADD reset_code VARCHAR(6) DEFAULT NULL, ADD reset_code_expires_at DATETIME DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP account_status, DROP reset_code, DROP reset_code_expires_at');
        $this->addSql('DROP TABLE notification');
        $this->addSql('DROP TABLE requete');
        $this->addSql('DROP TABLE task_request');
        $this->addSql('DROP TABLE modification_request');
        $this->addSql('DROP TABLE attachment');
        $this->addSql('DROP TABLE subtask_comment');
        $this->addSql('DROP TABLE subtask');
    }
}
