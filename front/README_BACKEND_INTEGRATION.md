# Intégration Front mapp + Backend Symfony Projets

Le front `mapp` reste la base de l'interface. Le module **Projets** utilise maintenant le backend Symfony situé dans `TaskManager-back/` lorsque le JWT Symfony est disponible.

## Démarrage

### Front Next.js

```bash
npm install
npm run dev
```

Par défaut, le front appelle `http://127.0.0.1:8000`.
Pour changer l'URL :

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Backend Symfony

```bash
cd TaskManager-back
composer install
php bin/console doctrine:migrations:migrate
symfony server:start --port=8000
```

Il faut également configurer la base de données et les clés JWT selon `.env.example`.

## Ce qui est branché

- authentification front existante -> tentative d'obtention d'un JWT Symfony en parallèle ;
- chargement des projets depuis `GET /api/projects` ;
- création via `POST /api/projects` ;
- validation/rejet ;
- changement de statut ;
- assignation du chef de projet ;
- ajout/retrait des membres ;
- planification des événements/rendez-vous projet ;
- synchronisation des statuts avec `ProjectStatusLog`.

Le reste de l'application conserve son fonctionnement frontend existant. Si le backend n'est pas disponible ou si le compte de démonstration n'existe pas dans la base Symfony, le front conserve son comportement local pour éviter de casser les autres modules.
