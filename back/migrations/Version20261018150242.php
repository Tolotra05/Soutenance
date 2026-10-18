<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Notification.relatedUser: the user a notification is *about* (e.g. the new
 * pending account behind an "account_created" notification), as opposed to
 * its recipient. UserController::review() uses it to mark every admin's copy
 * as read once one admin has approved/rejected the account, so the alert
 * doesn't linger for the others.
 *
 * Nullable + ON DELETE CASCADE: existing notifications aren't about a user,
 * and a notification about a deleted account has nothing left to point to.
 */
final class Version20261018150242 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Notification.relatedUser (user a notification is about), used to clear account_created alerts for all admins once the account is reviewed.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE notification ADD related_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CA98771930 FOREIGN KEY (related_user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('CREATE INDEX IDX_BF5476CA98771930 ON notification (related_user_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE notification DROP FOREIGN KEY FK_BF5476CA98771930');
        $this->addSql('DROP INDEX IDX_BF5476CA98771930 ON notification');
        $this->addSql('ALTER TABLE notification DROP related_user_id');
    }
}
