# CI/CD Jenkins — TaskManager

Pipeline Jenkins pour la stack dockerisée décrite dans `DOCKER.md` (`front`,
`back`+`nginx`, `mysql`). Build, vérifications statiques, puis push d'images
et déploiement optionnels — rien de tout cela n'a été exécuté ni testé pour
produire ces fichiers, comme pour `DOCKER.md`.

> **Prérequis implicite** : ce `Jenkinsfile` suppose que ce dossier
> (`front/`, `back/`, `docker-compose*.yml`...) est à la racine d'un dépôt
> Git accessible par Jenkins. Ce n'est pas encore le cas aujourd'hui (`front/`
> et `back/` ont chacun leur propre `.git` local, sans remote) — à faire
> avant de créer le job Jenkins (voir Section 1).

---

## Section 1 — Prérequis

### Dépôt Git

Jenkins a besoin d'un seul dépôt Git racine (avec `Jenkinsfile`,
`docker-compose.yml`, `front/`, `back/` dedans) poussé sur un remote qu'il
peut atteindre (GitHub, GitLab, Gitea, Bitbucket...). Si ce n'est pas déjà
fait :

```bash
cd D:\WORK\OTHER\Stage\Mao
git init
git add .
git commit -m "chore: initial commit"
git remote add origin <url-de-votre-remote>
git push -u origin main
```

(`front/.git` et `back/.git` existants devront être supprimés ou gérés en
sous-modules avant ce `git add .`, sans quoi Git les traitera comme des
sous-modules vides — à adapter selon votre choix d'organisation du dépôt.)

### Jenkins

- **Jenkins 2.4xx+** (LTS récente).
- **Docker + Docker Compose v2** installés sur l'agent qui exécutera le
  pipeline, et l'utilisateur système de Jenkins (souvent `jenkins`) doit
  pouvoir utiliser Docker (membre du groupe `docker`, ou Jenkins lui-même
  tourne dans un conteneur avec le socket Docker monté).
- **Plugins** : `Pipeline`, `Git`, `Credentials Binding`, `SSH Agent` (pour le
  stage de déploiement). Tous sauf `SSH Agent` sont installés par défaut sur
  une instance Jenkins standard.

### Credentials à créer (Administrer Jenkins → Credentials)

| ID (exact, utilisé dans le `Jenkinsfile`) | Type | Contenu | Obligatoire ? |
|---|---|---|---|
| `taskmanager-env` | Secret file | Un fichier `.env` complet (voir `.env.docker.example`), avec de vrais secrets | **Oui** — sans lui, dès le 2ᵉ stage échoue |
| `taskmanager-registry-creds` | Username with password | Identifiants du registre Docker | Non — seulement si vous lancez avec `REGISTRY` renseigné |
| `taskmanager-deploy-ssh` | SSH Username with private key | Accès SSH au serveur de déploiement | Non — seulement si vous lancez avec `DEPLOY=true` |
| `taskmanager-deploy-host` | Secret text | Nom d'hôte/IP du serveur de déploiement | Non — idem |

Seule `taskmanager-env` est nécessaire pour qu'un run "simple" (build +
vérifications, sans push ni déploiement) passe.

---

## Section 2 — Créer le job Jenkins

**Option recommandée : Multibranch Pipeline** (détecte automatiquement ce
`Jenkinsfile` sur chaque branche/PR) :

1. *Nouveau Item* → *Multibranch Pipeline*.
2. *Branch Sources* → *Git* (ou GitHub/GitLab selon votre remote) → renseigner
   l'URL du dépôt + les credentials d'accès au repo si privé.
3. *Build Configuration* → *by Jenkinsfile*, chemin par défaut (`Jenkinsfile`
   à la racine) convient déjà.
4. Sauvegarder : Jenkins scanne les branches et lance un premier build sur
   chacune.

**Option simple : Pipeline classique** (une seule branche) :

1. *Nouveau Item* → *Pipeline*.
2. *Pipeline* → *Definition* : *Pipeline script from SCM* → Git → URL du
   dépôt + branche (`main`).
3. *Script Path* : `Jenkinsfile` (valeur par défaut).

---

## Section 3 — Stages du pipeline

| Stage | Ce qu'il fait | Toujours exécuté ? |
|---|---|---|
| `Checkout` | Clone le dépôt au commit déclenchant le build | Oui |
| `Préparer .env` | Copie la credential `taskmanager-env` en `.env` à la racine du workspace | Oui |
| `Build images` | `docker compose -f docker-compose.prod.yml build` (front + back + nginx) | Oui |
| `Vérifications` → `Front : typecheck + lint` | `npm run typecheck && npm run lint` dans l'image front, en parallèle du stage back | Oui |
| `Vérifications` → `Back : validations` | `composer validate --strict`, `lint:yaml`, `lint:container` dans l'image back (entrypoint court-circuité, pas de DB nécessaire) | Oui |
| `Push images` | `docker login` + `docker compose push` vers `params.REGISTRY` | Seulement sur `main`, et si le paramètre `REGISTRY` est renseigné au lancement |
| `Déploiement` | `scp` + `ssh` vers le serveur cible, puis `docker compose -f docker-compose.prod.yml up -d` à distance | Seulement sur `main`, et si le paramètre `DEPLOY` est coché au lancement |

Le stage *Vérifications* reflète l'état réel du projet : **il n'y a
aujourd'hui aucune suite PHPUnit ni aucun test front installés** (vérifié
dans `composer.json` / `package.json` — ni `phpunit/phpunit`, ni
`symfony/test-pack`, ni script `test` côté front). Plutôt que d'inventer des
commandes qui échoueraient à coup sûr, ce pipeline ne lance que des
vérifications qui existent réellement aujourd'hui (typecheck, lint, validité
du mapping Doctrine/YAML/container, validité de `composer.json`). Ajoutez un
stage `Tests` dédié le jour où une vraie suite de tests est introduite.

---

## Section 4 — Lancer un build

- **Build standard** (build + vérifications uniquement) : *Build Now* sans
  toucher aux paramètres — `REGISTRY` vide, `DEPLOY` décoché.
- **Avec push d'images** : *Build with Parameters* → renseigner `REGISTRY`
  (ex. `registry.example.com/taskmanager`).
- **Avec déploiement** : *Build with Parameters* → cocher `DEPLOY` (en plus
  de `REGISTRY` si vous voulez aussi pousser les images avant de déployer).
  Ne fonctionne que sur la branche `main`.

---

## Section 5 — Dépannage

**`docker: command not found` / `permission denied while trying to connect to the Docker daemon socket`**
→ Docker n'est pas installé sur l'agent, ou l'utilisateur système de Jenkins
n'est pas dans le groupe `docker`. Si Jenkins tourne lui-même en conteneur,
il doit avoir le socket `/var/run/docker.sock` monté (et Docker installé
dans son image).

**Stage "Préparer .env" échoue (`ERROR: ... taskmanager-env`)**
→ La credential `taskmanager-env` (type *Secret file*) n'existe pas encore,
ou son ID ne correspond pas exactement. Voir Section 1.

**Stage "Vérifications" → back échoue sur `lint:container`**
→ Ce stage utilise `--entrypoint sh` pour éviter que `entrypoint.sh`
n'attende indéfiniment une base MySQL absente (`--no-deps`). Si l'erreur
vient d'ailleurs (variable d'environnement manquante par exemple), vérifiez
que `.env` contient bien toutes les clés de `.env.docker.example` — Doctrine
a besoin d'une `DATABASE_URL` syntaxiquement valide même pour compiler le
container, pas besoin que MySQL réponde.

**Stage "Push images" sauté alors que vous vouliez pousser**
→ Vérifiez que vous êtes bien sur la branche `main` **et** que le paramètre
`REGISTRY` est renseigné au lancement (*Build with Parameters*, pas *Build
Now*, qui reprend la valeur par défaut vide).

**Stage "Déploiement" : `Host key verification failed`**
→ `StrictHostKeyChecking=no` est déjà passé dans le `Jenkinsfile` pour éviter
ça en usage normal ; si l'erreur persiste, le serveur cible a peut-être
changé de clé d'hôte récemment (rotation, réinstallation) — rien à voir avec
Jenkins lui-même.

---

## Résumé des fichiers créés

| Fichier | Rôle |
|---|---|
| `Jenkinsfile` | Pipeline déclaratif : checkout → .env → build images → vérifications (front + back en parallèle) → push optionnel → déploiement optionnel |
| `JENKINS.md` | Ce guide |

## Credentials à créer avant le premier build

`taskmanager-env` (obligatoire) ; `taskmanager-registry-creds`,
`taskmanager-deploy-ssh`, `taskmanager-deploy-host` (seulement si vous
utilisez le push/déploiement) — détail des types en Section 1.

## Lancer un build standard

*Build Now* sur le job (Multibranch ou Pipeline classique) une fois le dépôt
poussé et la credential `taskmanager-env` créée.

## Points d'attention

- **Aucun remote Git configuré aujourd'hui** sur ce projet (`front/` et
  `back/` ont des `.git` locaux séparés, sans origin) — à résoudre avant de
  créer le job Jenkins (voir l'encart en haut du document).
- **`params.REGISTRY`/`params.DEPLOY` sont vides/false par défaut** : un
  premier build "ne casse rien" (pas de push, pas de déploiement) tant que
  vous ne les renseignez pas explicitement.
- **Pas de suite de tests réelle** dans ce projet actuellement : le stage
  *Vérifications* ne fait que des contrôles statiques déjà disponibles — ce
  n'est pas un oubli, voir Section 3.
- **Le serveur de déploiement (`taskmanager-deploy-host`) n'existe pas
  encore** dans ce qui a été configuré jusqu'ici dans ce projet — le stage
  `Déploiement` est un squelette à adapter à votre infrastructure réelle
  (chemin `/opt/taskmanager/`, utilisateur SSH...) avant la première
  utilisation avec `DEPLOY=true`.
