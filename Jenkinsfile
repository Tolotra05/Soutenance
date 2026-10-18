// Pipeline CI/CD pour TaskManager (front Next.js + back Symfony + MySQL),
// construit sur la stack Docker de docker-compose.prod.yml (voir DOCKER.md).
//
// Exécuté par le Jenkins préconfiguré de jenkins/ (voir JENKINS.md), installé
// sur la MÊME machine que la prod : il pilote le Docker de l'hôte via son
// socket et déploie localement dans le projet Compose de la prod
// (PROD_PROJECT), dont il réutilise les volumes (base, clés JWT, fichiers).
// Rien d'autre n'est requis sur l'agent que Docker + Compose v2 : Node, PHP,
// Composer... tournent dans les images de back/Dockerfile et front/Dockerfile.
//
// Les vérifications n'utilisent aucun bind mount ($PWD est un chemin du
// conteneur Jenkins, inconnu du Docker de l'hôte) : elles tournent dans les
// images construites.

def isMaster() {
    // Job Pipeline : GIT_BRANCH = "origin/master" ; Multibranch : BRANCH_NAME = "master"
    return (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '') == 'master'
}

def deploying() {
    return params.DEPLOY && isMaster()
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
        timeout(time: 45, unit: 'MINUTES')
    }

    parameters {
        booleanParam(name: 'DEPLOY', defaultValue: true,
            description: "Déployer en prod après le build et les vérifications (branche master uniquement). Décocher pour un build de contrôle sans toucher à la prod.")
        string(name: 'REGISTRY', defaultValue: '',
            description: "Registre Docker où pousser les images (ex : registry.example.com/taskmanager). Vide = pas de push.")
    }

    // Le serveur est sur un réseau local (pas de webhook GitHub possible) :
    // Jenkins interroge le dépôt toutes les 5 minutes et lance un build à
    // chaque nouveau commit sur la branche suivie.
    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        DC = 'docker compose -f docker-compose.prod.yml'
        // Toutes les commandes Compose visent par défaut le projet de la prod...
        COMPOSE_PROJECT_NAME = "${env.PROD_PROJECT ?: 'soutenance'}"
        // ...sauf les vérifications, isolées dans un projet jetable.
        CI_PROJECT = 'taskmanager-ci'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --format="Commit %h : %s (%an)"'
            }
        }

        stage('Préparer .env') {
            steps {
                // Credential "taskmanager-env" = .env de prod (jenkins/casc.yaml),
                // jamais affiché dans les logs, supprimé en fin de build.
                withCredentials([file(credentialsId: 'taskmanager-env', variable: 'ENV_FILE')]) {
                    sh 'cp "$ENV_FILE" .env && chmod 600 .env'
                }
            }
        }

        stage('Build images') {
            steps {
                sh '$DC build'
            }
        }

        stage('Vérifications') {
            parallel {
                stage('Front : typecheck + lint') {
                    steps {
                        // Étape "builder" du Dockerfile : sources + dépendances de dev,
                        // déjà en cache après "Build images".
                        sh '''
                            docker build -q --target builder --build-arg NEXT_PUBLIC_API_URL= -t taskmanager-ci/front-builder front
                            docker run --rm taskmanager-ci/front-builder sh -c "npm run typecheck && npm run lint"
                        '''
                    }
                }
                stage('Back : validations') {
                    steps {
                        // --entrypoint sh : sans l'entrypoint (attente de MySQL +
                        // migrations) ; contrôles statiques uniquement, sans base.
                        sh '''
                            $DC -p "$CI_PROJECT" run --rm --no-deps --entrypoint sh back -c "
                              composer validate --strict --no-check-publish &&
                              php bin/console lint:yaml config &&
                              php bin/console lint:container
                            "
                        '''
                    }
                }
            }
        }

        stage('Push images') {
            when {
                allOf {
                    expression { isMaster() }
                    expression { return params.REGISTRY?.trim() }
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'taskmanager-registry-creds', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh '''
                        echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
                        REGISTRY="$REGISTRY" TAG="$BUILD_NUMBER" $DC build
                        REGISTRY="$REGISTRY" TAG="$BUILD_NUMBER" $DC push
                    '''
                }
            }
        }

        stage('Accès MySQL') {
            when { expression { deploying() } }
            steps {
                // Aligne les comptes MySQL sur le .env si besoin (sans effet sinon) :
                // évite un back "unhealthy" pour cause d'"Access denied" au déploiement.
                sh './sync_mysql_credentials.sh docker-compose.prod.yml'
            }
        }

        stage('Sauvegarde base') {
            when { expression { deploying() } }
            steps {
                sh '''
                    if [ -z "$($DC ps -q mysql)" ]; then
                        echo "Aucun MySQL de prod en cours (premier déploiement) : rien à sauvegarder."
                        exit 0
                    fi
                    $DC exec -T mysql sh -c 'mysqldump --single-transaction --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" 2>/dev/null' \
                        | gzip > "backup-${BUILD_NUMBER}.sql.gz"
                    # Un dump vide ou tronqué ne doit pas laisser croire à une sauvegarde.
                    gzip -dc "backup-${BUILD_NUMBER}.sql.gz" | head -n 1 | grep -q '^-- MySQL dump' \
                        || { echo "Sauvegarde invalide : déploiement annulé."; exit 1; }
                    gzip -dc "backup-${BUILD_NUMBER}.sql.gz" | tail -n 1 | grep -q 'Dump completed' \
                        || { echo "Sauvegarde incomplète : déploiement annulé."; exit 1; }
                    ls -lh "backup-${BUILD_NUMBER}.sql.gz"
                '''
                archiveArtifacts artifacts: 'backup-*.sql.gz', allowEmptyArchive: true
            }
        }

        stage('Déploiement') {
            when { expression { deploying() } }
            steps {
                // Ne recrée que les conteneurs dont l'image ou la config a changé ;
                // --wait attend que mysql et back soient "healthy" (migrations
                // jouées au démarrage de back) et échoue sinon.
                sh '$DC up -d --wait --wait-timeout 300'
                sh '$DC ps'
            }
        }

        stage('Contrôle post-déploiement') {
            when { expression { deploying() } }
            steps {
                sh '''
                    $DC exec -T back php bin/console doctrine:migrations:status | grep -q 'Already at latest version' \
                        || { echo "Migrations en attente"; exit 1; }
                    echo "Migrations : OK"

                    # check LIBELLÉ URL : requête faite DANS le conteneur nginx (indépendante
                    # de l'IP et du port publiés), réessayée 30 s le temps que le front
                    # démarre. 127.0.0.1 et non localhost : dans l'image Alpine, localhost
                    # se résout d'abord en ::1, où nginx n'écoute pas. Chaque échec arrête
                    # l'étape (un "cmd && echo OK" ne ferait échouer que la dernière ligne).
                    check() {
                        for i in $(seq 1 15); do
                            if $DC exec -T nginx wget -q -O /dev/null "$2" 2>/dev/null; then
                                echo "$1 : OK"
                                return 0
                            fi
                            sleep 2
                        done
                        echo "$1 : ÉCHEC ($2)"
                        return 1
                    }
                    check "API       " http://127.0.0.1/api/doc.json
                    check "Front     " http://127.0.0.1/
                    check "Connexion " http://127.0.0.1/login
                '''
            }
        }
    }

    post {
        always {
            // Projet jetable des vérifications + .env (secrets) : jamais laissés sur l'agent.
            sh '$DC -p "$CI_PROJECT" down -v --remove-orphans >/dev/null 2>&1 || true'
            sh 'rm -f .env'
        }
        success {
            echo "Build ${env.BUILD_NUMBER} réussi${deploying() ? ' : prod déployée' : ''}."
        }
        failure {
            echo "Échec : voir l'étape en rouge dans la vue des étapes (Stage View) et son log."
        }
    }
}
