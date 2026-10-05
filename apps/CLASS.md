## Structure des classes : modèle standardisé

### Contexte
La structure des classes a été standardisée en trois niveaux : **Cycle → Niveau → Classe**.
L'ancien champ texte libre `Class.level` et l'enum `ClassOrientation` n'existent plus.

### Modèle de données

- `Cycle` (enum) : `MATERNELLE`, `PRIMAIRE`, `SECONDAIRE`.
- `Level` (nouveau modèle) : `id`, `code` (unique), `name`, `cycle`, `order`.
- `Class` : `id`, `code`, `name`, `section?`, `orientation?`, `capacity?`, `levelId`, `schoolYearId`.
- `Fee` : nouveau champ optionnel `levelId`, en plus de `classId` et `studentId`.

### Règles à respecter

1. Une classe appartient toujours à un `Level` (`levelId` obligatoire) et à une année scolaire.
2. `Class.code` est unique par année scolaire (`@@unique([schoolYearId, code])`).
   C'est la clé de référence pour les rapports et les filtres.
3. `Class.orientation` est un **texte libre** (ex. "Scientifique", "Pédagogie générale").
   Ne jamais filtrer ou regrouper sur ce champ. Utiliser `code` ou `levelId`.
   Nettoyer la saisie avant enregistrement (suppression des espaces, première lettre en majuscule).
4. Un frais (`Fee`) cible au plus **un seul** niveau d'application :
   `levelId` (toutes les sections d'un niveau), `classId` (une classe) ou `studentId` (un élève).
   Sans aucun des trois, le frais s'applique à toute l'école pour l'année scolaire.
   Cette règle est validée dans le service, pas dans la base.
5. Pour appliquer un frais commun aux sections A, B, C, utiliser `levelId`. Ne pas dupliquer le frais par classe.
6. Ne jamais recréer `Class.level` (texte) ni l'enum `ClassOrientation`.

### Convention de codes

| Type | Format | Exemples |
|---|---|---|
| Niveau | `<CYCLE>-<ordre>` | `MAT-2`, `PRI-4`, `SEC-7`, `SEC-1` |
| Classe avec section | `<code niveau><section>` | `MAT-2A`, `PRI-1D` |
| Classe avec orientation | `<code niveau>-<abréviation>` | `SEC-1-PED`, `SEC-1-COM`, `SEC-1-CC`, `SEC-1-SCI` |
| Classe unique | `<code niveau>` | `MAT-1`, `SEC-7`, `SEC-8` |

Les préfixes de cycle (`MAT`, `PRI`, `SEC`) sont obligatoires : "1re année" (primaire) et
"1re secondaire" existent toutes les deux.

### Données de référence (27 classes)

- **Maternelle (5)** : 1re (1 classe), 2e (A, B), 3e (A, B).
- **Primaire (16)** : 1re année (A à D), 2e année (A à C), 3e année (A à C), 4e (A, B), 5e (A, B), 6e (A, B).
- **Secondaire (6)** : 7e, 8e, 1re secondaire en 4 orientations
  (Pédagogie générale, Commerciale et gestion, Coupe et couture, Scientifique).

Ces données sont créées par le seed (upsert, relançable sans doublon) dans l'année scolaire active.

### Migration

- Si des classes existent déjà en base, **ne pas** utiliser la migration Prisma générée telle quelle :
  elle supprimerait la colonne `orientation`. Convertir la colonne en place :
  `ALTER COLUMN "orientation" TYPE TEXT USING "orientation"::text`, puis `DROP TYPE "ClassOrientation"`.
- Ordre : ajouter `Level` et les nouveaux champs nullables, rattacher les classes existantes par script,
  rendre `levelId` et `code` obligatoires, puis supprimer l'ancien champ `level`.

### Points ouverts

- `Student.schoolYearId` est redondant avec la classe. Garder une validation de cohérence
  (l'année de l'élève doit être celle de sa classe) tant qu'il n'est pas supprimé.
- Les champs `status` (élève, frais, paiement) sont des textes libres. Ne pas introduire de nouvelles
  valeurs sans les documenter ici.
