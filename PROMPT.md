# Contexte

Je veux développer une application web de gestion des frais scolaires pour un établissement scolaire.

L'application doit permettre à l'établissement de gérer les élèves, les classes, les frais scolaires, les paiements et les soldes à payer.

Je veux volontairement une architecture **simple, légère et maintenable**. Ne transforme pas ce projet en architecture complexe ou en usine à gaz.

# Stack technique

Utilise exclusivement cette stack :

* Monorepo : **npm workspaces**
* Frontend : **React + Vite + TypeScript**
* Backend : **Node.js + Express + TypeScript**
* ORM : **Prisma**
* Base de données : **PostgreSQL**
* Conteneurisation : **Docker + Docker Compose**
* Validation : **Zod**
* API : **REST**
* Authentification : **JWT**
* Gestion de configuration : `.env`

Je préfère **npm** et je ne veux pas utiliser pnpm, yarn ou bun.

N'ajoute pas de dépendances importantes sans justification.

# Architecture

Commencer avec cette structure :

```text
school-fees/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── students/
│       │   │   ├── classes/
│       │   │   ├── fees/
│       │   │   ├── payments/
│       │   │   ├── school-years/
│       │   │   └── users/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── lib/
│       │   └── server.ts
│       └── package.json
│
├── packages/
│   └── database/
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
│
├── docker/
├── docker-compose.yml
├── package.json
├── .env
├── .env.example
├── .gitignore
└── README.md
```

Ne crée pas immédiatement des packages supplémentaires comme :

```text
packages/ui
packages/types
packages/utils
packages/config
```

Ils ne devront être créés que lorsqu'un véritable besoin de partage apparaîtra.

# Monorepo npm

Le `package.json` racine doit utiliser les workspaces npm :

```json
{
  "name": "school-fees",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

Utilise les commandes npm adaptées au fonctionnement des workspaces.

Exemples :

```bash
npm install
npm install <package> -w apps/web
npm install <package> -w apps/api
npm install <package> -w packages/database
```

# Domaine fonctionnel

L'application doit gérer les éléments suivants.

## Années scolaires

Une année scolaire possède :

* id
* nom/libellé
* date de début
* date de fin
* statut actif/inactif

Une seule année scolaire peut être active à la fois.

## Classes

Une classe possède :

* id
* nom
* niveau
* année scolaire

Exemples :

```text
1ère Primaire
2ème Primaire
6ème Primaire
1ère Secondaire
6ème Secondaire
```

## Élèves

Un élève possède au minimum :

* id
* matricule
* nom
* postnom
* prénom
* sexe
* date de naissance
* classe
* statut

Prévoir la possibilité d'ajouter les responsables/tuteurs plus tard, mais ne pas complexifier le modèle initial.

## Frais scolaires

L'application doit permettre de définir différents frais :

```text
Minerval
Inscription
Transport
Cantine
Uniforme
Frais divers
```

Un frais doit pouvoir être associé à :

* une année scolaire
* une classe ou un élève
* un montant
* une échéance éventuelle
* un statut

Le modèle doit permettre de définir un frais pour toute une classe tout en permettant éventuellement d'avoir un frais spécifique à un élève.

## Paiements

Un paiement contient au minimum :

* id
* élève
* frais concerné
* montant
* date
* mode de paiement
* référence
* utilisateur ayant enregistré le paiement

Modes de paiement initiaux :

```text
Espèces
Mobile Money
Virement
Banque
Autre
```

Un élève peut effectuer plusieurs paiements pour un même frais.

Exemple :

```text
Frais : 500 $
Paiement 1 : 200 $
Paiement 2 : 150 $
Paiement 3 : 150 $

Total payé : 500 $
Reste : 0 $
```

# Règles métier

Le backend doit calculer :

```text
Montant dû
Montant payé
Solde restant
```

Les calculs financiers doivent être réalisés côté backend.

Ne jamais faire confiance aux montants calculés uniquement par le frontend.

Éviter les problèmes liés aux nombres flottants pour les montants monétaires.

Un paiement ne doit normalement pas dépasser le montant restant.

# Authentification

Prévoir :

```text
ADMIN
CAISSIER
```

L'ADMIN peut gérer :

* utilisateurs
* classes
* élèves
* frais
* années scolaires
* paiements

Le CAISSIER peut notamment :

* consulter les élèves
* consulter les frais
* enregistrer les paiements
* consulter les soldes

Ne crée pas immédiatement un système de permissions complexe.

# API REST

Prévoir des routes de ce type :

```text
POST   /api/auth/login

GET    /api/students
GET    /api/students/:id
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id

GET    /api/classes
POST   /api/classes
PUT    /api/classes/:id
DELETE /api/classes/:id

GET    /api/fees
POST   /api/fees
PUT    /api/fees/:id

GET    /api/payments
GET    /api/payments/:id
POST   /api/payments

GET    /api/school-years
POST   /api/school-years
PUT    /api/school-years/:id
```

Utiliser Zod pour valider les données entrantes.

Mettre en place une gestion centralisée des erreurs côté API.

# Frontend

Créer une interface d'administration simple et professionnelle.

Navigation initiale :

```text
Dashboard
│
├── Élèves
├── Classes
├── Frais scolaires
├── Paiements
├── Années scolaires
└── Utilisateurs
```

Le dashboard doit afficher :

* nombre d'élèves
* total des frais dus
* total encaissé
* total restant
* paiements récents

L'interface doit être responsive et utilisable sur ordinateur et tablette.

# Docker

Créer un environnement permettant de lancer l'application avec :

```bash
docker compose up
```

Services initiaux :

```text
web
api
postgres
```

PostgreSQL doit utiliser un volume Docker persistant.

Prévoir :

```text
.env
.env.example
```

Ne mets jamais les secrets réels dans Git.

# Prisma

Le package :

```text
packages/database
```

doit contenir Prisma et le schéma de base de données.

Créer un premier `schema.prisma` cohérent avec le domaine.

Avant de développer les fonctionnalités :

1. concevoir les entités
2. définir les relations
3. vérifier les règles métier
4. créer la migration initiale
5. générer Prisma Client
6. créer éventuellement un seed minimal

# Développement par étapes

Ne développe pas toute l'application d'un seul coup.

## Étape 1 — Initialisation

Créer :

* monorepo npm
* npm workspaces
* React/Vite
* Express/TypeScript
* package database
* Prisma
* PostgreSQL
* Docker Compose

Objectif :

```bash
docker compose up
```

doit permettre de démarrer l'environnement.

Créer également une route :

```text
GET /health
```

qui retourne par exemple :

```json
{
  "status": "ok"
}
```

## Étape 2 — Base de données

Créer le modèle Prisma.

Créer les migrations.

Créer éventuellement quelques données de démonstration.

## Étape 3 — Backend

Développer progressivement :

* configuration
* middleware
* gestion des erreurs
* validation Zod
* authentification
* élèves
* classes
* frais
* paiements
* années scolaires

## Étape 4 — Frontend

Développer :

* layout
* navigation
* dashboard
* élèves
* classes
* frais
* paiements
* années scolaires
* connexion

## Étape 5 — Intégration

Connecter React à l'API.

Tester le parcours complet :

```text
Créer une année scolaire
        ↓
Créer une classe
        ↓
Créer un élève
        ↓
Définir ses frais
        ↓
Enregistrer un paiement
        ↓
Calculer le solde
```

# Principes importants

Le projet doit privilégier :

* simplicité
* lisibilité
* TypeScript
* séparation claire frontend/backend
* validation côté serveur
* sécurité raisonnable
* maintenabilité

Ne pas introduire :

* microservices
* GraphQL
* Redis
* RabbitMQ
* Kubernetes
* CQRS
* event sourcing
* architecture hexagonale lourde
* dependency injection complexe
* repository pattern inutilement abstrait

Si une fonctionnalité peut être réalisée simplement, choisis la solution simple.

# Communication pendant le développement

Avant chaque étape importante, explique brièvement :

1. ce que tu vas faire
2. pourquoi
3. les fichiers concernés

Ne demande pas de confirmation pour chaque petit changement.

Si une décision d'architecture importante est ambiguë, présente les options et attends ma décision.

Après chaque étape, indique :

* ce qui a été réalisé
* les commandes à exécuter
* comment tester
* les éventuels problèmes restants

Ne réécris pas inutilement du code fonctionnel.

# Première tâche

Commence uniquement par **l'étape 1 : initialisation du monorepo npm et de l'environnement Docker**.

Ne développe pas encore les fonctionnalités métier.

À la fin de cette première étape, je dois pouvoir lancer le projet avec :

```bash
npm install
docker compose up
```

et vérifier que :

* PostgreSQL fonctionne
* l'API Express fonctionne
* `/health` répond
* le frontend React fonctionne

Commence maintenant.
