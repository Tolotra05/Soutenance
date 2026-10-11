COMPOSE      = docker compose
COMPOSE_PROD = docker compose -f docker-compose.prod.yml

.PHONY: up down logs migrate fixtures bash-front bash-back test build up-prod down-prod

## Démarre la stack de dev (build si nécessaire)
up:
	$(COMPOSE) up -d --build

## Arrête la stack de dev
down:
	$(COMPOSE) down

## Logs de tous les services, ou d'un seul : make logs s=back
logs:
	$(COMPOSE) logs -f $(s)

## Rejoue les migrations Doctrine
migrate:
	$(COMPOSE) exec back php bin/console doctrine:migrations:migrate --no-interaction

## Pas de DoctrineFixturesBundle dans ce projet : les comptes/projets de démo
## sont injectés par les migrations elles-mêmes (idempotentes, voir
## back/migrations/Version2026092*.php). Cette cible est donc un alias de
## `migrate`, gardé pour coller au workflow Makefile standard.
fixtures:
	$(COMPOSE) exec back php bin/console doctrine:migrations:migrate --no-interaction

## Shell dans le conteneur front
bash-front:
	$(COMPOSE) exec front sh

## Shell dans le conteneur back
bash-back:
	$(COMPOSE) exec back sh

## Aucune suite PHPUnit n'est installée pour l'instant (pas de
## phpunit/phpunit ni symfony/test-pack en require-dev) : on se contente
## donc d'un contrôle de types front + d'une validation du mapping Doctrine
## côté back. Ajoutez `composer require --dev phpunit/phpunit symfony/test-pack`
## puis une vraie cible `bin/phpunit` le jour où des tests existent.
test:
	$(COMPOSE) exec front npm run typecheck
	$(COMPOSE) exec back php bin/console doctrine:schema:validate

## Rebuild les images sans redémarrer les conteneurs
build:
	$(COMPOSE) build

## Démarre la stack de prod
up-prod:
	$(COMPOSE_PROD) up -d --build

## Arrête la stack de prod
down-prod:
	$(COMPOSE_PROD) down
