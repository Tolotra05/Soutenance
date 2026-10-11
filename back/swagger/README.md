# Documentation API (Swagger / OpenAPI)

La documentation de l'API Symfony `TaskManager-back` est générée automatiquement à
partir des attributs PHP (`#[OA\...]`, namespace `OpenApi\Attributes`) posés sur les
contrôleurs, via [NelmioApiDocBundle](https://github.com/nelmio/NelmioApiDocBundle)
(qui s'appuie lui-même sur [zircote/swagger-php](https://github.com/zircote/swagger-php)).

Deux routes deux/authentification (`/api/login_check`, `/api/token/refresh`) n'ont pas
de contrôleur PHP (elles sont interceptées directement par les firewalls Lexik JWT /
Gesdinet) : elles sont donc documentées à la main dans
[`config/packages/nelmio_api_doc.yaml`](../config/packages/nelmio_api_doc.yaml)
(clé `nelmio_api_doc.documentation.paths`), de même que les schémas réutilisables
(`User`, `Project`, etc.) sous `nelmio_api_doc.documentation.components.schemas`.

## Contenu de ce dossier

- **`openapi.json`** : schéma OpenAPI 3.0 généré (à régénérer après toute modification
  des routes — ne pas éditer ce fichier à la main, il est écrasé à chaque génération).
- **`README.md`** : ce fichier.

## Installation (déjà faite dans ce projet)

Les paquets suivants ont été ajoutés via Composer :

```bash
composer require nelmio/api-doc-bundle symfony/twig-bundle symfony/asset
```

- `nelmio/api-doc-bundle` génère le schéma OpenAPI et sert Swagger UI.
- `symfony/twig-bundle` et `symfony/asset` sont nécessaires pour que la page
  Swagger UI (HTML) puisse être rendue — sans eux, seul `/api/doc.json` fonctionne.

Fichiers de configuration associés :

- [`config/bundles.php`](../config/bundles.php) : enregistrement de
  `NelmioApiDocBundle` et `TwigBundle`.
- [`config/packages/nelmio_api_doc.yaml`](../config/packages/nelmio_api_doc.yaml) :
  titre/description de l'API, schéma de sécurité JWT (`bearerAuth`), schémas de
  données réutilisables, et documentation manuelle des routes d'authentification.
- [`config/routes/nelmio_api_doc.yaml`](../config/routes/nelmio_api_doc.yaml) :
  expose `GET /api/doc` (Swagger UI) et `GET /api/doc.json` (schéma brut).
- [`config/packages/security.yaml`](../config/packages/security.yaml) : ajout de
  `{ path: ^/api/doc, roles: PUBLIC_ACCESS }` pour que la documentation reste
  consultable sans JWT.

## Lancer Swagger UI

```bash
cd TaskManager-back
composer install
symfony server:start --port=8000
# ou : php -S 127.0.0.1:8000 -t public public/index.php
```

Puis ouvrir :

- **http://127.0.0.1:8000/api/doc** — interface Swagger UI interactive
  (bouton *Authorize* pour coller un JWT `Bearer <token>` obtenu via
  `POST /api/login_check`).
- **http://127.0.0.1:8000/api/doc.json** — le schéma OpenAPI brut (ce qui est
  copié dans `swagger/openapi.json`).

> Avec le serveur `php -S` intégré (pas `symfony server:start`), certains
> environnements renvoient un faux 404 sur les URLs se terminant par `.json`
> (le serveur PHP les traite comme des fichiers statiques avant de passer la
> main au routeur). Utiliser `symfony server:start`, un vrai vhost Apache/Nginx,
> ou simplement le bouton *Authorize*/les requêtes depuis Swagger UI lui-même
> (servi sur `/api/doc`, sans extension) pour éviter le problème.

## Régénérer `openapi.json`

À chaque ajout/modification de route ou d'attribut `#[OA\...]` :

```bash
cd TaskManager-back
php bin/console nelmio:apidoc:dump --format=json > swagger/openapi.json
```

Options utiles de la commande `nelmio:apidoc:dump` :

- `--format=yaml` pour un export YAML.
- `--server-url=http://127.0.0.1:8000` pour figer l'URL de serveur dans le schéma.
- `--no-pretty` pour un JSON compact (une seule ligne).

## Documenter un nouvel endpoint

1. Ajouter la route Symfony (`#[Route(...)]`) dans le contrôleur, comme d'habitude.
2. Ajouter au-dessus de la méthode les attributs OpenAPI nécessaires :
   - `#[OA\Parameter(...)]` pour chaque paramètre de chemin/query,
   - `#[OA\RequestBody(...)]` si l'action lit un corps JSON,
   - `#[OA\Response(...)]` pour chaque code HTTP renvoyé (succès et erreurs),
   - `#[OA\Tag(name: '...')]` au niveau de la classe pour grouper les routes
     dans Swagger UI (déjà fait : `Projects`, `Project workflow`, `Project team`,
     `Calendar events`).
3. Si l'endpoint renvoie/consomme une forme de données déjà utilisée ailleurs
   (ex. un utilisateur, un projet), référencer le schéma existant avec
   `ref: '#/components/schemas/NomDuSchema'` plutôt que de le redéclarer.
4. Si une nouvelle forme de données réutilisable apparaît, l'ajouter sous
   `nelmio_api_doc.documentation.components.schemas` dans
   `config/packages/nelmio_api_doc.yaml` (les attributs `#[OA\Schema]` posés sur
   une classe qui n'est le contrôleur d'aucune route ne sont **pas** lus par
   NelmioApiDocBundle 5 : seules les classes réellement utilisées comme
   contrôleur d'une route Symfony sont réflechies).
5. Régénérer `swagger/openapi.json` (commande ci-dessus) et vérifier le rendu
   sur `/api/doc`.

## Sécurité (JWT)

Toutes les routes `/api/*` sauf `/api/doc*`, `/api/login_check` et
`/api/token/refresh` exigent un JWT (`Authorization: Bearer <token>`), obtenu via :

```
POST /api/login_check   { "email": "...", "password": "..." }  -> { "token": "..." }
POST /api/token/refresh { "refresh_token": "..." }              -> { "token": "...", "refresh_token": "..." }
```

Dans Swagger UI, cliquer sur **Authorize** et saisir `Bearer <token>`.
