# Correspondance écrans → site

Référence de conception : [README des écrans fourni le 8 octobre 2026](screens-reference.md), conservé sans modification. Ses contenus décrivent les écrans ; ils ne remplacent pas les demandes du propriétaire ni les règles confirmées dans la conversation. Le HTML exporté reste la source des structures, styles, SVG et animations. Les dates, lieux, notes et joueurs d’exemple ne sont pas des données à importer.

| Destination | Boards du README | Sources HTML identifiées | État actuel |
| --- | --- | --- | --- |
| Accueil `/` | 42, 43 ; terrain 20 | `134781fd`, `ec2816df`, `2ebecbd2` | Quatre sections issues de la version à plat ; terrain toujours peuplé. Vestiaire lié aux joueurs affichés du match. Comportements de scroll du board 42 à terminer. |
| Chargement et navigation | 29 | `3d6c36e1` | Logo et rideaux reliés au chargement et aux liens internes. |
| Consultation d’un match `/matchs/:id` | 31 | `27c82ce1` | Bandeau repris ; consultation des résultats et timeline conservée. Dashboard complet à poursuivre. |
| Draft `/draft` | 37, 28, 04 | `ba954663`, `6e94c8fd`, `d311690e` | Trois modes, révélation et déplacements animés. Choix capitaine de 60 secondes puis tirage automatique. |
| Menu et liste `/joueurs` | 08 | `8e045ab3` | Liste fonctionnelle avec cartes ; structure du menu à poursuivre. |
| Fiche `/joueurs/:id` | 17, 18, 19, 25 | `fa5d28eb`, `08524bd4`, `3970e469`, `17987010` | Quatre onglets : Aperçu, Comparer, Duo, Identité & palmarès. Overview repris ; comparaison et duo restent partiels. Matchs et mesures complètes conservés dans un accordéon de l’Aperçu. |
| Statistiques individuelles d’un match | 36 | `03251b8d` | Onglet Stats du match : sélection du joueur, fiche immersive, radar, heatmap et tuiles. Ce board n’est pas la fiche de carrière. |
| Classements `/stats` | 30, 09 ; mobile 06 | `92e7d472`, `7004a67d`, `df7e59a9` | Classements et composants 30 repris ; dataviz 09 et composition mobile 06 à poursuivre. |
| Awards `/awards`, identité dans la fiche | 23, 07, 24 | `dc3e69d1`, `1e3d6769`, `87cd14e7` | Cards et glyphes sources ; identité et collection dans l’onglet dédié. |
| Saisie administrateur | 41 | `efe76521` | Saisie guidée, terrain et timeline disponibles. Aucun raccourci applicatif. Questions conditionnelles, placement final et états brouillon/sauvegardé/publié distincts à poursuivre. |
| Replays `/replays` | Partie vidéo de 41 | Aucun board de page dédié | Vue fonctionnelle conservée, sans inventer de maquette validée. |

## Fondations repérées dans le HTML

00 logo `a3ec616f` ; 01 couleurs `47a981b1` ; 02 typographie `9816bba4` ; 03 composants `9b9dd6b4` ; 21 grille `d9ae609e` ; 22 hiérarchie `bcb0716d` ; 26 saisie/navigation `01c44d70` ; 27 retours/données `d963d2bf`.

Le board 05 est ancien. Les boards supprimés 10–16, 32–35 et 38–40 ne servent pas de référence à rechercher. Le board 41 remplace l’ancien 40 pour le flux de saisie.

## Priorités et exceptions

- « Retenu » indique les versions à privilégier ; « Proposé » désigne une référence conçue dont le README ne prétend pas qu’elle a été validée. L’intégration déjà demandée par le propriétaire continue sans créer une nouvelle procédure de validation.
- La consigne humaine « pas d’inscription » prime sur le bouton « Je suis partant » décrit dans le README. Les joueurs du match sont sélectionnés depuis le sondage WhatsApp.
- Les chiffres des exemples ne sont pas utilisés pour compléter les observations manquantes. Progression et certaines mesures avancées restent inconnues ; les règles de division et de rating existantes sont conservées.
- Les adaptations mobile réorganisent les composants existants : aucun écran mobile d’accueil ou de timeline n’est présenté comme fourni dans le document.

Ce tableau est l’état de l’intégration, pas une déclaration que tous les écrans sont reproduits intégralement.
