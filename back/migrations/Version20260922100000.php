<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Adaptation du module Projets au front mapp :
 * ajoute les dates de début et de fin du projet.
 *
 * Les colonnes sont nullable afin de préserver les projets existants.
 */
final class Version20260922100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute les dates de début et de fin au projet';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project ADD start_date DATETIME DEFAULT NULL, ADD end_date DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE project DROP start_date, DROP end_date');
    }
}
