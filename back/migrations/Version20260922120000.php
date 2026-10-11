<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Seeds the frontend's demo dataset (front/lib/mock-data.ts -> mockUsers) into
 * the real `user` table, so the demo accounts shown on the login page ("Comptes
 * de démonstration") also exist in Symfony and authenticate for real, not only
 * through the frontend's local mock fallback.
 *
 * Employee management (create/edit) is not wired to the backend yet — this is
 * a one-off seed, not a substitute for that.
 */
final class Version20260922120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "Seed the frontend's demo users (mock-data.ts) into the user table.";
    }

    /**
     * @return list<array{email: string, name: string, roles: string, password: string, avatarUrl: string, phone: ?string, company: ?string, address: ?string, bio: ?string, memberSpecialty: ?string, createdAt: string}>
     */
    private function seedUsers(): array
    {
        // password_hash(..., PASSWORD_BCRYPT) for each distinct mock password
        $admin123 = '$2y$10$hEFN3DOSMy/.flAujQ2xv.2g.4cA6hDASVJDNAPaTJE6kC4KovjcG';
        $manager123 = '$2y$10$I9nv31TkX11kRQG.oiII6ON6II0gtZjmeF7/GTKMQVL18b1d64qUi';
        $proflow123 = '$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK';
        $employe123 = '$2y$10$Mef18cWCrfUPFzDqYfnNuOxGMOoSTgwBhaJ16P1S4NZ5/LGL5cFAC';
        $client123 = '$2y$10$VRjbZEPIc3HbO0r1FjGfKu8yJutm412n67QkQnjcWrqO2EsumHwD6';

        return [
            ['email' => 'sophie.laurent@proflow.io', 'name' => 'Sophie Laurent', 'roles' => '["ROLE_ADMIN"]', 'password' => $admin123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie&backgroundColor=b6e3f4', 'phone' => '+33 6 12 34 56 78', 'company' => null, 'address' => '12 Rue de la Paix, 75002 Paris', 'bio' => "Directrice générale de ProFlow. Passionnée par la gestion de projet et l'innovation digitale.", 'memberSpecialty' => null, 'createdAt' => '2026-01-15 08:00:00'],
            ['email' => 'karim.benali@proflow.io', 'name' => 'Karim Benali', 'roles' => '["ROLE_CHEF_DE_PROJET"]', 'password' => $manager123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim&backgroundColor=c0aede', 'phone' => '+33 6 23 45 67 89', 'company' => null, 'address' => '45 Avenue Victor Hugo, 69006 Lyon', 'bio' => "Chef de projet senior avec 8 ans d'expérience en gestion de projets web et mobile.", 'memberSpecialty' => null, 'createdAt' => '2026-02-01 08:00:00'],
            ['email' => 'elodie.martin@proflow.io', 'name' => 'Élodie Martin', 'roles' => '["ROLE_CHEF_DE_PROJET"]', 'password' => $proflow123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elodie&backgroundColor=d1f4e0', 'phone' => '+33 6 34 56 78 90', 'company' => null, 'address' => '8 Rue des Lilas, 33000 Bordeaux', 'bio' => 'Chef de projet spécialisée en refonte UI/UX et design system.', 'memberSpecialty' => null, 'createdAt' => '2026-02-10 08:00:00'],
            ['email' => 'thomas.dubois@proflow.io', 'name' => 'Thomas Dubois', 'roles' => '[]', 'password' => $employe123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas&backgroundColor=ffd5dc', 'phone' => '+33 6 45 67 89 01', 'company' => null, 'address' => '23 Rue du Commerce, 75015 Paris', 'bio' => 'Développeur React/Next.js avec une passion pour les interfaces performantes et accessibles.', 'memberSpecialty' => 'Frontend', 'createdAt' => '2026-03-01 08:00:00'],
            ['email' => 'lina.chen@proflow.io', 'name' => 'Lina Chen', 'roles' => '[]', 'password' => $proflow123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lina&backgroundColor=c4f0d0', 'phone' => '+33 6 56 78 90 12', 'company' => null, 'address' => '15 Rue du Faubourg, 31000 Toulouse', 'bio' => 'Designer UI/UX créative, spécialisée dans la création de design systems et maquettes haute fidélité.', 'memberSpecialty' => 'Designer', 'createdAt' => '2026-03-05 08:00:00'],
            ['email' => 'marco.rossi@proflow.io', 'name' => 'Marco Rossi', 'roles' => '[]', 'password' => $proflow123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marco&backgroundColor=ffdfbf', 'phone' => '+33 6 67 89 01 23', 'company' => null, 'address' => '7 Boulevard Gambetta, 13001 Marseille', 'bio' => 'Développeur backend expert Laravel/PHP et architecte de bases de données MySQL.', 'memberSpecialty' => 'Backend', 'createdAt' => '2026-03-10 08:00:00'],
            ['email' => 'aicha.diallo@proflow.io', 'name' => 'Aïcha Diallo', 'roles' => '[]', 'password' => $proflow123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aicha&backgroundColor=b6e3f4', 'phone' => '+33 6 78 90 12 34', 'company' => null, 'address' => '31 Rue de Strasbourg, 44000 Nantes', 'bio' => "Chef de projet junior motivée, spécialisée dans l'analyse des besoins et la coordination d'équipe.", 'memberSpecialty' => 'Chef de projet junior', 'createdAt' => '2026-03-15 08:00:00'],
            ['email' => 'jakub.nowak@proflow.io', 'name' => 'Jakub Nowak', 'roles' => '[]', 'password' => $proflow123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jakub&backgroundColor=c0aede', 'phone' => '+33 6 89 01 23 45', 'company' => null, 'address' => '42 Rue de la République, 67000 Strasbourg', 'bio' => 'Ingénieur DevOps spécialisé dans les pipelines CI/CD et le déploiement cloud.', 'memberSpecialty' => 'DevOps', 'createdAt' => '2026-03-20 08:00:00'],
            ['email' => 'camille@techstart.fr', 'name' => 'Camille Rousseau', 'roles' => '[]', 'password' => $client123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Camille&backgroundColor=ffd5dc', 'phone' => '+33 7 11 22 33 44', 'company' => 'TechStart SAS', 'address' => '56 Avenue des Champs-Élysées, 75008 Paris', 'bio' => 'Fondatrice de TechStart, startup spécialisée dans la vente en ligne de technologies innovantes.', 'memberSpecialty' => null, 'createdAt' => '2026-04-01 08:00:00'],
            ['email' => 'olivier@ecoshop.com', 'name' => 'Olivier Lefèvre', 'roles' => '[]', 'password' => $proflow123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivier&backgroundColor=d1f4e0', 'phone' => '+33 7 22 33 44 55', 'company' => 'EcoShop SARL', 'address' => '18 Rue du Marché, 69002 Lyon', 'bio' => "Directeur d'EcoShop, magasin en ligne de produits écologiques et durables.", 'memberSpecialty' => null, 'createdAt' => '2026-04-05 08:00:00'],
            ['email' => 'nadia@urbanvibes.io', 'name' => 'Nadia Benali', 'roles' => '[]', 'password' => $proflow123, 'avatarUrl' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia&backgroundColor=b6e3f4', 'phone' => '+33 7 33 44 55 66', 'company' => 'UrbanVibes', 'address' => '29 Rue de la République, 13001 Marseille', 'bio' => 'Gérante d\'UrbanVibes, marque de sport et bien-être urbain.', 'memberSpecialty' => null, 'createdAt' => '2026-04-10 08:00:00'],
        ];
    }

    public function up(Schema $schema): void
    {
        foreach ($this->seedUsers() as $u) {
            $email = $this->connection->quote($u['email']);
            $name = $this->connection->quote($u['name']);
            $roles = $this->connection->quote($u['roles']);
            $password = $this->connection->quote($u['password']);
            $avatarUrl = $this->connection->quote($u['avatarUrl']);
            $phone = $u['phone'] !== null ? $this->connection->quote($u['phone']) : 'NULL';
            $company = $u['company'] !== null ? $this->connection->quote($u['company']) : 'NULL';
            $address = $u['address'] !== null ? $this->connection->quote($u['address']) : 'NULL';
            $bio = $u['bio'] !== null ? $this->connection->quote($u['bio']) : 'NULL';
            $memberSpecialty = $u['memberSpecialty'] !== null ? $this->connection->quote($u['memberSpecialty']) : 'NULL';
            $createdAt = $this->connection->quote($u['createdAt']);

            $this->addSql(
                'INSERT INTO user (email, roles, password, name, avatar_url, phone, company, address, bio, member_specialty, created_at) '
                . "SELECT $email, $roles, $password, $name, $avatarUrl, $phone, $company, $address, $bio, $memberSpecialty, $createdAt "
                . 'FROM DUAL '
                . "WHERE NOT EXISTS (SELECT 1 FROM user WHERE email = $email)"
            );
        }
    }

    public function down(Schema $schema): void
    {
        foreach ($this->seedUsers() as $u) {
            $email = $this->connection->quote($u['email']);
            $this->addSql("DELETE FROM user WHERE email = $email");
        }
    }
}
