# Référence visuelle de l’analyse vidéo

Depuis le 2 octobre 2026, la référence de cet écran est le fichier fourni par le propriétaire : `Coproleague — Design System.html`. Ses planches internes sont titrées « KUSH/HUD » ; ces noms d’exemple ne sont pas repris dans le produit. Cette référence remplace la palette et les choix typographiques de la conception du 16 septembre pour cet écran.

- Fond Void `#0A0C0A`, surfaces Carbon `#121512`, relief Graphite `#1C211C`, filets Line `#2A322A`.
- Texte Bone `#E9ECE6`, texte secondaire Ash `#8E978C`.
- Accent `#56B947`, survol `#8BE36B`, sélection teintée `#12290F`.
- Big Shoulders Display pour les titres et scores, JetBrains Mono pour les données et commandes, Archivo pour les noms et explications.
- Angles droits, bordures de 1 px, espacements sur une grille de 8 px. Le vert indique les actions et sélections, sans code couleur par statistique.

Les trois fichiers WOFF2 sont extraits des ressources incorporées au document fourni, servis localement dans `public/fonts` avec leurs licences. Le site et l’atelier partagent les mêmes variables de palette et de typographie définies dans `app/design-system.css`. La disposition propre à l’analyse reste limitée à `.sequence-workspace`.

La hiérarchie corrigée place le contexte du match et les scores dans un en-tête compact. La vidéo est la surface dominante à gauche ; un seul panneau à droite regroupe le temps, les joueurs et la grille d’actions immédiates. Les passes en chaîne et les détails suivent les actions. Les précisions prolongent ce même panneau sans carte imbriquée.

La timeline occupe toute la largeur sous la vidéo et le panneau de saisie. « Revoir » y déploie les filtres, la liste et la lecture des extraits ; la vidéo reste montée entre les modes. Les réglages de source sont ensuite dans un volet secondaire. Sur mobile, l’ordre est vidéo → saisie → timeline → réglages, sans timeline intercalée avant les commandes de saisie.

Validation locale : le banc `tests/browser/annotation-preview` monte les composants réels avec un match fictif. Vérifier passes en chaîne, historique, correction, lecture filtrée, maintien de la vidéo entre modes, polices locales et absence de débordement sur mobile. La vidéo de test n’est pas une détection du terrain ni des joueurs.
