avoir qui doit quoi, combien a été payé, combien reste à payer, et par qui/quand le paiement a été enregistré.

1. 🏫 Paramétrage de l'établissement

Le socle administratif :

Informations de l'établissement
Années scolaires
Cycles/niveaux
Classes
Types de frais
Modes de paiement
Devise
Paramètres généraux

Exemple :

Année scolaire 2026-2027
├── Primaire
│   ├── 1ère
│   ├── 2ème
│   └── ...
└── Secondaire
    ├── 1ère
    ├── 2ème
    └── ...
2. 👨‍🎓 Gestion des élèves

CRUD classique mais avec quelques fonctionnalités utiles :

Ajouter/modifier un élève
Matricule automatique
Photo éventuellement
Classe actuelle
Statut : actif, transféré, abandonné...
Recherche rapide
Filtre par classe
Historique de scolarité

Et surtout une fiche élève :

Jean KABILA
Matricule : ELV-2026-001
Classe : 6ème Primaire

────────────────────────
Situation financière

Total dû       500 $
Total payé     350 $
Reste          150 $

────────────────────────
Historique des paiements
...

Cette fiche peut devenir l'écran central de l'application.

3. 💰 Gestion des frais

C'est le cœur du système.

Tu peux définir :

Minerval       400 $
Inscription     50 $
Transport      100 $
Cantine        150 $
Uniforme        80 $

Mais surtout, permettre de définir les frais par classe.

Exemple :

6ème Primaire

Minerval       400 $
Inscription     50 $
Uniforme        80 $
──────────────────────
Total          530 $

Puis appliquer automatiquement cette configuration aux élèves de la classe.

4. 💳 Paiements

C'est probablement le module le plus important.

Fonctionnalités :

Enregistrer un paiement
Paiement partiel
Paiement complet
Plusieurs paiements pour un même frais
Mode de paiement
Numéro/référence de transaction
Date
Caissier
Annulation/correction d'un paiement

Exemple :

Frais : Minerval
Montant : 400 $

Paiement #1 : 100 $
Paiement #2 : 150 $
Paiement #3 : 150 $

Payé : 400 $
Solde : 0 $
5. 🧾 Reçu de paiement

Très intéressant pour un établissement.

Après paiement :

        ÉTABLISSEMENT XYZ

           REÇU #REC-000182

Élève : Jean Kabila
Classe : 6ème Primaire
Matricule : ELV-001

Motif : Minerval
Montant payé : 150 $
Mode : Mobile Money
Date : 19/09/2026

Reste à payer : 250 $

Caissier : Alice M.

Puis :

imprimer
télécharger PDF
éventuellement envoyer par WhatsApp/email plus tard
6. 📊 Tableau de bord financier

Pas besoin de 25 graphiques.

Quelques indicateurs :

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Élèves       │ │ Encaissé     │ │ À recouvrer  │
│ 1 245        │ │ 84 500 $      │ │ 23 400 $     │
└──────────────┘ └──────────────┘ └──────────────┘

Puis :

paiements récents
répartition des paiements
élèves avec solde
frais les plus payés
évolution des encaissements
7. 📋 Suivi des impayés

Très utile.

Une page :

Élèves avec solde

Élève       Classe       Dû       Payé      Reste
--------------------------------------------------
Jean K.     6e           500$      300$      200$
Paul M.     5e           450$      100$      350$
Marie L.    4e           500$      500$        0$

Avec filtres :

classe
montant restant
type de frais
année scolaire

Et éventuellement :

Relancer

Plus tard, cela pourrait générer un message WhatsApp/SMS.

8. 📑 Rapports

Quelques rapports vraiment utiles :

Rapport des paiements

Période : 01/09 → 19/09

Total encaissé : 24 500 $

Espèces       8 500 $
Mobile Money  12 000 $
Banque         4 000 $

Autres :

paiements par période
paiements par classe
paiements par élève
impayés
recettes par type de frais
rapport journalier du caissier
9. 👤 Utilisateurs et rôles

Commencer simplement :

ADMIN

configuration
utilisateurs
élèves
frais
paiements
rapports

CAISSIER

élèves
paiements
reçus
consultation des soldes

Plus tard :

COMPTABLE

DIRECTION

SECRÉTAIRE

Mais ne crée pas ces rôles maintenant si tu n'en as pas besoin.

10. 🔐 Journal des actions

Fonctionnalité souvent oubliée mais très utile dans une application financière.

Exemple :

19/09 14:32
Alice a enregistré un paiement de 150 $
pour Jean Kabila.

19/09 14:40
Admin a modifié le montant du frais
"Minerval 6ème".

19/09 15:02
Alice a annulé le reçu #REC-182.

Ça permet de répondre à :

Qui a fait quoi, quand ?

Fonctionnalités que je garderais pour V2

Une fois le cœur stable :

Importation des élèves via Excel
Export Excel/PDF
SMS/WhatsApp aux parents
Portail parent
Paiement en ligne
QR code sur les reçus
Notifications automatiques
Gestion des responsables/tuteurs
Plusieurs établissements
Comptabilité plus poussée
Gestion des dépenses
Budget annuel
Application mobile
Je découperais le MVP comme ça
🟢 MVP
Années scolaires
      ↓
Classes
      ↓
Élèves
      ↓
Types de frais
      ↓
Frais attribués
      ↓
Paiements
      ↓
Soldes
      ↓
Reçus
      ↓
Dashboard
🟡 V1.1
Rapports
Historique
Journal des actions
Filtres avancés
Export PDF/Excel