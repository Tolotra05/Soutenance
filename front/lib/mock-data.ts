import type {
  User, Project, Subtask, AppNotification,
  ProgressPoint, Attachment, CalendarEvent,
} from '@/types';

// ============================================================
// MOCK DATA — static dataset for the frontend prototype
// ============================================================

// ---------- Users
export const mockUsers: User[] = [
  // Admin
  {
    id: 'u-admin-1',
    name: 'Sophie Laurent',
    email: 'sophie.laurent@proflow.io',
    role: 'admin',
    password: 'admin123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie&backgroundColor=b6e3f4',
    phone: '+33 6 12 34 56 78',
    whatsapp: '+33 6 12 34 56 78',
    address: '12 Rue de la Paix, 75002 Paris',
    bio: 'Directrice générale de ProFlow. Passionnée par la gestion de projet et l\'innovation digitale.',
    createdAt: '2026-01-15T08:00:00Z',
  },
  // Chefs de projet
  {
    id: 'u-mgr-1',
    name: 'Karim Benali',
    email: 'karim.benali@proflow.io',
    role: 'chef_de_projet',
    password: 'manager123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim&backgroundColor=c0aede',
    phone: '+33 6 23 45 67 89',
    whatsapp: '+33 6 23 45 67 89',
    address: '45 Avenue Victor Hugo, 69006 Lyon',
    bio: 'Chef de projet senior avec 8 ans d\'expérience en gestion de projets web et mobile.',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'u-mgr-2',
    name: 'Élodie Martin',
    email: 'elodie.martin@proflow.io',
    role: 'chef_de_projet',
    password: 'proflow123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elodie&backgroundColor=d1f4e0',
    phone: '+33 6 34 56 78 90',
    whatsapp: '+33 6 34 56 78 90',
    address: '8 Rue des Lilas, 33000 Bordeaux',
    bio: 'Chef de projet spécialisée en refonte UI/UX et design system.',
    createdAt: '2026-02-10T08:00:00Z',
  },
  // Membres (Designers, DevOps, devs...)
  {
    id: 'u-emp-1',
    name: 'Thomas Dubois',
    email: 'thomas.dubois@proflow.io',
    role: 'membre',
    memberSpecialty: 'Frontend',
    password: 'employe123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas&backgroundColor=ffd5dc',
    phone: '+33 6 45 67 89 01',
    whatsapp: '+33 6 45 67 89 01',
    address: '23 Rue du Commerce, 75015 Paris',
    bio: 'Développeur React/Next.js avec une passion pour les interfaces performantes et accessibles.',
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'u-emp-2',
    name: 'Lina Chen',
    email: 'lina.chen@proflow.io',
    role: 'membre',
    memberSpecialty: 'Designer',
    password: 'proflow123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lina&backgroundColor=c4f0d0',
    phone: '+33 6 56 78 90 12',
    whatsapp: '+33 6 56 78 90 12',
    address: '15 Rue du Faubourg, 31000 Toulouse',
    bio: 'Designer UI/UX créative, spécialisée dans la création de design systems et maquettes haute fidélité.',
    createdAt: '2026-03-05T08:00:00Z',
  },
  {
    id: 'u-emp-3',
    name: 'Marco Rossi',
    email: 'marco.rossi@proflow.io',
    role: 'membre',
    memberSpecialty: 'Backend',
    password: 'proflow123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marco&backgroundColor=ffdfbf',
    phone: '+33 6 67 89 01 23',
    whatsapp: '+33 6 67 89 01 23',
    address: '7 Boulevard Gambetta, 13001 Marseille',
    bio: 'Développeur backend expert Laravel/PHP et architecte de bases de données MySQL.',
    createdAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 'u-emp-4',
    name: 'Aïcha Diallo',
    email: 'aicha.diallo@proflow.io',
    role: 'membre',
    memberSpecialty: 'Chef de projet junior',
    password: 'proflow123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aicha&backgroundColor=b6e3f4',
    phone: '+33 6 78 90 12 34',
    whatsapp: '+33 6 78 90 12 34',
    address: '31 Rue de Strasbourg, 44000 Nantes',
    bio: 'Chef de projet junior motivée, spécialisée dans l\'analyse des besoins et la coordination d\'équipe.',
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: 'u-emp-5',
    name: 'Jakub Nowak',
    email: 'jakub.nowak@proflow.io',
    role: 'membre',
    memberSpecialty: 'DevOps',
    password: 'proflow123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jakub&backgroundColor=c0aede',
    phone: '+33 6 89 01 23 45',
    whatsapp: '+33 6 89 01 23 45',
    address: '42 Rue de la République, 67000 Strasbourg',
    bio: 'Ingénieur DevOps spécialisé dans les pipelines CI/CD et le déploiement cloud.',
    createdAt: '2026-03-20T08:00:00Z',
  },
  // Clients
  {
    id: 'u-cli-1',
    name: 'Camille Rousseau',
    email: 'camille@techstart.fr',
    role: 'client',
    password: 'client123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Camille&backgroundColor=ffd5dc',
    phone: '+33 7 11 22 33 44',
    whatsapp: '+33 7 11 22 33 44',
    company: 'TechStart SAS',
    address: '56 Avenue des Champs-Élysées, 75008 Paris',
    bio: 'Fondatrice de TechStart, startup spécialisée dans la vente en ligne de technologies innovantes.',
    createdAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'u-cli-2',
    name: 'Olivier Lefèvre',
    email: 'olivier@ecoshop.com',
    role: 'client',
    password: 'proflow123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivier&backgroundColor=d1f4e0',
    phone: '+33 7 22 33 44 55',
    whatsapp: '+33 7 22 33 44 55',
    company: 'EcoShop SARL',
    address: '18 Rue du Marché, 69002 Lyon',
    bio: 'Directeur d\'EcoShop, magasin en ligne de produits écologiques et durables.',
    createdAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'u-cli-3',
    name: 'Nadia Benali',
    email: 'nadia@urbanvibes.io',
    role: 'client',
    password: 'proflow123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia&backgroundColor=b6e3f4',
    phone: '+33 7 33 44 55 66',
    whatsapp: '+33 7 33 44 55 66',
    company: 'UrbanVibes',
    address: '29 Rue de la République, 13001 Marseille',
    bio: 'Gérante d\'UrbanVibes, marque de sport et bien-être urbain.',
    createdAt: '2026-04-10T08:00:00Z',
  },
];

// ---------- Helpers
function makeAttachment(id: string, name: string, type: string, by: string): Attachment {
  return { id, fileName: name, fileType: type, url: `https://example.com/files/${id}`, uploadedBy: by, uploadedAt: '2026-06-15T10:00:00Z' };
}

function cmt(id: string, subtaskId: string, authorId: string, content: string, at: string) {
  return { id, subtaskId, authorId, content, createdAt: at };
}

function makeProgressTimeline(start: string, end: string, actualNow: number): ProgressPoint[] {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const today = Date.now();
  const points: ProgressPoint[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = s + ((e - s) * i) / steps;
    const date = new Date(t).toISOString();
    const planned = Math.round((100 * i) / steps);
    let actual = 0;
    if (t <= today) {
      const ratio = Math.min(1, (t - s) / (today - s));
      actual = Math.round(actualNow * ratio);
    }
    points.push({ date, planned, actual });
  }
  if (today <= e) {
    const lastActual = points.filter((p) => new Date(p.date).getTime() <= today);
    if (lastActual.length > 0) {
      lastActual[lastActual.length - 1].actual = actualNow;
    }
  }
  return points;
}

// ---------- Subtasks
const subtask1: Subtask[] = [
  {
    id: 'st-1-1', projectId: 'p-1', title: 'Cadrage & analyse des besoins',
    description: 'Recueillir et documenter les besoins fonctionnels du client, valider le périmètre.',
    status: 'done', priority: 'high', assignedToId: 'u-emp-4', dependsOnId: null,
    startDate: '2026-06-01T00:00:00Z', dueDate: '2026-06-07T00:00:00Z',
    progress: 100, attachments: [],
    comments: [
      cmt('c-1-1-1', 'st-1-1', 'u-cli-1', 'Bonjour, n\'oubliez pas que le paiement Stripe est prioritaire.', '2026-06-02T09:00:00Z'),
      cmt('c-1-1-2', 'st-1-1', 'u-emp-4', 'C\'est noté. Le périmètre inclut la connexion Stripe et la gestion des devis.', '2026-06-02T11:30:00Z'),
    ],
    createdAt: '2026-05-28T08:00:00Z',
  },
  {
    id: 'st-1-2', projectId: 'p-1', title: 'Wireframes & maquettes',
    description: 'Créer les wireframes et maquettes haute fidélité de l\'interface.',
    status: 'done', priority: 'high', assignedToId: 'u-emp-2', dependsOnId: 'st-1-1',
    startDate: '2026-06-08T00:00:00Z', dueDate: '2026-06-20T00:00:00Z',
    progress: 100, attachments: [makeAttachment('att-1', 'maquettes_v2.fig', 'application/octet-stream', 'u-emp-2')],
    comments: [
      cmt('c-1-2-1', 'st-1-2', 'u-cli-1', 'Les maquettes sont superbes, j\'aime beaucoup la direction visuelle !', '2026-06-18T10:00:00Z'),
      cmt('c-1-2-2', 'st-1-2', 'u-emp-2', 'Merci ! Prochaine étape : l\'intégration frontend.', '2026-06-18T12:00:00Z'),
    ],
    createdAt: '2026-05-28T08:00:00Z',
  },
  {
    id: 'st-1-3', projectId: 'p-1', title: 'Développement Frontend',
    description: 'Intégrer les maquettes en React/Next.js avec TailwindCSS.',
    status: 'in_progress', priority: 'urgent', assignedToId: 'u-emp-1', dependsOnId: 'st-1-2',
    startDate: '2026-06-21T00:00:00Z', dueDate: '2026-07-15T00:00:00Z',
    progress: 60, attachments: [],
    comments: [
      cmt('c-1-3-1', 'st-1-3', 'u-emp-1', 'La page catalogue est prête, je passe aux pages produit maintenant.', '2026-06-28T14:00:00Z'),
    ],
    createdAt: '2026-05-28T08:00:00Z',
  },
  {
    id: 'st-1-4', projectId: 'p-1', title: 'Développement Backend & API',
    description: 'Créer l\'API REST (Laravel) et la base de données MySQL.',
    status: 'in_progress', priority: 'high', assignedToId: 'u-emp-3', dependsOnId: 'st-1-1',
    startDate: '2026-06-10T00:00:00Z', dueDate: '2026-07-10T00:00:00Z',
    progress: 70, attachments: [],
    comments: [
      cmt('c-1-4-1', 'st-1-4', 'u-emp-3', 'J\'ai ajouté le cache Redis pour optimiser les performances, en attente d\'approbation.', '2026-06-30T09:00:00Z'),
    ],
    createdAt: '2026-05-28T08:00:00Z',
  },
  {
    id: 'st-1-5', projectId: 'p-1', title: 'Tests & QA',
    description: 'Rédiger et exécuter les scénarios de test, corriger les bugs.',
    status: 'todo', priority: 'medium', assignedToId: 'u-emp-5', dependsOnId: 'st-1-3',
    startDate: '2026-07-16T00:00:00Z', dueDate: '2026-07-25T00:00:00Z',
    progress: 0, attachments: [], comments: [],
    createdAt: '2026-05-28T08:00:00Z',
  },
  {
    id: 'st-1-6', projectId: 'p-1', title: 'Déploiement & livraison',
    description: 'Déployer sur Netlify et remettre le projet au client.',
    status: 'todo', priority: 'high', assignedToId: null, dependsOnId: 'st-1-5',
    startDate: '2026-07-26T00:00:00Z', dueDate: '2026-07-31T00:00:00Z',
    progress: 0, attachments: [], comments: [],
    createdAt: '2026-05-28T08:00:00Z',
  },
];

const subtask2: Subtask[] = [
  {
    id: 'st-2-1', projectId: 'p-2', title: 'Cadrage & audit UX existant',
    description: 'Analyser le site actuel et identifier les points de friction.',
    status: 'done', priority: 'medium', assignedToId: 'u-emp-2', dependsOnId: null,
    startDate: '2026-07-01T00:00:00Z', dueDate: '2026-07-05T00:00:00Z',
    progress: 100, attachments: [], comments: [],
    createdAt: '2026-06-28T08:00:00Z',
  },
  {
    id: 'st-2-2', projectId: 'p-2', title: 'Refonte visuelle',
    description: 'Nouvelle charte graphique et design system.',
    status: 'review', priority: 'high', assignedToId: 'u-emp-2', dependsOnId: 'st-2-1',
    startDate: '2026-07-06T00:00:00Z', dueDate: '2026-07-18T00:00:00Z',
    progress: 85, attachments: [makeAttachment('att-2', 'design_system.fig', 'application/octet-stream', 'u-emp-2')],
    comments: [
      cmt('c-2-2-1', 'st-2-2', 'u-mgr-2', 'J\'ai validé la direction, il reste les variantes de boutons à finaliser.', '2026-07-15T10:00:00Z'),
    ],
    createdAt: '2026-06-28T08:00:00Z',
  },
  {
    id: 'st-2-3', projectId: 'p-2', title: 'Intégration nouvelle UI',
    description: 'Remplacer les anciens composants par les nouveaux.',
    status: 'todo', priority: 'high', assignedToId: 'u-emp-1', dependsOnId: 'st-2-2',
    startDate: '2026-07-19T00:00:00Z', dueDate: '2026-08-05T00:00:00Z',
    progress: 0, attachments: [], comments: [],
    createdAt: '2026-06-28T08:00:00Z',
  },
];

const subtask3: Subtask[] = [
  {
    id: 'st-3-1', projectId: 'p-3', title: 'Cadrage & architecture technique',
    description: 'Définir l\'architecture, le choix des technos et le schéma de base de données.',
    status: 'todo', priority: 'high', assignedToId: 'u-emp-3', dependsOnId: null,
    startDate: '2026-09-01T00:00:00Z', dueDate: '2026-09-07T00:00:00Z',
    progress: 0, attachments: [], comments: [],
    createdAt: '2026-08-28T08:00:00Z',
  },
  {
    id: 'st-3-2', projectId: 'p-3', title: 'Design & prototypage',
    description: 'Maquettes et prototype interactif.',
    status: 'todo', priority: 'medium', assignedToId: 'u-emp-2', dependsOnId: null,
    startDate: '2026-09-01T00:00:00Z', dueDate: '2026-09-10T00:00:00Z',
    progress: 0, attachments: [], comments: [],
    createdAt: '2026-08-28T08:00:00Z',
  },
];

// ---------- Calendar events
const calendarEvents: Record<string, CalendarEvent[]> = {
  'p-1': [
    { id: 'ev-1-1', projectId: 'p-1', title: 'Début du cadrage', date: '2026-06-01T00:00:00Z', type: 'cadrage' },
    { id: 'ev-1-2', projectId: 'p-1', title: 'Rendez-vous client — rapport de cadrage', date: '2026-06-10T00:00:00Z', type: 'rendez_vous', description: 'Présentation du cadrage et du périmètre au client.' },
    { id: 'ev-1-3', projectId: 'p-1', title: 'Fin du développement', date: '2026-07-15T00:00:00Z', type: 'developpement' },
    { id: 'ev-1-4', projectId: 'p-1', title: 'Livraison finale', date: '2026-07-31T00:00:00Z', type: 'livraison' },
  ],
  'p-2': [
    { id: 'ev-2-1', projectId: 'p-2', title: 'Début du cadrage', date: '2026-07-01T00:00:00Z', type: 'cadrage' },
    { id: 'ev-2-2', projectId: 'p-2', title: 'Rendez-vous client — rapport de cadrage', date: '2026-07-08T00:00:00Z', type: 'rendez_vous' },
    { id: 'ev-2-3', projectId: 'p-2', title: 'Livraison finale', date: '2026-08-15T00:00:00Z', type: 'livraison' },
  ],
  'p-3': [
    { id: 'ev-3-1', projectId: 'p-3', title: 'Début du cadrage', date: '2026-09-01T00:00:00Z', type: 'cadrage' },
  ],
};

// ---------- Projects
export const mockProjects: Project[] = [
  {
    id: 'p-1',
    title: 'Plateforme E-commerce TechStart',
    description: 'Création d\'une plateforme e-commerce complète avec gestion de catalogue, panier, paiement Stripe et espace client. La plateforme doit être responsive et optimisée SEO.',
    clientId: 'u-cli-1',
    status: 'in_progress',
    priority: 'high',
    managerId: 'u-mgr-1',
    startDate: '2026-06-01T00:00:00Z',
    endDate: '2026-07-31T00:00:00Z',
    budget: 45000,
    progress: 55,
    category: 'E-commerce',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=techstart&backgroundColor=221,83,53',
    platformUsers: 'Administrateurs boutique, clients, gestionnaires de stock, livreurs',
    desiredFeatures: 'Catalogue produits, panier, paiement Stripe, espace client, suivi de commandes, gestion des stocks, devis & factures, notifications email',
    necessaryPages: 'Accueil, Catalogue, Fiche produit, Panier, Checkout, Espace client, Administration',
    plannedFeatures: 'Gestion multi-boutique, système de promos, avis produits, landing pages SEO',
    members: [
      { userId: 'u-cli-1', role: 'client', joinedAt: '2026-05-20T00:00:00Z' },
      { userId: 'u-mgr-1', role: 'chef_de_projet', joinedAt: '2026-05-22T00:00:00Z' },
      { userId: 'u-emp-1', role: 'membre', joinedAt: '2026-06-01T00:00:00Z' },
      { userId: 'u-emp-2', role: 'membre', joinedAt: '2026-06-01T00:00:00Z' },
      { userId: 'u-emp-3', role: 'membre', joinedAt: '2026-06-01T00:00:00Z' },
      { userId: 'u-emp-4', role: 'membre', joinedAt: '2026-06-01T00:00:00Z' },
      { userId: 'u-emp-5', role: 'membre', joinedAt: '2026-06-15T00:00:00Z' },
    ],
    subtasks: subtask1,
    progressTimeline: makeProgressTimeline('2026-06-01T00:00:00Z', '2026-07-31T00:00:00Z', 55),
    calendarEvents: calendarEvents['p-1'],
    attachments: [makeAttachment('att-p1-1', 'cahier_des_charges.pdf', 'application/pdf', 'u-cli-1'), makeAttachment('att-p1-2', 'logo_techstart.png', 'image/png', 'u-cli-1')],
    modifications: [
      { id: 'mod-1', projectId: 'p-1', subtaskId: 'st-1-3', target: 'subtask', requestedById: 'u-emp-1', requestedByName: 'Thomas Dubois', field: 'dueDate', oldValue: '2026-07-15', newValue: '2026-07-22', reason: 'Le délai initial ne suffit pas suite aux retours du client sur les maquettes. Une semaine supplémentaire est nécessaire.', status: 'pending', reviewedById: null, reviewNote: '', createdAt: '2026-09-01T10:00:00Z', reviewedAt: null },
      { id: 'mod-2', projectId: 'p-1', subtaskId: 'st-1-4', target: 'subtask', requestedById: 'u-emp-3', requestedByName: 'Marco Rossi', field: 'description', oldValue: 'Créer l\'API REST (Laravel) et la base de données MySQL.', newValue: 'Créer l\'API REST (Laravel), la base de données MySQL et intégrer un système de cache Redis pour optimiser les performances.', reason: 'Les temps de réponse sur la gestion du catalogue dépassent les 2 secondes. Ajouter Redis améliorerait drastiquement les performances.', status: 'approved', reviewedById: 'u-admin-1', reviewNote: 'Demande justifiée, le cache Redis est une excellente idée pour les performances.', createdAt: '2026-08-28T14:00:00Z', reviewedAt: '2026-08-29T09:00:00Z' },
    ],
    taskRequests: [
      { id: 'tr-1', projectId: 'p-1', clientId: 'u-cli-1', title: 'Ajouter une page FAQ', description: 'Ajouter une page FAQ responsive accessible depuis le pied de page du site, avec 8 questions/réponses pré-remplies.', priority: 'low', besoinDate: '2026-09-22T00:00:00Z', photoUrl: null, photoName: null, status: 'pending', reviewedById: null, reviewedAt: null, reviewNote: '', createdAt: '2026-09-14T09:00:00Z' },
    ],
    requetes: [
      { id: 'rq-1', projectId: 'p-1', subtaskId: 'st-1-4', createdById: 'u-mgr-1', createdByName: 'Sophie Martin', content: 'Pouvez-vous nous envoyer le logo définitif de la marque en haute définition (format PNG) pour finaliser l\'intégration ?', status: 'pending', createdAt: '2026-09-19T09:30:00Z', respondedAt: null, response: null },
      { id: 'rq-2', projectId: 'p-1', subtaskId: null, createdById: 'u-admin-1', createdByName: 'Hugo Lombard', content: 'Merci de transmettre les identifiants de la plateforme de test ainsi que l\'accès au compte Stripe sandbox.', status: 'answered', createdAt: '2026-09-10T14:00:00Z', respondedAt: '2026-09-11T10:15:00Z', response: { text: 'Voici les accès sandbox : voir la pièce jointe.', attachmentUrl: '#', attachmentName: 'acces_stripe_sandbox.txt', attachmentType: 'text/plain', at: '2026-09-11T10:15:00Z' } },
    ],
    clientMeeting: { date: '2026-06-10T10:00:00Z', note: 'Rapport de cadrage validé avec les 6 pages et le paiement Stripe.' },
    createdAt: '2026-05-20T08:00:00Z',
  },
  {
    id: 'p-2',
    title: 'Refonte Site Vitrine EcoShop',
    description: 'Refonte complète du site vitrine d\'EcoShop avec nouveau design system, amélioration des performances et accessibilité. Migration vers Next.js.',
    clientId: 'u-cli-2',
    status: 'in_progress',
    priority: 'medium',
    managerId: 'u-mgr-2',
    startDate: '2026-07-01T00:00:00Z',
    endDate: '2026-08-15T00:00:00Z',
    budget: 22000,
    progress: 35,
    category: 'Site vitrine',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=ecoshop&backgroundColor=142,71,45',
    platformUsers: 'Visiteurs, admin contenu, responsable marketing',
    desiredFeatures: 'Nouveau design system, pages produit améliorées, blog, formulaire de contact',
    necessaryPages: 'Accueil, À propos, Produits, Blog, Contact',
    plannedFeatures: 'Amélioration des performances, accessibilité WCAG, migration Next.js',
    members: [
      { userId: 'u-cli-2', role: 'client', joinedAt: '2026-06-25T00:00:00Z' },
      { userId: 'u-mgr-2', role: 'chef_de_projet', joinedAt: '2026-06-26T00:00:00Z' },
      { userId: 'u-emp-2', role: 'membre', joinedAt: '2026-07-01T00:00:00Z' },
      { userId: 'u-emp-1', role: 'membre', joinedAt: '2026-07-01T00:00:00Z' },
    ],
    subtasks: subtask2,
    progressTimeline: makeProgressTimeline('2026-07-01T00:00:00Z', '2026-08-15T00:00:00Z', 35),
    calendarEvents: calendarEvents['p-2'],
    attachments: [makeAttachment('att-p2-1', 'brief_refonte.pdf', 'application/pdf', 'u-cli-2')],
    modifications: [
      { id: 'mod-3', projectId: 'p-2', subtaskId: 'st-2-3', target: 'subtask', requestedById: 'u-emp-1', requestedByName: 'Thomas Dubois', field: 'title', oldValue: 'Intégration nouvelle UI', newValue: 'Intégration nouvelle UI + migration composants legacy', reason: 'L\'ancien site contient plus de composants legacy que prévu. Le titre devrait refléter le périmètre réel.', status: 'rejected', reviewedById: 'u-admin-1', reviewNote: 'Le changement de titre n\'est pas nécessaire. La description suffit à clarifier le périmètre.', createdAt: '2026-08-15T11:00:00Z', reviewedAt: '2026-08-16T08:00:00Z' },
    ],
    taskRequests: [
      { id: 'tr-2', projectId: 'p-2', clientId: 'u-cli-2', title: 'Ajouter un formulaire de devis', description: 'Formulaire de devis en ligne (nom, email, descriptif du projet) avec envoi par email.', priority: 'medium', besoinDate: '2026-08-25T00:00:00Z', photoUrl: null, photoName: null, status: 'approved', reviewedById: 'u-admin-1', reviewedAt: '2026-08-20T10:00:00Z', reviewNote: 'Approuvé — une sous-tâche a été ajoutée au projet.', createdAt: '2026-08-19T09:00:00Z' },
    ],
    requetes: [
      { id: 'rq-3', projectId: 'p-2', subtaskId: 'st-2-1', createdById: 'u-mgr-2', createdByName: 'Nadia Benali', content: 'Pouvez-vous nous envoyer une photo du local commercial actuel afin d\'évaluer la refonte de la vitrine ?', status: 'pending', createdAt: '2026-09-18T08:00:00Z', respondedAt: null, response: null },
    ],
    clientMeeting: null,
    createdAt: '2026-06-25T08:00:00Z',
  },
  {
    id: 'p-3',
    title: 'Application Mobile UrbanVibes Fitness',
    description: 'Application mobile de coaching fitness personnalisé avec suivi des entraînements, plans nutritionnels et communauté. iOS + Android (React Native).',
    clientId: 'u-cli-3',
    status: 'pending',
    priority: 'urgent',
    managerId: null,
    startDate: '2026-09-01T00:00:00Z',
    endDate: '2026-12-15T00:00:00Z',
    budget: 75000,
    progress: 0,
    category: 'Application mobile',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=urbanvibes&backgroundColor=172,76,40',
    platformUsers: 'Coach sportifs, clients abonnés, administrateurs',
    desiredFeatures: 'Suivi des entraînements, plans nutritionnels, communauté, notifications push, abonnements',
    necessaryPages: 'Onboarding, Écran d\'accueil, Suivi entraînement, Nutrition, Communauté, Profil, Admin',
    plannedFeatures: 'Synchronisation montre connectée, coaching IA, marketplace de coachs',
    members: [
      { userId: 'u-cli-3', role: 'client', joinedAt: '2026-08-20T00:00:00Z' },
    ],
    subtasks: subtask3,
    progressTimeline: [],
    calendarEvents: calendarEvents['p-3'],
    attachments: [makeAttachment('att-p3-1', 'brief_app_fitness.pdf', 'application/pdf', 'u-cli-3')],
    modifications: [],
    taskRequests: [],
    requetes: [],
    clientMeeting: null,
    createdAt: '2026-08-20T08:00:00Z',
  },
  {
    id: 'p-4',
    title: 'Dashboard Analytics B2B',
    description: 'Tableau de bord analytics B2B avec visualisation de données en temps réel, exports PDF/Excel et gestion multi-tenant.',
    clientId: 'u-cli-1',
    status: 'validated',
    priority: 'high',
    managerId: null,
    startDate: '2026-09-10T00:00:00Z',
    endDate: '2026-11-30T00:00:00Z',
    budget: 38000,
    progress: 0,
    category: 'Dashboard',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=dashb2b&backgroundColor=38,92,50',
    platformUsers: 'Analystes, managers, responsables commerciaux',
    desiredFeatures: 'Visualisation temps réel, exports PDF/Excel, multi-tenant, alertes',
    necessaryPages: 'Login, Dashboard principal, Détail KPI, Rapports, Administration',
    plannedFeatures: 'Machine learning prédictif, tableaux de bord personnalisables, intégration BI',
    members: [
      { userId: 'u-cli-1', role: 'client', joinedAt: '2026-08-25T00:00:00Z' },
    ],
    subtasks: [],
    progressTimeline: [],
    calendarEvents: [],
    attachments: [makeAttachment('att-p4-1', 'spec_analytics.pdf', 'application/pdf', 'u-cli-1')],
    modifications: [],
    taskRequests: [],
    requetes: [],
    clientMeeting: null,
    createdAt: '2026-08-25T08:00:00Z',
  },
  {
    id: 'p-5',
    title: 'Refonte Logo & Identité — UrbanVibes',
    description: 'Création d\'une nouvelle identité visuelle : logo, charte graphique, déclinaisons print et digital.',
    clientId: 'u-cli-3',
    status: 'rejected',
    priority: 'low',
    managerId: null,
    startDate: '2026-08-15T00:00:00Z',
    endDate: '2026-09-15T00:00:00Z',
    budget: 8000,
    progress: 0,
    rejectionReason: 'Le budget alloué est insuffisant par rapport au périmètre demandé. Nous vous invitons à revoir le budget ou réduire le périmètre (par ex. ne garder que le logo dans un premier temps).',
    category: 'Design',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=urbanvibes2&backgroundColor=0,84,60',
    platformUsers: '',
    desiredFeatures: '',
    necessaryPages: '',
    plannedFeatures: '',
    members: [
      { userId: 'u-cli-3', role: 'client', joinedAt: '2026-08-10T00:00:00Z' },
    ],
    subtasks: [],
    progressTimeline: [],
    calendarEvents: [],
    attachments: [],
    modifications: [],
    taskRequests: [],
    requetes: [],
    clientMeeting: null,
    statusChangedAt: '2026-09-15T06:00:00Z',
    createdAt: '2026-08-10T08:00:00Z',
  },
  {
    id: 'p-6',
    title: 'Application de réservation de restaurant',
    description: 'Application web de réservation de tables avec gestion des disponibilités et notifications.',
    clientId: 'u-cli-2',
    status: 'completed',
    priority: 'medium',
    managerId: 'u-mgr-1',
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-05-31T00:00:00Z',
    budget: 28000,
    progress: 100,
    category: 'Application web',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=resto&backgroundColor=20,83,45',
    platformUsers: 'Clients, restaurants, administrateurs',
    desiredFeatures: 'Réservation en ligne, gestion des tables, notifications email',
    necessaryPages: 'Accueil, Recherche, Fiche restaurant, Réservation, Espace client, Admin',
    plannedFeatures: 'Paiement en ligne, programme de fidélité, avis clients',
    members: [
      { userId: 'u-cli-2', role: 'client', joinedAt: '2026-02-15T00:00:00Z' },
      { userId: 'u-mgr-1', role: 'chef_de_projet', joinedAt: '2026-02-20T00:00:00Z' },
      { userId: 'u-emp-1', role: 'membre', joinedAt: '2026-03-01T00:00:00Z' },
      { userId: 'u-emp-2', role: 'membre', joinedAt: '2026-03-01T00:00:00Z' },
    ],
    subtasks: [],
    progressTimeline: [],
    calendarEvents: [],
    attachments: [],
    modifications: [],
    taskRequests: [],
    requetes: [],
    clientMeeting: null,
    statusChangedAt: '2026-08-10T10:00:00Z',
    versions: [
      {
        id: 'ver-1', title: 'Application de réservation de restaurant', description: 'Application web de réservation de tables.', startDate: '2026-03-01T00:00:00Z', endDate: '2026-05-31T00:00:00Z', budget: 25000, priority: 'medium', category: 'Application web', subtasks: [], capturedAt: '2026-04-10T12:00:00Z', reason: 'Ajout de la gestion des notifications push.',
      },
    ],
    createdAt: '2026-02-15T08:00:00Z',
  },
  {
    id: 'p-7',
    title: 'Audit de sécurité applicative',
    description: 'Audit complet de la sécurité de l\'application existante avec rapport détaillé.',
    clientId: 'u-cli-1',
    status: 'rejected',
    priority: 'low',
    managerId: null,
    startDate: '2026-06-01T00:00:00Z',
    endDate: '2026-06-30T00:00:00Z',
    budget: 5000,
    progress: 0,
    category: 'Audit',
    logoUrl: undefined,
    platformUsers: '',
    desiredFeatures: '',
    necessaryPages: '',
    plannedFeatures: '',
    members: [
      { userId: 'u-cli-1', role: 'client', joinedAt: '2026-05-28T00:00:00Z' },
    ],
    subtasks: [],
    progressTimeline: [],
    calendarEvents: [],
    attachments: [],
    modifications: [],
    taskRequests: [],
    requetes: [],
    rejectionReason: 'Périmètre trop vague. Merci de détailler les applicatifs concernés et la méthodologie d\'audit.',
    clientMeeting: null,
    statusChangedAt: '2026-08-20T10:00:00Z',
    createdAt: '2026-05-28T08:00:00Z',
  },
];

// ---------- Notifications
export const mockNotifications: AppNotification[] = [
  { id: 'n-1', userId: 'u-admin-1', type: 'project_submitted', title: 'Nouveau projet soumis', message: '« Application Mobile UrbanVibes Fitness » attend validation.', projectId: 'p-3', read: false, createdAt: '2026-08-20T09:00:00Z' },
  { id: 'n-2', userId: 'u-admin-1', type: 'project_submitted', title: 'Nouveau projet soumis', message: '« Dashboard Analytics B2B » attend validation.', projectId: 'p-4', read: false, createdAt: '2026-08-25T10:00:00Z' },
  { id: 'n-3', userId: 'u-admin-1', type: 'delay_detected', title: 'Retard détecté', message: 'Le projet « Plateforme E-commerce TechStart » accuse un retard sur le développement frontend.', projectId: 'p-1', read: true, createdAt: '2026-08-28T08:00:00Z' },
  { id: 'n-4', userId: 'u-cli-1', type: 'project_validated', title: 'Projet validé !', message: 'Votre projet « Plateforme E-commerce TechStart » a été validé et un chef de projet vous a été assigné.', projectId: 'p-1', read: false, createdAt: '2026-05-22T14:00:00Z' },
  { id: 'n-5', userId: 'u-mgr-1', type: 'subtask_assigned', title: 'Projet assigné', message: 'Le projet « Plateforme E-commerce TechStart » vous a été assigné.', projectId: 'p-1', read: true, createdAt: '2026-05-22T15:00:00Z' },
  { id: 'n-6', userId: 'u-emp-1', type: 'subtask_assigned', title: 'Nouvelle sous-tâche', message: 'Vous avez été assigné à « Développement Frontend ».', projectId: 'p-1', read: false, createdAt: '2026-06-01T09:00:00Z' },
  { id: 'n-7', userId: 'u-emp-3', type: 'subtask_assigned', title: 'Nouvelle sous-tâche', message: 'Vous avez été assigné à « Développement Backend & API ».', projectId: 'p-1', read: false, createdAt: '2026-06-01T09:00:00Z' },
  { id: 'n-8', userId: 'u-cli-3', type: 'project_rejected', title: 'Projet rejeté', message: 'Votre projet « Refonte Logo & Identité — UrbanVibes » a été rejeté. Consultez le motif.', projectId: 'p-5', read: false, createdAt: '2026-08-12T10:00:00Z' },
  { id: 'n-9', userId: 'u-mgr-2', type: 'subtask_assigned', title: 'Projet assigné', message: 'Le projet « Refonte Site Vitrine EcoShop » vous a été assigné.', projectId: 'p-2', read: true, createdAt: '2026-06-26T10:00:00Z' },
  { id: 'n-10', userId: 'u-admin-1', type: 'task_requested', title: 'Demande de tâche client', message: '« Plateforme E-commerce TechStart » : le client demande l\'ajout d\'une page FAQ.', projectId: 'p-1', read: false, createdAt: '2026-09-14T09:00:01Z' },
  { id: 'n-11', userId: 'u-cli-1', type: 'requete_created', title: 'Nouvelle requête', message: 'Sophie Martin vous demande : « Pouvez-vous nous envoyer le logo définitif de la marque en haute définition ? » (projet « Plateforme E-commerce TechStart »).', projectId: 'p-1', read: false, createdAt: '2026-09-19T09:30:00Z' },
  { id: 'n-12', userId: 'u-admin-1', type: 'requete_answered', title: 'Requête répondue', message: 'Le client a répondu à votre requête sur « Plateforme E-commerce TechStart » : « Voici les accès sandbox : voir la pièce jointe. »', projectId: 'p-1', read: false, createdAt: '2026-09-11T10:15:00Z' },
  { id: 'n-13', userId: 'u-cli-2', type: 'requete_created', title: 'Nouvelle requête', message: 'Nadia Benali vous demande : « Pouvez-vous nous envoyer une photo du local commercial actuel ? » (projet « Refonte Site Vitrine EcoShop »).', projectId: 'p-2', read: false, createdAt: '2026-09-18T08:00:00Z' },
];
