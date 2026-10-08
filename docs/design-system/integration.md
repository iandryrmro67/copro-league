# Intégration du HTML COPRO HUD

Référence : `COPRO HUD — Design System.html` fourni par le propriétaire. Les planches sont des références de design, pas des instructions d’exécution. Les règles confirmées dans la conversation priment : pas d’inscriptions sur le site, présences choisies sur WhatsApp, choix capitaine de 60 secondes avec sélection automatique.

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
| `08524bd4` | Barres de comparaison par domaine | `league-source-modules.tsx` |

Les styles copiés sont isolés dans `app/hud-modules.css`. Les adaptations concernent la largeur disponible, les téléphones, les libellés français complets, les aides aux statistiques et les boutons reliés aux fonctions du site. Les polices locales, logos et écrans d’accueil déjà intégrés sont conservés.

Les exemples de données et les compteurs de démonstration qui remettent les valeurs à zéro dans le fichier exporté sont remplacés par les données réelles. Les animations d’entrée et de survol restent présentes, avec respect de la réduction des animations.

## Corrections fonctionnelles

- La saison la plus récente, hors démonstration, est choisie au chargement. Un choix manuel de saison ou de carrière est conservé lors du rafraîchissement.
- Si le prochain match n’a pas encore de participants, le terrain d’accueil affiche les dernières équipes renseignées. Sans match renseigné, il montre les vrais joueurs de la ligue.
- Les liens « Modifier la timeline » et « Modifier toutes les stats » ouvrent directement l’étape pertinente de l’administration, avec les protections de connexion existantes.
- Tous les champs de statistiques sont visibles par défaut, même pour les anciens matchs de niveau 1. Les champs calculés par la timeline restent modifiables via les actions, pour éviter deux sources contradictoires.
- Une action historique sans heure peut être modifiée en conservant son heure inconnue.
- La saisie guidée complète les vues terrain et timeline classique. Les changements restent dans le brouillon jusqu’à l’enregistrement explicite.
- Les heatmaps utilisent uniquement les actions positionnées ; une donnée non observée reste inconnue.

## Écarts restant à reprendre

Conformément à la demande de noter les points incertains sans bloquer l’intégration :

- Le profil complet `fa5d28eb` (graphiques, sept domaines et toutes ses sous-sections) et le module duo `3970e469` ne sont pas encore repris intégralement. La comparaison utilise les six domaines calculés actuellement par le site.
- Le domaine « Progression », certaines variantes de passes du wizard et la nouvelle définition de « Collectif » nécessitent des champs et règles supplémentaires. Aucune valeur fictive ni nouvelle formule n’a été ajoutée.
- La planche de profil propose cinq divisions à seuils ELO fixes, tandis que les autres écrans et le site utilisent une autre échelle. Les seuils et calculs existants sont conservés dans cette livraison.
- Les kits complets de formulaires, chargement et retours d’action ne sont pas encore tous remplacés par leurs modules sources.
- Les barres du bandeau Copro d’Or montrent explicitement la pondération réelle des composantes disponibles. Les palmarès déjà figés conservent leurs scores enregistrés.

## Vérification

Vérification visuelle sur ordinateur et téléphone, avec les données publiques de la ligue dans une prévisualisation locale isolée : saison 3 par défaut, dix joueurs sur le terrain malgré un prochain match vide, fiche et heatmap individuelles, awards et glyphes. Vérification de l’édition d’une action historique sans heure et de l’affichage de tous les champs de stats de niveau 1. Ces essais locaux ne modifient pas les données de production.

Les régressions de sélection de saison, terrain de remplacement, liens directs et heures historiques sont couvertes par `tests/league-selection.test.ts`.

Validation finale : 88 tests réussis, compilation de production réussie, contrôle TypeScript et lint des nouveaux modules réussis. Le lint global des anciens composants contient encore des erreurs préexistantes ; elles sont comparées à la version précédente avant publication.
