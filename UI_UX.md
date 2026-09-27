# Direction UI/UX

Le frontend doit avoir un design **sobre, professionnel, cohérent et moderne**, adapté à une application de gestion scolaire utilisée quotidiennement par du personnel administratif.

L'objectif n'est pas de créer une interface spectaculaire, mais une interface :

* claire
* rapide à comprendre
* agréable à utiliser
* peu chargée visuellement
* cohérente
* facilement maintenable

Évite absolument l'effet « dashboard SaaS surchargé ».

## Thème

L'application doit supporter deux thèmes :

* Light
* Dark

Prévoir un bouton permettant de basculer entre les deux.

Le thème doit être appliqué de manière cohérente à toute l'application :

* arrière-plan
* sidebar
* navigation
* cartes
* tableaux
* formulaires
* modales
* boutons
* champs
* badges
* notifications

Éviter les changements de couleurs excessifs entre les pages.

## Style visuel

Privilégier :

* beaucoup d'espace blanc/négatif
* une hiérarchie visuelle claire
* des bordures discrètes
* des ombres très légères, voire inexistantes
* des rayons de bordure modérés
* une typographie lisible
* des icônes simples
* des couleurs d'accent utilisées avec parcimonie

Éviter :

* gradients omniprésents
* grosses cartes décoratives
* animations excessives
* couleurs saturées partout
* énormes titres
* effets glassmorphism
* ombres lourdes
* éléments flottants inutiles
* graphiques uniquement décoratifs

## Palette

Utiliser une palette neutre comme base.

### Light

```text
Background     : très clair
Surface        : blanc
Border         : gris très clair
Text principal : gris très foncé
Text secondaire: gris moyen
Accent         : une seule couleur principale
```

### Dark

```text
Background     : gris/noir profond
Surface        : gris foncé légèrement plus clair
Border         : gris foncé
Text principal : gris très clair
Text secondaire: gris moyen
Accent         : même couleur d'accent que le thème clair
```

L'accent principal doit être utilisé principalement pour :

* boutons principaux
* liens
* éléments actifs
* indicateurs importants
* focus des champs

Ne pas utiliser une couleur différente pour chaque module.

## Layout

Utiliser une structure administrative classique :

```text
┌──────────────────────────────────────────────────┐
│                    Header                         │
├───────────────┬──────────────────────────────────┤
│               │                                  │
│    Sidebar    │          Main content            │
│               │                                  │
│  Dashboard    │                                  │
│  Élèves       │                                  │
│  Classes      │                                  │
│  Frais        │                                  │
│  Paiements    │                                  │
│  Années       │                                  │
│  Utilisateurs │                                  │
│               │                                  │
└───────────────┴──────────────────────────────────┘
```

La sidebar doit être simple et compacte.

Elle doit clairement indiquer la page actuellement active.

Sur mobile/tablette, elle doit pouvoir être réduite ou transformée en navigation adaptée.

## Dashboard

Le dashboard ne doit pas afficher 15 widgets.

Afficher uniquement les informations réellement utiles.

Par exemple :

```text
Bonjour, Admin

┌────────────┐ ┌────────────┐ ┌────────────┐
│ Élèves     │ │ Encaissé   │ │ À payer    │
│ 1 245      │ │ $84 500     │ │ $23 400    │
└────────────┘ └────────────┘ └────────────┘

Paiements récents
─────────────────────────────────────────────
Élève       Montant       Mode       Date
Jean K.     200 $         Cash       18/09
Marie L.    150 $         Mobile     18/09
...

Élèves avec solde
─────────────────────────────────────────────
...
```

Les statistiques doivent être immédiatement compréhensibles.

## Tables

Les tables sont importantes pour cette application.

Elles doivent être :

* lisibles
* compactes mais respirantes
* facilement scannables
* responsive autant que possible

Exemple :

```text
Matricule | Élève        | Classe       | Total dû | Payé | Solde
-------------------------------------------------------------------
ELV-001   | Jean K.      | 6e Primaire  | 500 $    | 350$ | 150 $
ELV-002   | Marie L.     | 6e Primaire  | 500 $    | 500$ | 0 $
```

Éviter de transformer chaque ligne en énorme carte.

Prévoir :

* recherche
* filtres
* pagination si nécessaire
* actions clairement identifiables

## Statuts

Utiliser des badges très sobres.

Exemple :

```text
Payé       → vert discret
Partiel    → orange discret
Impayé     → rouge discret
Actif      → vert discret
Inactif    → gris discret
```

Les couleurs doivent servir à transmettre une information, pas à décorer.

## Formulaires

Les formulaires doivent être simples et bien espacés.

Chaque champ doit avoir :

* un label explicite
* un état focus clair
* un message d'erreur compréhensible
* une indication lorsque nécessaire

Ne pas utiliser de placeholders comme remplacement des labels.

## Boutons

Limiter le nombre de styles de boutons.

Prévoir principalement :

```text
Primary
Secondary
Danger
Ghost
```

Les boutons doivent avoir des libellés explicites.

Préférer :

```text
+ Ajouter un élève
Enregistrer le paiement
Modifier
Supprimer
```

plutôt que des interfaces composées uniquement d'icônes.

## Icônes

Utiliser une seule bibliothèque d'icônes cohérente.

Les icônes doivent accompagner l'interface et non la surcharger.

Éviter d'utiliser une icône lorsqu'elle n'apporte aucune information supplémentaire.

## Typographie

Utiliser une police moderne et très lisible.

La hiérarchie doit être simple :

```text
Page title
Section title
Body
Secondary text
Caption
```

Ne pas multiplier les tailles et les poids de police.

## Responsive

L'application doit être utilisable sur :

* desktop
* laptop
* tablette

La priorité est donnée à l'utilisation administrative sur desktop/laptop, mais aucune page ne doit devenir inutilisable sur une tablette.

## Animations

Utiliser très peu d'animations.

Uniquement pour :

* ouverture/fermeture de menus
* modales
* changement de thème
* feedback d'action
* états de chargement

Les animations doivent être rapides et discrètes.

## Cohérence

Créer quelques composants réutilisables pour garantir la cohérence :

```text
Button
Input
Select
Modal
Table
Badge
Card
PageHeader
EmptyState
LoadingState
```

Mais ne crée pas un design system complet inutilement.

Toutes les pages doivent utiliser les mêmes conventions visuelles.

## Principe général

À chaque fois qu'un choix visuel est possible, privilégier :

> **moins d'éléments, mais mieux hiérarchisés.**

L'interface doit donner l'impression d'un logiciel professionnel utilisé quotidiennement par une administration scolaire, et non d'une landing page ou d'une démonstration de design.
