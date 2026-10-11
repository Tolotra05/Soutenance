<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Seeds a default full-access (ROLE_ADMIN) account so a fresh environment
 * always has at least one usable login right after `doctrine:migrations:migrate`.
 *
 * Default credentials (change the password on first login in any shared env):
 *   email:    admin@taskmanager.local
 *   password: ChangeMe!2026
 */
final class Version20260922110000 extends AbstractMigration
{
    private const EMAIL = 'admin@taskmanager.local';

    // password_hash('ChangeMe!2026', PASSWORD_BCRYPT)
    private const PASSWORD_HASH = '$2y$10$AhuQQxC6JTNXel3OTxG7QuwVg8VLKhSRP.SS0bCp8wU4WgVnKuXWW';

    public function getDescription(): string
    {
        return 'Seed a default admin (full access) user.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            'INSERT INTO user (email, roles, password, name, avatar_url, phone, company, address, bio, member_specialty, created_at) '
            . "SELECT '" . self::EMAIL . "', '[\"ROLE_ADMIN\"]', '" . self::PASSWORD_HASH . "', 'Administrateur', 'https://ui-avatars.com/api/?name=Admin', NULL, NULL, NULL, NULL, NULL, NOW() "
            . 'FROM DUAL '
            . "WHERE NOT EXISTS (SELECT 1 FROM user WHERE email = '" . self::EMAIL . "')"
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DELETE FROM user WHERE email = '" . self::EMAIL . "'");
    }
}
