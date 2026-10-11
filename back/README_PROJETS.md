# Backend Symfony — Module Projets

Ce dossier est le backend Symfony extrait de `TaskManager-lot1-lot2-clean.zip` pour être ajouté à `mapp.zip`.

## Périmètre

Uniquement le module **Projets** :
- `Project` : informations, titre, description, statut, priorité, budget, progression, dates, client/chef de projet.
- `ProjectMember` : utilisateurs associés, rôle, date de participation.
- `CalendarEvent` : événements, réunions, échéances et dates importantes.
- `ProjectStatusLog` : historique des changements de statut, ancienne/nouvelle valeur, acteur, date et motif.

Les autres modules métier du backend source (tâches, notifications, administration, etc.) ne sont pas copiés.

### Dépendance technique

`User` et `UserRepository` sont conservés uniquement comme dépendance nécessaire aux relations projet et à l'authentification Symfony/JWT. Aucun contrôleur métier utilisateur n'est inclus ici.

## Installation

Depuis `TaskManager/TaskManager-back` :

```bash
composer install
php bin/console lexik:jwt:generate-keypair
php bin/console doctrine:migrations:migrate --no-interaction
php -S 127.0.0.1:8000 -t public public/index.php
```

Le backend suppose que la table `user` existe déjà dans la base TaskManager, puisque les projets sont liés aux utilisateurs.

## API

> Tous les `{id}` ci-dessous sont des **identifiants publics (UUID v4)**,
> jamais l'id interne auto-incrémenté (voir la migration `publicId` et
> `src/Entity/Trait/PublicIdTrait.php`). Toutes les routes `/api/...` sauf
> `login_check`, `token/refresh`, `register`, `forgot-password` et
> `reset-password` nécessitent une authentification JWT.

### Auth (publiques)
- `POST /api/login_check`, `POST /api/token/refresh`
- `POST /api/register`, `POST /api/forgot-password`, `POST /api/reset-password`

### Utilisateurs
- `PATCH /api/users/me` — son propre profil
- `PATCH /api/users/{id}` — admin uniquement
- `PATCH /api/users/{id}/review` — validation/refus d'un compte en attente (admin)
- `POST /api/employees` — création d'un compte employé (admin)

### Projets (cycle de vie)
- `GET /api/projects`, `POST /api/projects`
- `PATCH /api/projects/{id}/status`
- `POST /api/projects/{id}/validate`, `/reject`, `/assign`
- `GET /api/projects/{id}/workflow-history`
- `POST`/`DELETE /api/projects/{id}/members[/{userId}]` (champ JSON `members`)
- `GET`/`POST`/`DELETE /api/projects/{id}/team-members[/{memberId}]` (table relationnelle `ProjectMember` — **non consommée par le front actuellement**, voir le rapport d'audit API)
- `GET`/`POST`/`PATCH`/`DELETE /api/projects/{id}/events[/{eventId}]` (seul le `POST` est utilisé par le front aujourd'hui)

### Sous-tâches (`GET /api/projects` les renvoie déjà imbriquées)
- `POST /api/projects/{id}/subtasks`
- `PATCH /api/subtasks/{id}/status`, `/progress`, `/assign`
- `POST /api/subtasks/{id}/approve`, `/timer` (toggle), `/comments`

### Pièces jointes
- `POST /api/attachments` (upload multipart, `projectId` ou `subtaskId`)
- `PATCH /api/attachments/{id}/validate`
- `POST /api/uploads` (upload générique : avatar, logo, photo...)

### Demandes de modification / de tâche / requêtes
- `POST /api/projects/{id}/modifications`, `PATCH /api/modifications/{id}/review`
- `POST /api/projects/{id}/task-requests`, `PATCH /api/task-requests/{id}/review`
- `POST /api/projects/{id}/requetes`, `PATCH /api/requetes/{id}/answer`

### Notifications
- `GET /api/notifications`
- `PATCH /api/notifications/{id}/read`, `POST /api/notifications/read-all`

## Adaptation au front mapp

Le front de `mapp.zip` est conservé sans modification. Le modèle `Project` côté backend accepte maintenant `startDate` et `endDate` et les retourne dans les réponses JSON. À la création, si ces dates ne sont pas fournies, la date de début est initialisée à maintenant et la date de fin à +30 jours.

Une migration dédiée `Version20260922100000.php` ajoute ces deux colonnes sans casser les projets existants.
