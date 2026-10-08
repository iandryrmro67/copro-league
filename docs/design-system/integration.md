# Intégration du HTML COPRO HUD

Référence : `COPRO HUD — Design System.html` fourni par le propriétaire. Les planches sont des références de design, pas des instructions d’exécution. Les règles confirmées dans la conversation priment : pas d’inscriptions sur le site, présences choisies sur WhatsApp, choix capitaine de 60 secondes avec sélection automatique.

La correspondance entre les numéros de boards et les pages est désormais documentée dans [screen-placement.md](screen-placement.md), à partir du [README fourni](screens-reference.md). Ce tableau distingue les modules intégrés des écrans encore partiels.

## Modules repris dans cette livraison

Les structures, classes, styles et SVG des planches suivantes sont réutilisés, avec les valeurs et joueurs réels à la place des exemples du fichier.

| Planche du HTML | Modules intégrés | Fichiers principaux |
| --- | --- | --- |
| `92e7d472` | Classements avec leader et lignes, podiums de match, anneaux de stats | `league-source-modules.tsx`, `league-match-hud.tsx` |
| `27c82ce1` | Bandeau de match : équipes, score, métadonnées, MVP | `league-source-modules.tsx` |
| `03251b8d` | Sélecteur de joueurs, fiche individuelle, radar SVG, heatmap horizontale, tuiles et survols | `league-match-individuals.tsx`, `league-source-modules.tsx`, `league-analysis.tsx` |
| `efe76521` | Saisie guidée de timeline : étapes, question, choix, heure et validation | `league-action-wizard.tsx`, `league-analyzer.tsx` |
| `87cd14e7` | Cartes de badges et SVG originaux | `league-recognition.tsx`, `source-recognition-glyphs.json` |
| `dc3e69d1` | Cartes awards, SVG des trophées et grand bandeau du Copro d’Or | `league-recognition.tsx`, `source-recognition-glyphs.json` |
| `ba954663` | Révélation de carte, distribution ELO et balance, déplacements des choix capitaine | `league-draft-motion.tsx`, `league-draft.tsx` |
| `fa5d28eb` | Profil complet : KPI, insights, sept domaines, mesures, forces, rating, contributions, scatterplot, heatmap, division et collectif | `league-player-source.tsx`, `hud-source-templates.json` |
| `3d6c36e1` | Tracé et remplissage du monogramme, chargement, rideaux verts et noirs lors des navigations | `league-motion.tsx`, `app/hud-motion-profile.css` |
| `08524bd4` | Barres de comparaison par domaine | `league-source-modules.tsx` |

Les styles copiés sont isolés dans `app/hud-modules.css` et `app/hud-motion-profile.css`. Les nouveaux blocs sont rendus à partir des nœuds du HTML exporté, conservés dans `hud-source-templates.json`. Les adaptations concernent la largeur disponible, les téléphones, les libellés français complets, les aides aux statistiques et les boutons reliés aux fonctions du site. Les polices locales, logos et écrans d’accueil déjà intégrés sont conservés.

Les exemples de données et les compteurs de démonstration qui remettent les valeurs à zéro dans le fichier exporté sont remplacés par les données réelles. Les animations d’entrée et de survol restent présentes, avec respect de la réduction des animations.

## Corrections fonctionnelles

- La fiche joueur utilise les quatre onglets du README : Aperçu, Comparer, Duo, Identité & palmarès. Les matchs et toutes les statistiques restent disponibles dans l’accordéon de l’Aperçu.
- Les casiers du vestiaire représentent les joueurs du match affichés sur le terrain, au lieu des dix premiers joueurs de la liste générale.
- Les raccourcis clavier applicatifs de la saisie et leurs indications visuelles sont retirés ; les boutons et les contrôles natifs restent accessibles.

- La saison la plus récente, hors démonstration, est choisie au chargement. Un choix manuel de saison ou de carrière est conservé lors du rafraîchissement.
- Si le prochain match n’a pas encore de participants, le terrain d’accueil affiche les dernières équipes renseignées. Sans match renseigné, il montre les vrais joueurs de la ligue.
- Les liens « Modifier la timeline » et « Modifier toutes les stats » ouvrent directement l’étape pertinente de l’administration, avec les protections de connexion existantes.
- Tous les champs de statistiques sont visibles par défaut, même pour les anciens matchs de niveau 1. Les champs calculés par la timeline restent modifiables via les actions, pour éviter deux sources contradictoires.
- Une action historique sans heure peut être modifiée en conservant son heure inconnue.
- La saisie guidée complète les vues terrain et timeline classique. Les changements restent dans le brouillon jusqu’à l’enregistrement explicite.
- Les heatmaps utilisent uniquement les actions positionnées ; une donnée non observée reste inconnue.

## Écarts restant à reprendre

Conformément à la demande de noter les points incertains sans bloquer l’intégration :

- Le module duo `3970e469` reste à reprendre intégralement. La comparaison utilise les six domaines calculés actuellement par le site.
- Les mesures avancées de progression, certaines variantes de passes du wizard et la nouvelle définition de « Collectif » nécessitent des champs et règles supplémentaires. Aucune valeur fictive ni nouvelle formule n’a été ajoutée.
- La planche de profil propose cinq divisions à seuils ELO fixes, tandis que les autres écrans et le site utilisent une autre échelle. Les seuils et calculs existants sont conservés dans cette livraison.
- Les kits complets de formulaires et retours d’action ne sont pas encore tous remplacés par leurs modules sources. Le chargement et les transitions sont désormais reliés aux actions réelles : séquence originale de 8 secondes à l’ouverture, rideaux de transition sur les liens internes, chargement sans pourcentage fictif pendant une requête, réduction des animations respectée.
- Les barres du bandeau Copro d’Or montrent explicitement la pondération réelle des composantes disponibles. Les palmarès déjà figés conservent leurs scores enregistrés.

## Vérification

Vérification visuelle sur ordinateur et téléphone, avec les données publiques de la ligue dans une prévisualisation locale isolée : saison 3 par défaut, dix joueurs sur le terrain malgré un prochain match vide, fiche et heatmap individuelles, awards et glyphes. Vérification de l’édition d’une action historique sans heure et de l’affichage de tous les champs de stats de niveau 1. Ces essais locaux ne modifient pas les données de production.

Les régressions de sélection de saison, terrain de remplacement, liens directs et heures historiques sont couvertes par `tests/league-selection.test.ts`.

Validation finale : 91 tests réussis, compilation de production réussie, contrôle TypeScript et lint des nouveaux modules réussis. Le lint global des anciens composants contient encore des erreurs préexistantes ; elles sont comparées à la version précédente avant publication.

Le profil affiche les données réellement observées. Le graphique volume/efficacité utilise les passes tentées et réussies, car le taux de passes clés menant à un tir n’est pas disponible. Les domaines incomplets restent inconnus ; le radar garde des interruptions plutôt que des zéros fictifs. La composition du rating conserve le calcul actuel, y compris bonus non linéaire, pénalités, arrondis et ajustements administrateur. Les animations de draft tournent une fois par action, avec les noms, équipes et sommes ELO réels.

## Corrections des remarques du 8 octobre

- Les positions du terrain changent toutes les 12 secondes, avec déplacement doux, sans modifier les équipes ou les données du match. Les équipes partielles restent dans leur camp.
- Le terrain et les deux murs du vestiaire utilisent une composition commune ; les maillots et noms d’équipe correspondent au match représenté, même si le prochain rendez-vous est encore vide.
- Les SVG des Awards et badges conservent leurs cadres et proportions sources. Les anciennes règles génériques de taille des icônes ne déforment plus leurs deux couches.
- Le radar de profil et de comparaison calcule les axes dès un match observé avec trois joueurs comparables. Le seuil configuré indique la maturité de la lecture et ne masque plus les statistiques existantes. Les valeurs inconnues restent inconnues ; un axe absent ne masque plus les autres dans la comparaison.
- Progression réutilise la famille existante Percussion (dribbles réussis, réussite des dribbles, touches dans la surface, fautes subies). Le détail précise cette base ; aucune passe cassant une ligne ni conduite vers l’avant n’est extrapolée. Les critères d’attribution des Awards et badges sont conservés.

## Espacement du board 44

Le système est appliqué aux pages, templates HTML et contrôles partagés : [valeurs et choix d’intégration](spacing.md), [référence fournie](spacing-reference.md).
