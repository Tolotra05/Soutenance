// Pipeline CI/CD pour TaskManager (front Next.js + back Symfony + MySQL),
// construit sur la stack Docker de docker-compose.prod.yml (voir DOCKER.md).
// Ne nécessite rien d'installé sur l'agent Jenkins à part Docker + Docker
// Compose v2 : tout le reste (Node, PHP, Composer, npm...) tourne à
// l'intérieur des images déjà définies par back/Dockerfile et front/Dockerfile.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        // Vide par défaut => le stage "Push images" est sauté : le pipeline
        // doit pouvoir tourner (build + vérifications) sans aucun registre
        // configuré, dès le premier essai.
        string(name: 'REGISTRY', defaultValue: '', description: "Registre Docker cible (ex: registry.example.com/taskmanager). Vide = ne pas pousser les images.")
        // false par défaut => le stage "Déploiement" est sauté : un run de
        // pipeline standard (PR, branche de dev...) ne déploie jamais tout seul.
        booleanParam(name: 'DEPLOY', defaultValue: false, description: "Déployer en prod après le build (uniquement sur main, nécessite les credentials décrits dans JENKINS.md)")
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Préparer .env') {
            steps {
                // Secret file credential contenant un .env de prod complet
                // (voir JENKINS.md section Prérequis) : jamais committé,
                // jamais affiché en clair dans les logs.
                withCredentials([file(credentialsId: 'taskmanager-env', variable: 'ENV_FILE')]) {
                    sh 'cp "$ENV_FILE" .env'
                }
            }
        }

        stage('Build images') {
            steps {
                sh 'docker compose -f docker-compose.prod.yml build'
            }
        }

        stage('Vérifications') {
            parallel {
                stage('Front : typecheck + lint') {
                    steps {
                        sh 'docker compose -f docker-compose.prod.yml run --rm --no-deps front sh -c "npm run typecheck && npm run lint"'
                    }
                }
                stage('Back : validations') {
                    steps {
                        // --entrypoint sh : court-circuite l'entrypoint.sh de
                        // l'image (qui attend MySQL et joue les migrations) --
                        // ces vérifications sont purement statiques, aucune
                        // base de données n'est démarrée ici (--no-deps).
                        //
                        // Pas de phpunit/php-cs-fixer/phpstan dans ce projet
                        // (aucun de ces paquets n'est en require-dev) : on se
                        // limite donc à des vérifications réellement
                        // disponibles aujourd'hui. Ajoutez une étape dédiée
                        // ici le jour où une vraie suite de tests existe.
                        sh '''
                          docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh back -c "
                            composer validate --strict &&
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
                    branch 'main'
                    expression { return params.REGISTRY?.trim() }
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'taskmanager-registry-creds', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh '''
                      echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
                      REGISTRY="$REGISTRY" TAG="${BUILD_NUMBER}" docker compose -f docker-compose.prod.yml build
                      REGISTRY="$REGISTRY" TAG="${BUILD_NUMBER}" docker compose -f docker-compose.prod.yml push
                    '''
                }
            }
        }

        stage('Déploiement') {
            when {
                allOf {
                    branch 'main'
                    expression { return params.DEPLOY }
                }
            }
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'taskmanager-deploy-ssh', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER'),
                    string(credentialsId: 'taskmanager-deploy-host', variable: 'DEPLOY_HOST')
                ]) {
                    sh '''
                      scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
                          docker-compose.prod.yml .env \
                          "$SSH_USER@$DEPLOY_HOST:/opt/taskmanager/"
                      ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOY_HOST" \
                          'cd /opt/taskmanager && docker compose -f docker-compose.prod.yml up -d'
                    '''
                }
            }
        }
    }

    post {
        always {
            // Le .env contient des secrets (copiés depuis la credential
            // "taskmanager-env") : jamais laissé sur le disque de l'agent
            // une fois le build terminé.
            sh 'rm -f .env'
        }
    }
}
