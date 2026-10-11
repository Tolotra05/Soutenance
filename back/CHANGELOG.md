# Changelog

## Non publié

### Ajout de 20 nouveaux endpoints pour couvrir les fonctionnalités orphelines (audit de couverture API)

Un audit front↔back a montré que seul le cycle de vie du projet (soumission,
validation, assignation, statut, membres) était branché sur une vraie API ;
tout le travail *dans* le projet (sous-tâches, commentaires, pièces jointes,
demandes de modification, demandes de tâche client, requêtes, notifications)
ainsi que la gestion de compte (inscription, mot de passe oublié, validation
de compte, édition de profil) ne vivait que dans le state React local,
perdu au refresh et jamais partagé entre utilisateurs/appareils.

- **Nouvelles tables** : `subtask`, `subtask_comment`, `attachment`,
  `modification_request`, `task_request`, `requete`, `notification`, plus
  `accountStatus`/`resetCode` sur `user`.
- **Nouveaux endpoints** : voir `README_PROJETS.md` (section API) pour la
  liste complète par ressource. Toutes les nouvelles routes utilisent
  `publicId`, jamais l'id interne, et suivent les mêmes règles d'autorisation
  que l'existant (404 pour une ressource introuvable, jamais 403).
- **Upload de fichiers réel** (`POST /api/uploads`, `POST /api/attachments`) :
  remplace le pattern front précédent (`FileReader` → `data:` URL en base64,
  jamais persistée nulle part) par un vrai stockage sous `public/uploads/`.
- **Front entièrement rebranché** sur ces nouveaux endpoints (contexts
  `projects-context.tsx`, `users-context.tsx`, `notifications-context.tsx`),
  à l'exception de la chaîne d'upload de fichiers dans les dialogues imbriqués
  (livrables de sous-tâche, pièce jointe projet, photo de demande de tâche) —
  reportée, voir le rapport d'audit API pour le détail.
- **Endpoints identifiés comme orphelins** (jamais appelés par le front) :
  `GET/POST/DELETE /api/projects/{id}/team-members[/{memberId}]` et
  `GET/PATCH/DELETE /api/projects/{id}/events[/{eventId}]` (seul le `POST`
  événement est utilisé). **Conservés** plutôt que supprimés : ce sont des
  fonctionnalités réelles et testées (équipe projet relationnelle, agenda
  complet) qu'une UI future pourrait consommer sans travail backend
  supplémentaire ; les supprimer aurait détruit du code fonctionnel pour un
  bénéfice de nettoyage marginal.

### Breaking change — remédiation IDOR : l'API utilise désormais `publicId` (UUID) au lieu de l'id interne

Toutes les routes API (`/api/projects/{id}`, `/api/projects/{id}/events/{eventId}`,
`/api/projects/{projectId}/members/{userId}`, etc.) et toutes les réponses JSON
exposent désormais l'identifiant public (UUID v4) de chaque ressource —
`user`, `project`, `project_member`, `calendar_event`, `project_status_log` —
à la place de l'ancien id auto-incrémenté.

- **Impact client API** : tout ce qui envoyait un id numérique (dans une URL
  ou un corps de requête, ex. `managerId`, `userId`) doit désormais envoyer
  l'UUID (`id`) renvoyé par l'API, pas l'ancien id entier. Un ancien id
  numérique renvoie 404 (jamais 403).
- **Compatibilité** : le nom des champs JSON ne change pas (`id`, `userId`,
  `managerId`...) — seule la *valeur* devient un UUID. Le front de ce dépôt
  n'a nécessité aucun changement de routes/types grâce à ça (voir le rapport
  de migration pour le détail).
- Les id internes auto-incrémentés restent en base (clé primaire, jointures)
  mais ne sont plus jamais exposés par l'API.

Voir `migrations/Version20261009120000.php` pour le détail du schéma.
