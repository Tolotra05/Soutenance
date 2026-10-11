<?php

namespace App\Entity\Trait;

use Doctrine\ORM\Mapping as ORM;

/**
 * Identifiant public opaque (UUID v4), utilisé dans toutes les routes API et
 * réponses JSON à la place de l'id auto-incrémenté interne. L'id reste la PK
 * (FK, jointures, perf) mais n'est plus jamais exposé ni accepté en entrée.
 *
 * Choix UUID v4 plutôt que Hashids : aucun secret à gérer/protéger (un
 * HASHIDS_SALT qui fuiterait permettrait de retrouver l'id interne de
 * n'importe quelle ressource à partir de son slug, et ne doit jamais changer
 * sous peine de casser toutes les URLs existantes). Le coût -- 36 caractères
 * dans l'URL contre ~6-8 pour Hashids -- est jugé négligeable ici.
 */
trait PublicIdTrait
{
    #[ORM\Column(name: 'public_id', type: 'string', length: 36, unique: true)]
    private ?string $publicId = null;

    public function getPublicId(): string
    {
        if ($this->publicId === null) {
            $this->publicId = self::generatePublicId();
        }

        return $this->publicId;
    }

    /**
     * UUID v4 généré nativement (random_bytes + formatage RFC 4122) : pas de
     * nouvelle dépendance Composer (symfony/uid) pour ~15 lignes de code.
     */
    public static function generatePublicId(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant RFC 4122

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
}
