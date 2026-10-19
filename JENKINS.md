# CI/CD Jenkins — TaskManager

Un Jenkins **préconfiguré** (dossier `jenkins/`) tourne sur la **même machine
que la prod**. À chaque nouveau commit sur `master`, il construit les images,
vérifie le code, sauvegarde la base, déploie la prod et contrôle qu'elle
répond. Tout est visible étape par étape dans l'interface.

Rien n'est à configurer à la main dans Jenkins. Plugins, compte admin,
credential `.env` et job sont créés au démarrage à partir de
`jenkins/casc.yaml` (Configuration as Code). Une modification faite dans
l'interface est écrasée au redémarrage suivant : on modifie les fichiers de
`jenkins/` à la place.

---

## 1. Contenu de `jenkins/`

| Fichier | Rôle |
|---|---|
| `Dockerfile` | Jenkins LTS 2.580.1 + client Docker / Compose + plugins |
| `plugins.txt` | Pipeline, Git, Configuration as Code, Job DSL, **Stage View**, **Pipeline Graph View**, horodatage des logs |
| `casc.yaml` | Compte admin, credential `taskmanager-env`, job `taskmanager` (paramètres, surveillance du dépôt) |
| `docker-compose.yml` | Conteneur Jenkins : port, socket Docker de l'hôte, `.env` de prod monté en lecture seule |
| `.env.example` | Réglages à copier en `jenkins/.env` (non versionné) |

Le pipeline lui-même est le `Jenkinsfile` à la racine du dépôt.

---

## 2. Installation sur le serveur (une seule fois)

Prérequis : Docker et Docker Compose v2 installés sur le serveur. C'est déjà
le cas, puisque la prod y tourne.

```bash
cd ~/projet/Soutenance
git pull origin master

# 1. Libérer le port 8080 si l'ancien Jenkins l'occupe (installation système) :
sudo systemctl stop jenkins && sudo systemctl disable jenkins
#    (ou garder l'ancien et mettre JENKINS_PORT=8081 à l'étape 2)

# 2. Réglages
cp jenkins/.env.example jenkins/.env
nano jenkins/.env
```

À renseigner dans `jenkins/.env` :

| Variable | Valeur |
|---|---|
| `JENKINS_ADMIN_ID` / `JENKINS_ADMIN_PASSWORD` | Compte de l'interface (mot de passe fort) |
| `JENKINS_PORT` / `JENKINS_URL` | `8080` / `http://<IP du serveur>:8080/` |
| `PROD_ENV_FILE` | Chemin **absolu** du `.env` de prod, ex. `/home/mao/projet/Soutenance/.env` |
| `PROD_PROJECT` | Projet Compose de la prod, affiché par `docker compose ls` (en général `soutenance`) |
| `DOCKER_GID` | Résultat de `getent group docker \| cut -d: -f3` |

```bash
# 3. Démarrage (construit l'image Jenkins, environ 2 minutes la première fois)
docker compose -f jenkins/docker-compose.yml up -d --build

# 4. Pare-feu, si l'interface doit être ouverte depuis le réseau
sudo ufw allow 8080/tcp
```

Ouvrir ensuite **http://\<IP du serveur\>:8080/** et se connecter avec le compte
de `jenkins/.env`. Le job **taskmanager** est déjà là. Cliquer sur
**Build with Parameters**, puis **Build**, pour lancer le premier build.

### Variante Windows (Docker Desktop), avec le dev sur la même machine

La prod déployée par Jenkins est **séparée** du dev. Elle tourne dans son
propre projet Compose, `taskmanager-prod`, sur le port **8088**, avec sa
propre base. Le dev reste intact (port 80, Adminer sur 8080, Mailpit sur
8025), et Jenkins prend le port **8090**.

1. `.env.prod` (non versionné) à la racine : copie de `.env.docker.example`
   avec `APP_ENV=prod`, `HTTP_PORT=8088`, `MAILER_DSN=null://null` et de vrais
   secrets.
2. `jenkins/.env` (non versionné) :
   ```
   JENKINS_PORT=8090
   JENKINS_URL=http://<IP du PC>:8090/
   PROD_ENV_FILE=D:/WORK/OTHER/Stage/Mao/Soutenance/.env.prod
   PROD_PROJECT=taskmanager-prod
   DOCKER_GID=0
   ```
   Sur Docker Desktop, le socket Docker appartient au groupe 0. Dans le
   chemin du fichier, utiliser des barres obliques `/`.
3. Dans PowerShell, depuis la racine du projet :
   ```powershell
   docker compose -f jenkins/docker-compose.yml up -d --build
   # accès depuis le réseau (PowerShell administrateur, une seule fois) :
   New-NetFirewallRule -DisplayName 'Jenkins 8090' -Direction Inbound -Protocol TCP -LocalPort 8090 -Action Allow
   New-NetFirewallRule -DisplayName 'TaskManager prod 8088' -Direction Inbound -Protocol TCP -LocalPort 8088 -Action Allow
   ```
4. Interface : **http://\<IP du PC\>:8090/**. Prod : **http://\<IP du PC\>:8088/**.
   Comptes initiaux de la prod : ceux créés par les migrations, par exemple
   `admin@taskmanager.local` / `ChangeMe!2026`, à changer.

Jenkins et la prod ne tournent que si Docker Desktop est démarré : activer
*Settings → General → Start Docker Desktop when you sign in*.

---

## 3. Les étapes du pipeline

| Étape | Ce qu'elle fait | Quand |
|---|---|---|
| Checkout | Récupère le commit à construire | Toujours |
| Préparer .env | Copie le `.env` de prod (credential `taskmanager-env`) dans l'espace de travail | Toujours |
| Build images | `docker compose -f docker-compose.prod.yml build` (back, front, nginx) | Toujours |
| Vérifications → Front | `npm run typecheck` + `npm run lint` dans l'image du front | Toujours (en parallèle) |
| Vérifications → Back | `composer validate`, `lint:yaml`, `lint:container` dans l'image du back | Toujours (en parallèle) |
| Push images | Envoi vers un registre Docker | `master` + paramètre `REGISTRY` renseigné |
| Accès MySQL | `./sync_mysql_credentials.sh` : réaligne les comptes MySQL sur le `.env` si besoin (sinon sans effet) | `master` + `DEPLOY` coché |
| Sauvegarde base | `mysqldump` compressé, vérifié (début et fin du dump), **archivé dans le build** | `master` + `DEPLOY` |
| Déploiement | `docker compose up -d --wait` : recrée ce qui a changé et attend que tout soit sain (migrations jouées au démarrage du back) | `master` + `DEPLOY` |
| Contrôle post-déploiement | Migrations à jour, API, front et page de connexion répondent | `master` + `DEPLOY` |

Une étape en échec arrête la suite. Si la sauvegarde est invalide, rien
n'est déployé. Une étape en rouge dans la vue indique où regarder.

Il n'existe pas encore de suite de tests automatisés (ni PHPUnit côté back, ni
tests côté front). Les vérifications se limitent aux contrôles réellement
disponibles : typage, lint, validité de la configuration Symfony. Ajouter une
étape `Tests` le jour où une suite existe.

---

## 4. Utilisation au quotidien

- **Automatique** : Jenkins interroge GitHub toutes les 5 minutes. Un nouveau
  commit sur `master` lance un build complet, déploiement compris. Un webhook
  est impossible, le serveur n'étant pas joignable depuis GitHub.
- **Build manuel** : *Build with Parameters* → *Build*.
- **Build de contrôle sans toucher à la prod** : *Build with Parameters* →
  décocher `DEPLOY` → *Build*.
- **Interface** :
  - page du job : la **Stage View** montre chaque étape de chaque build, avec
    sa durée ;
  - **Stages** (menu de gauche) : vue graphique détaillée d'un build ;
  - dans un build, **Console Output** : le log complet, horodaté ;
  - les sauvegardes de la base apparaissent en *Artifacts* (10 dernières
    gardées).
- **Restaurer une sauvegarde**, téléchargée depuis le build :
  ```bash
  gunzip -c backup-<N>.sql.gz | docker compose -f docker-compose.prod.yml exec -T mysql \
    sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
  ```

**Après une modification du `.env` de prod**, recréer Jenkins, qui ne le
relit qu'au démarrage :
`docker compose -f jenkins/docker-compose.yml up -d --force-recreate`.
Un simple `restart` ne suffit pas : le fichier est monté seul dans le conteneur,
et un éditeur qui le réécrit (`sed -i`, `change_ip.sh`…) en crée un nouveau que
le conteneur redémarré ne voit pas. Jenkins redéploierait alors les anciens mots
de passe (« Access denied »). Diagnostic : `bash diag_mysql.sh`.

**Modifier le compte admin ou un réglage** : éditer `jenkins/.env`, puis
`docker compose -f jenkins/docker-compose.yml up -d`.

**Changement d'IP du serveur** : rien n'est bloqué. Jenkins et la prod restent
accessibles sur la nouvelle adresse. `./change_ip.sh` (Linux) ou
`.\change_ip.cmd` (Windows) met à jour `.env`, `.env.prod` et `jenkins/.env`
(`JENKINS_URL`, utilisé pour les liens absolus produits par Jenkins), puis
indique comment l'appliquer :
`docker compose -f jenkins/docker-compose.yml up -d --force-recreate`, puis
un build pour redéployer la prod.

---

## 5. Dépannage

**`permission denied while trying to connect to the Docker daemon socket`**
→ `DOCKER_GID` ne correspond pas au groupe du socket. Le corriger avec la
valeur de `getent group docker | cut -d: -f3`, puis relancer
`docker compose -f jenkins/docker-compose.yml up -d`.

**`Bind for 0.0.0.0:8080 failed: port is already allocated`**
→ L'ancien Jenkins tourne encore (`sudo systemctl stop jenkins`), ou un autre
service occupe le port : changer `JENKINS_PORT` (et `JENKINS_URL`).

**Étape « Accès MySQL » en échec**
→ Voir son log. Si la base `MYSQL_DATABASE` n'existe pas dans le volume, le
script refuse d'agir : corriger `MYSQL_DATABASE` dans le `.env` de prod, puis
redémarrer Jenkins.

**Étape « Déploiement » en échec (`--wait` dépassé)**
→ Un service n'est pas devenu sain. Sur le serveur :
`docker compose -f docker-compose.prod.yml ps` puis
`docker compose -f docker-compose.prod.yml logs back --tail 50`.

**Étape « Contrôle post-déploiement » en échec**
→ Le log indique quelle vérification a échoué : migrations, API, front ou
connexion. Consulter les logs du service concerné comme ci-dessus.

**Le job n'a pas de bouton « Build with Parameters »**
→ Jenkins n'a pas pu appliquer `casc.yaml`. Voir
`docker compose -f jenkins/docker-compose.yml logs jenkins | grep -i casc`.
