# Dockerisation — TaskManager (front Next.js + back Symfony + MySQL)

Ce guide couvre l'installation en développement, le passage en production, les
commandes du quotidien et le dépannage pour la stack dockerisée :
`front` (Next.js 13.5 / Node 20), `nginx` + `back` (Symfony 7.4 / PHP 8.3-fpm),
`mysql` (8.4), et `adminer` (dev uniquement).

> **Pourquoi deux conteneurs pour "le back" ?** La consigne groupe le back
> sous "php-fpm + nginx", ce que ce projet implémente avec **deux services**
> Compose distincts — `back` (php-fpm, exécute le code PHP) et `nginx` (sert
> les fichiers statiques et transmet les `.php` à `back` via FastCGI). C'est
> le découpage standard pour ce couple (un seul conteneur faisant tourner les
> deux processus demanderait un superviseur type supervisord, pour aucun
> bénéfice ici) ; les deux sont toujours démarrés/arrêtés ensemble.

---

## Section 1 — Prérequis

- **Docker Desktop** (Windows/Mac) ou **Docker Engine** (Linux) — version
  **24+** recommandée.
- **Docker Compose v2** (intégré à Docker Desktop ; sur Linux, le plugin
  `docker-compose-plugin`). Ce guide utilise exclusivement la syntaxe
  `docker compose` (v2), pas `docker-compose` (v1, dépréciée).

Vérifications :

```bash
docker --version
docker compose version
```

`docker compose version` doit afficher `v2.x` — si la commande est introuvable
mais que `docker-compose version` (v1) fonctionne, mettez à jour Docker
Desktop/Engine.

---

## Section 2 — Installation en développement

1. **Cloner le repo** (si ce n'est pas déjà fait).

2. **Copier le fichier d'environnement** :

   ```bash
   cp .env.docker.example .env
   ```

   Ce `.env` **à la racine** (et non `back/.env`) est celui que lit Docker
   Compose. Il n'est pas versionné, et la pipeline Jenkins le supprime en fin
   de build : à recréer après chaque clone. S'il manque, `docker compose`
   s'arrête avec `required variable ... is missing a value` au lieu de démarrer
   avec des valeurs vides.

3. **Renseigner les variables** dans `.env` — la Section 6 détaille chacune
   d'elles ; en dev, les valeurs par défaut de `.env.docker.example`
   fonctionnent telles quelles (elles ne contiennent aucun vrai secret), sauf
   si des ports (80, 3306, 8080) sont déjà pris sur votre machine —
   changez alors `HTTP_PORT` / `MYSQL_PORT` / `ADMINER_PORT`.
   Pour ouvrir l'application depuis d'autres appareils, mettez l'URL publique
   (ex. `http://192.168.88.236`) dans `FRONTEND_URL`, `DEFAULT_URI` et
   `NEXT_PUBLIC_API_URL` — ou lancez `./change_ip.sh`.

4. **Lancer la stack** :

   ```bash
   docker compose up -d --build
   ```

   (équivalent à `make up`)

5. **Attendre que les healthchecks passent** :

   ```bash
   docker compose ps
   ```

   `mysql` et `back` doivent passer en `healthy` (quelques secondes à la
   première exécution, le temps que MySQL initialise son volume de données).
   `nginx` attend que `back` soit `healthy` avant de démarrer.

6. **Les migrations s'exécutent automatiquement** à chaque démarrage de
   `back` (voir `back/docker/php/entrypoint.sh`). Pour les rejouer
   manuellement (par exemple après avoir ajouté une migration sans redémarrer
   le conteneur) :

   ```bash
   docker compose exec back php bin/console doctrine:migrations:migrate --no-interaction
   ```

   (équivalent à `make migrate`)

   **Import de `taskmanager.sql` (dev uniquement)** : au tout premier
   démarrage (volume `mysql_data` vide), l'image MySQL importe
   `taskmanager.sql` dans `MYSQL_DATABASE` (voir le montage
   `/docker-entrypoint-initdb.d/` dans `docker-compose.yml`). Le dump contient
   déjà `doctrine_migration_versions`, donc les migrations répondent ensuite
   `Already at the latest version`. Pour réimporter un dump mis à jour :
   `docker compose down -v && docker compose up -d --build`.

7. **Pas de fixtures séparées** : ce projet n'utilise pas
   DoctrineFixturesBundle — les comptes et projets de démonstration sont
   injectés par les migrations elles-mêmes
   (`back/migrations/Version20260922*.php`, idempotentes). L'étape 6
   suffit donc aussi à "charger les fixtures". `make fixtures` existe comme
   alias de `make migrate` pour qui chercherait cette cible par habitude.

8. **Accéder aux services** :

   Front et API partagent **une seule URL** (nginx : `/api/*` → Symfony, le
   reste → Next.js) — ici `<URL>` = valeur de `FRONTEND_URL`.

   | Service | URL | Identifiants |
   |---|---|---|
   | Front | `<URL>/` | Comptes de démo du front (voir `front/lib/mock-data` ou l'écran de connexion) |
   | API + doc Swagger | `<URL>/api/doc` | Admin : `admin@taskmanager.local` / `ChangeMe!2026` |
   | Adminer | http://localhost:8080 | Système : MySQL, Serveur : `mysql`, Utilisateur/mdp : valeurs de `MYSQL_USER`/`MYSQL_PASSWORD` dans `.env`, Base : `MYSQL_DATABASE` |
   | Mailpit (dev) | http://localhost:8025 | Aucun — boîte de test : tous les e-mails envoyés par le back y arrivent (rien ne part réellement) |

   **Validation des comptes** : **tout** compte créé via l'inscription
   (`client`, `membre`, `chef de projet`) est `pending` et **ne peut pas se
   connecter** (403 « en attente de validation ») tant qu'un admin ne l'a pas
   validé. Un compte refusé ne peut plus se connecter, et son jeton déjà émis
   est coupé (`App\Security\AccountStatusUserChecker`). Seuls les comptes
   créés par un admin (page Équipe) sont actifs directement.

   **Notifications « compte en attente »** : à chaque inscription, chaque admin actif reçoit une
   notification dans l'app (cloche + toast, rafraîchis toutes les 60 s), le
   lien **Utilisateurs** affiche un badge orange (nombre de comptes en
   attente, vérifié toutes les 30 s), et un e-mail part aux admins
   (`ADMIN_NOTIFY_EMAIL`, sinon tous les admins actifs) + un e-mail de
   confirmation à l'inscrit. Valider/refuser le compte fait disparaître
   l'alerte chez **tous** les admins. Un échec d'envoi d'e-mail est loggé
   (`docker compose logs back | grep "Échec de l'envoi"`) sans bloquer
   l'inscription.

---

## Section 3 — Commandes du quotidien

```bash
# Démarrer / arrêter / redémarrer
docker compose up -d           # make up (sans rebuild)
docker compose down            # make down
docker compose restart back    # redémarrer un seul service

# Logs
docker compose logs -f              # tous les services
docker compose logs -f back         # un seul (make logs s=back)

# Entrer dans un conteneur
docker compose exec back sh         # make bash-back
docker compose exec front sh        # make bash-front

# Rebuild après changement de dépendances (composer.json / package.json)
docker compose up -d --build        # make up (le --build est inclus)
# ou, pour forcer un rebuild sans relancer :
docker compose build back
docker compose build front

# Reset complet (supprime aussi les volumes : données MySQL, vendor, node_modules)
docker compose down -v
docker compose up -d --build
```

---

## Section 4 — Installation en production

1. **Préparer le serveur** : Docker + Docker Compose v2 installés (Section 1).

2. **Copier le projet** sur le serveur, puis créer le `.env` de prod à partir
   de `.env.docker.example` — **avec de vrais secrets** cette fois
   (`APP_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_PASSPHRASE`),
   et des URLs publiques réelles pour `FRONTEND_URL` / `DEFAULT_URI` /
   `NEXT_PUBLIC_API_URL` / `CORS_ALLOW_ORIGIN` (plus la regex `localhost`
   par défaut).

3. **Builder les images** :

   ```bash
   docker compose -f docker-compose.prod.yml build
   ```

4. **Lancer** :

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

   (les deux étapes 3-4 réunies : `make up-prod`)

5. **Migrations en prod** : elles tournent aussi automatiquement au démarrage
   de `back` (même entrypoint qu'en dev). Pour les lancer manuellement, ou
   désactiver l'auto-exécution (`SKIP_MIGRATIONS=1` dans l'environnement du
   service `back`) et les piloter vous-même entre deux déploiements :

   ```bash
   docker compose -f docker-compose.prod.yml exec back php bin/console doctrine:migrations:migrate --no-interaction
   ```

6. **Vérifications post-déploiement** :

   ```bash
   docker compose -f docker-compose.prod.yml ps        # tout doit être "healthy"/"running"
   curl -I "$FRONTEND_URL/api/doc.json"   # API (via nginx)
   curl -I "$FRONTEND_URL/"               # front (même URL)
   ```

   Contrairement à la prod de ce projet sous Laragon (domaines `.dev` avec
   certificat local), cette stack Docker sert tout en HTTP simple sur les
   ports publiés — mettez un reverse proxy (nginx, Traefik, Caddy...) devant
   si un vrai nom de domaine + TLS public est nécessaire ; ce n'est pas géré
   par ces fichiers.

---

## Section 5 — Dépannage

**Port déjà occupé** (`Bind for 0.0.0.0:80 failed: port is already allocated`)
→ Changez `HTTP_PORT` / `MYSQL_PORT` / `ADMINER_PORT` dans `.env`, puis
`docker compose up -d`. Si `HTTP_PORT` n'est pas 80, ajoutez-le aux URL
publiques (`http://192.168.88.236:8080`…) et rebuildez le front.

**MySQL pas prêt / `back` redémarre en boucle au premier lancement**
→ Normal les premières secondes : l'entrypoint de `back` attend que le port
MySQL réponde avant de continuer, et `nginx` attend que `back` soit
`healthy`. Si ça persiste après 30-60s, regardez `docker compose logs mysql`
(souvent un volume `mysql_data` corrompu d'un essai précédent — `docker
compose down -v` puis relancer).

**L'app « marche » mais n'utilise pas la base**
→ Le front se rabat sur `front/lib/mock-data.ts` dès que l'API ne répond pas :
une interface qui s'affiche ne prouve donc pas que le back tourne. Vérifiez :
`docker compose ps` (`back` doit être `healthy`), puis
`docker compose exec back php bin/console dbal:run-sql "SELECT COUNT(*) FROM user"`.

**`back` en `Restarting (127)` / `entrypoint.sh: not found`**
→ Fins de ligne Windows (CRLF) dans `entrypoint.sh`. `.gitattributes` force
LF et le Dockerfile retire les CR par sécurité ; sur un ancien checkout :
`git rm --cached -r . -q && git reset --hard`, puis rebuild.

**`vendor/ absent` ou classe introuvable au démarrage de `back` (dev)**
→ Le volume `back_vendor` a été rempli par une ancienne image. Il ne se
remplit qu'à sa création : `docker compose down -v && docker compose up -d --build`.

**Permissions de fichiers (`var/` Symfony, "Permission denied")**
→ En dev, `back` tourne en root justement pour pouvoir corriger ça
automatiquement au démarrage (voir `entrypoint.sh`, dernier bloc). Si l'erreur
persiste malgré tout, vérifiez que le volume `back_vendor` n'a pas été créé
par un ancien conteneur avec un autre UID : `docker compose down -v && docker
compose up -d --build`.

**Le front ne prend pas en compte mes modifications (dev, Windows/macOS)**
→ Docker Desktop ne transmet pas les événements fichiers du bind mount
`./front` au conteneur : `WATCHPACK_POLLING=true` (déjà dans
`docker-compose.yml`) fait surveiller les fichiers par polling. Si vous
l'avez retiré, remettez-le puis `docker compose up -d front`.

**Cache Next.js qui "pollue" entre deux versions du code (dev)**
→ Le dossier `.next` est un volume nommé (`front_next_cache`) pour que les
rebuilds incrémentaux de `next dev` survivent aux redémarrages du conteneur.
En cas de comportement bizarre après un gros changement (upgrade de Next,
changement de `next.config.js`...), videz-le :
`docker compose down && docker volume rm <projet>_front_next_cache && docker compose up -d`.

**Erreur de connexion front → back / `NEXT_PUBLIC_API_URL` vs `API_URL_INTERNAL`**
→ Ce projet n'a **aucun fetch côté serveur** : toutes les pages sont des
Client Components (`'use client'`), donc **tous** les appels API partent du
navigateur, jamais du conteneur `front` lui-même. Seule `NEXT_PUBLIC_API_URL`
compte aujourd'hui — et elle doit être une URL que **votre navigateur** peut
résoudre (l'URL publique, ex. `http://192.168.88.236`), pas un nom de service Docker
(`http://back` ou `http://nginx` ne résolvent que *depuis l'intérieur* du
réseau Docker, jamais depuis votre machine). `API_URL_INTERNAL` est réservée
à un futur appel serveur-à-serveur (SSR / route handler) ; la changer n'aura
aucun effet sur le code actuel. Autre piège : `NEXT_PUBLIC_API_URL` est
**inlinée dans le bundle JS au `next build`** (voir `front/Dockerfile`) — la
changer dans `.env` puis juste faire `docker compose restart front` ne suffit
**pas**, il faut rebuilder l'image (`docker compose up -d --build front`).

---

## Section 6 — Variables d'environnement

| Variable | Description | Valeur dev (exemple) | Valeur prod |
|---|---|---|---|
| `APP_ENV` | Environnement Symfony (`dev`/`prod`) | `dev` | `prod` |
| `APP_SECRET` | Secret Symfony (CSRF, signatures internes) | placeholder | **à générer** (`openssl rand -hex 16`) |
| `MYSQL_DATABASE` | Nom de la base | `taskmanager` | idem |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Compte applicatif MySQL (utilisé par `DATABASE_URL`, pas root) | `app` / placeholder | `app` / **mot de passe fort** |
| `MYSQL_ROOT_PASSWORD` | Mot de passe root MySQL | placeholder | **mot de passe fort** |
| `MYSQL_PORT` | Port MySQL publié sur l'hôte | `3306` | *(non publié en prod)* |
| `DATABASE_URL` | DSN Doctrine — hôte `mysql` = nom du service Compose | voir `.env.docker.example` | idem, mêmes identifiants que ci-dessus |
| `JWT_PASSPHRASE` | Passphrase de la clé privée JWT (LexikJWTAuthenticationBundle) | placeholder | **secret fort** |
| `JWT_SECRET_KEY` / `JWT_PUBLIC_KEY` | Chemins des clés RSA (générées automatiquement si absentes) | `%kernel.project_dir%/config/jwt/*.pem` | idem |
| `JWT_REFRESH_TOKEN_TTL` | Durée de vie du refresh token (secondes) | `2592000` (30j) | idem, ou plus court en prod selon la politique de sécurité |
| `CORS_ALLOW_ORIGIN` | Regex des origines autorisées (NelmioCorsBundle) | `localhost` / `127.0.0.1` | **domaine public réel** du front |
| `FRONTEND_URL` | URL publique, utilisée par le back (liens dans les emails, etc.) | `http://localhost` | URL publique (ex. `http://192.168.88.236`) |
| `DEFAULT_URI` | URI par défaut du back (CLI, redirections) — **même URL publique** | `http://localhost` | idem |
| `MAILER_DSN` | DSN Symfony Mailer | `smtp://mailpit:1025` (capturé par Mailpit) | DSN SMTP réel (`null://null` = aucun envoi) |
| `MAILER_FROM` | Expéditeur des e-mails | `no-reply@taskmanager.local` | adresse autorisée par le SMTP |
| `ADMIN_NOTIFY_EMAIL` | Destinataires de l'alerte « compte en attente » (séparés par des virgules) | vide = tous les admins actifs | idem, ou une boîte partagée |
| `MAILPIT_PORT` | Port hôte de l'interface Mailpit | `8025` | *(service absent en prod)* |
| `HTTP_PORT` | Seul port public : `nginx` sert le front **et** l'API (`/api/*`, `/uploads/*`) | `80` | idem |
| `ADMINER_PORT` | Port hôte publié pour `adminer` | `8080` | *(service absent en prod)* |
| `NEXT_PUBLIC_API_URL` | URL de l'API vue par le **navigateur**, inlinée au build — **même URL publique** | `http://localhost` | idem |
| `API_URL_INTERNAL` | URL interne front→back (non utilisée par le code actuel, voir Section 5) | `http://nginx` | idem |
| `REGISTRY` / `TAG` | Préfixe/tag des images buildées en prod (`docker-compose.prod.yml`) | — | ex. `registry.example.com/taskmanager` / `2026.10.09` |

---

## Résumé des fichiers créés

| Fichier | Rôle |
|---|---|
| `front/Dockerfile` | Build multi-stage Next.js (`deps` → `dev` / `builder` → `runner` standalone) |
| `front/.dockerignore` | Exclut `node_modules`, `.next`, secrets du contexte de build front |
| `front/next.config.js` | *(modifié)* ajout de `output: 'standalone'` |
| `back/Dockerfile` | Build multi-stage Symfony (`composer` → `php-base` → `dev` / `prod` / `nginx-prod`) |
| `back/docker/nginx/default.conf` | Vhost nginx : sert `public/`, transmet les `.php` à `back:9000` en FastCGI |
| `back/docker/php/php.ini` | Config PHP partagée (mémoire, uploads, OPcache en mode "dev-friendly") |
| `back/docker/php/opcache-prod.ini` | Override OPcache pour le stage `prod` (code immuable, pas de revalidation) |
| `back/docker/php/entrypoint.sh` | Attend MySQL, installe `vendor/` si absent, génère les clés JWT si absentes, joue les migrations, corrige les permissions, puis `exec php-fpm` |
| `back/.dockerignore` | Exclut `vendor/`, `var/`, les clés JWT, `.env.local`, etc. du contexte de build back |
| `docker-compose.yml` | Stack de dev : bind-mounts (hot reload), ports publiés, Adminer |
| `docker-compose.prod.yml` | Stack de prod : images figées, pas de volumes de code, MySQL non exposé, pas d'Adminer |
| `.env.docker.example` | Modèle de toutes les variables d'environnement (à copier en `.env`) |
| `Makefile` | Raccourcis : `up`, `down`, `logs`, `migrate`, `fixtures`, `bash-front`, `bash-back`, `test`, `build`, `up-prod`, `down-prod` |
| `.gitignore` | *(nouveau, racine)* ignore le `.env` réel une fois rempli de vrais secrets |
| `DOCKER.md` | Ce guide |

## Variables à renseigner avant le premier démarrage

Dans `.env` (copié depuis `.env.docker.example`) : `APP_SECRET`,
`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_PASSPHRASE` — les valeurs
d'exemple fonctionnent pour un premier essai en local, mais **doivent être
changées avant tout déploiement en production** ou tout repo partagé.

## Démarrer en dev

```bash
cp .env.docker.example .env && docker compose up -d --build
```

## Démarrer en prod

```bash
cp .env.docker.example .env   # puis éditer .env avec de vrais secrets
docker compose -f docker-compose.prod.yml up -d --build
```

## Points d'attention (à faire manuellement après le premier `up`)

- **Remplacer les secrets** de `.env` avant tout usage réel (voir ci-dessus) —
  les valeurs d'exemple ne sont sûres qu'en dev local jetable.
- **Mot de passe admin par défaut** : la migration de seed crée
  `admin@taskmanager.local` / `ChangeMe!2026` — à changer dès la première
  connexion en prod (aucun mécanisme de changement forcé n'existe
  actuellement).
- **`NEXT_PUBLIC_API_URL` en prod** doit être rebuildée (pas juste
  redémarrée) si elle change après coup — voir Section 5.
- **Sauvegardes MySQL** : le volume `mysql_data` n'est pas sauvegardé
  automatiquement par ces fichiers — mettre en place un `mysqldump`
  planifié (ou un outil dédié) avant tout usage en production réelle.
- **Clés JWT en prod** : générées une seule fois dans le volume nommé
  `jwt_keys` au premier démarrage ; ne supprimez pas ce volume sans vouloir
  invalider tous les tokens existants.
- Rien n'a été exécuté ni testé pour produire ce guide (conformément à la
  consigne) — le premier `docker compose up -d --build` sera donc aussi le
  premier test réel de l'ensemble.
