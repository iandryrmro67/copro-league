# Espacement — board 44

La demande explicite du propriétaire applique le [board 44](spacing-reference.md) à tout le site. Le HTML est la référence des valeurs ; sa proposition de validation ne crée pas une étape d’approbation supplémentaire.

## Échelle

| Jeton | Valeur |
| --- | --- |
| `--sp-1` | 4 px |
| `--sp-2` | 8 px |
| `--sp-4` | 16 px |
| `--sp-6` | 24 px |
| `--sp-8` | 32 px |
| `--sp-12` | 48 px |
| `--sp-16` | 64 px |
| `--sp-24` | 96 px |

| Taille | Marges | Gouttières et cartes | Sections |
| --- | --- | --- | --- |
| Ordinateur, référence 1440 | 40 px | 20 px | 48 px |
| Tablette, référence 768 | 32 px | 16 px | 40 px |
| Mobile, référence 390 | 16 px | 12 px | 32 px |

Les paliers responsive sont 1023 et 639 px. Les gouttières de 20 et 12 px restent les exceptions de grille explicitement proposées dans le board. Les sections à 40 px sur tablette suivent aussi sa table.

## Application

`app/hud-spacing.css` définit les jetons et les usages communs, après les styles des composants. Les six feuilles historiques, les espacements intégrés aux nœuds HTML sources et les contrôles partagés emploient la même échelle. Les pages de consultation et d’administration héritent des mêmes marges, panneaux, grilles et formulaires.

Cartes : 16 px ; panneaux : 24 px ; boutons : 8 × 16 px ; pastilles : 4 × 8 px. Les écarts internes de 14 et les paddings de 18 deviennent 16 px. Les autres valeurs libres sont rapprochées du cran de l’échelle approprié. Les marges négatives de contenu sont supprimées ; le carrousel utilise le gap du parent, et les marqueurs du terrain restent centrés par transformation.

Les hauteurs, coordonnées SVG, tailles de dessin et délais d’animation ne sont pas des espacements. Les dégagements de 150 px devant le vestiaire et de 250 px devant la scène mobile évitent une collision avec ces dessins et restent réservés à leur géométrie. Les équipes, la timeline et les calculs des statistiques ne changent pas.

## Vérification

Contrôle des feuilles CSS et des styles des templates sources ; compilation de production et tests existants. Vérification visuelle de l’accueil, du profil et des pages de consultation. Les règles responsive et les espacements affichés sont contrôlés en production à 1440, 768 et 390 px. Les onglets locaux de prévisualisation restaient à 1280 px ; le navigateur du site public permet la vérification des trois tailles. La ligne de division du profil est ajustée pour garder son marqueur dans les marges mobiles.

Résultat : 94 tests réussis, compilation et TypeScript réussis ; 36 autres fichiers TypeScript modifiés passent le lint. Les quatre erreurs de liens de la page de connexion sont identiques à la version précédente. Les templates sources sont identiques hors propriétés d’espacement. Aucune valeur libre d’espacement ni variable d’espacement manquante dans les feuilles ou templates contrôlés.
