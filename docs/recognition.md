# Awards & badges

`lib/recognition-definitions.ts` contient les 25 Awards et 35 badges. `lib/recognition.ts` calcule les critères et scores indépendamment de l’interface. Les anciennes données de vote restent conservées mais ne participent pas à ce système automatique.

## Calcul

- Awards : un vainqueur après seuils, sauf le duo (deux joueurs). COPRO D’OR utilise les composantes disponibles renormalisées et nécessite au moins une participation réelle.
- Ratios : `max(5, ceil(0.35 * maximum de participations))`. Badges : `max(4, ceil(0.25 * maximum))` et trois joueurs dans la population.
- Percentiles : rang moyen en cas d’égalité, de 0 à 100 ; 50 pour une population constante. Les ratios d’Awards sont comparés entre joueurs éligibles. Les badges comparent les participants de la saison actuelle (ou dernière saison disponible).
- Les moyennes utilisent les matchs où la statistique est observée. Les métriques combinées utilisent les mêmes observations, sans transformer une valeur manquante en zéro. Les parts d’équipe exigent des feuilles complètes pour cette statistique.
- Collective Score : 60 % percentile de taux de victoire, 40 % percentile de victoires.
- Impact offensif : un tiers G+A, un tiers création (xA / occasions créées à parts égales), un tiers dribbles réussis. Impact défensif : récupérations, interceptions, duels gagnés et tacles à parts égales.
- Progression saisonnière : première et seconde moitiés des matchs du joueur dans l’ordre chronologique. Forme récente : cinq derniers contre cinq précédents.
- Badge Score : moyenne des percentiles orientés vers les conditions ; pour un badge uniquement absolu, dépassement du seuil, borné à 100. Trois badges principaux, au plus une Allegation.
- Égalités d’Awards : score, rating, victoires, participations, identifiant stable. Le départage est indiqué.

## Données absentes

Aucun compteur brut ajouté. Les duels défensifs ne sont pas distingués : TRAFFIC CONE reste indisponible. Les tacles réussis et tirs non cadrés proviennent uniquement d’événements canoniques dont la couverture et les résultats sont complets. Les tirs bloqués ne sont pas assimilés à des frappes hors cadre. Les données avancées inconnues de l’Excel ne sont pas inventées.

## Persistance

`recognition_seasons` garde une photographie des résultats de chaque saison terminée/archivée : gagnants, valeurs, scores, conditions, noms, formules et non-attributions. Une insertion conditionnelle garantit un seul résultat conservé. La clôture via l’API finalise immédiatement ; la lecture initialise aussi les saisons historiques. Une réouverture ou une correction de match ne modifie pas les trophées déjà attribués.

Le JSON de sauvegarde exporte `recognitionHistory`. La restauration valide sa structure et conserve toujours les palmarès déjà présents. Les badges sont recalculés, jamais stockés dans le palmarès permanent.

## Vérifications

- `node --experimental-strip-types --test tests/recognition.test.ts` : percentiles, seuils, données absentes, duo, badges partagés, score, limite d’Allegations, annotation complète, chronologie.
- `node tests/recognition-journey.mjs` (localhost uniquement) : clôture, correction, réouverture, export et restauration. Données `qa-recognition*`, nettoyées par `tests/cleanup-local.sql`.
