# Correspondance écrans → site

Référence de conception : [README des écrans fourni le 8 octobre 2026](screens-reference.md), conservé sans modification. Ses contenus décrivent les écrans ; ils ne remplacent pas les demandes du propriétaire ni les règles confirmées dans la conversation. Le HTML exporté reste la source des structures, styles, SVG et animations. Les dates, lieux, notes et joueurs d’exemple ne sont pas des données à importer.

| Destination | Boards du README | Sources HTML identifiées | État actuel |
| --- | --- | --- | --- |
| Accueil `/` | 42, 43 ; terrain 20 | `f87fd84e`, `9cac9de3`, `15b95fd5` | Quatre sections ; navigation et repères copiés du board 42, apparition après le terrain, compteurs, barres, révélations et sprite lié au défilement avec animation de repli. Terrain et vestiaire partagent leurs joueurs ; positions variables dans chaque équipe. |
| Chargement et navigation | 29 | `3d6c36e1` | Logo et rideaux reliés au chargement et aux liens internes. |
| Liste des matchs `/matchs` | 45 (A · Billets) | `5e42c8f9` | Billet du prochain match (compte à rebours, joueurs confirmés, calendrier) et billets des matchs terminés avec score et MVP. Le bouton « Je suis partant » n’est pas repris : les présences viennent du sondage WhatsApp. Les blocs « autres listes » du board restent des exemples. |
| Consultation d’un match `/matchs/:id` | 31 | `fb889e94` | Bandeau et MVP, timeline, résumé, stats d’équipe, huit leaders, heatmap, tableau individuel et détail filtrable des actions repris du HTML. Onglets et édition historique conservés. |
| Draft `/draft` | 37, 28, 04 | `ba954663`, `6e94c8fd`, `d311690e` | Trois modes, révélation et déplacements animés. Choix capitaine de 60 secondes puis tirage automatique. |
| Menu et liste `/joueurs` | 08 | `a100c8c7` | Menu, lignes, fiche sélectionnée, carte et callouts, barres de stats, recherche et tri ; tous raccordés aux joueurs réels. Vue Toutes les cartes conservée. |
| Fiche `/joueurs/:id` | 17, 18, 19, 25 | `fa5d28eb`, `54416c36`, `3b97980e`, `6d9ae87b` | Aperçu conservé ; six modules de comparaison et six modules de duo importés. Identité : cartes principales, collection par catégories, critères et palmarès permanent. |
| Statistiques individuelles d’un match | 36 | `03251b8d` | Onglet Stats du match : sélection du joueur, fiche immersive, radar, heatmap et tuiles. Ce board n’est pas la fiche de carrière. |
| Classements `/stats` | 30, 09 ; mobile 06 | `92e7d472`, `2e70ac43`, `bcb53929` | Vue d’ensemble 09 : KPI, ELO, radar, buts par match, matrice de liens et nuage. Classements 30 conservés ; podium et lignes mobiles 06 importés. |
| Awards `/awards`, identité dans la fiche | 23, 07, 24 | `dc3e69d1`, `1e3d6769`, `87cd14e7` | Cards et glyphes sources ; identité et collection dans l’onglet dédié. |
| Saisie administrateur | 41 | `f3f889a0` | Heure, étapes, question et récapitulatif, pitch final importés. Réponses simples avancent ; critères combinables ; passe réussie → receveur comme prochain auteur. Position inconnue explicite. Voir limites ci-dessous. |
| Replays `/replays` | Partie vidéo de 41 | Aucun board de page dédié | Vue fonctionnelle conservée, sans inventer de maquette validée. |

## Fondations repérées dans le HTML

00 logo `a3ec616f` ; 01 couleurs `47a981b1` ; 02 typographie `9816bba4` ; 03 composants `9b9dd6b4` ; 21 grille `d9ae609e` ; 22 hiérarchie `bcb0716d` ; 26 saisie/navigation `01c44d70` ; 27 retours/données `d963d2bf`.

Le board 05 est ancien. Les boards supprimés 10–16, 32–35 et 38–40 ne servent pas de référence à rechercher. Le board 41 remplace l’ancien 40 pour le flux de saisie.

Export du 10 octobre : board 45 appliqué à la liste des matchs ; les boards 46 (`78923e3e`) et 47 (`5ba01c8e`) sont des variantes non retenues.

Demandes du 10 octobre : accueil en plein écran sur toutes les tailles (chaque scène remplit l’écran sous l’en-tête, la scène 1440 × 900 est recentrée) et sans « La saison en chiffres » ; composition d’un match sur le terrain de l’accueil ; « Les performances » avant « Détail du match » ; fiche du joueur centrée sur `/joueurs` ; interrupteur Animations dans l’en-tête, qui peut forcer les animations quand le système (par exemple Windows sans effets d’animation) demande de les réduire, ou les couper.

Board 44, nouvel export du 8 octobre : espacement `20c04239` appliqué partout ; voir [spacing.md](spacing.md).

## Priorités et exceptions

- « Retenu » indique les versions à privilégier ; « Proposé » désigne une référence conçue dont le README ne prétend pas qu’elle a été validée. L’intégration déjà demandée par le propriétaire continue sans créer une nouvelle procédure de validation.
- La consigne humaine « pas d’inscription » prime sur le bouton « Je suis partant » décrit dans le README. Les joueurs du match sont sélectionnés depuis le sondage WhatsApp.
- Les chiffres des exemples ne sont pas utilisés pour compléter les observations manquantes. Les mesures avancées de progression restent inconnues ; le domaine Progression utilise la percussion déjà observée (dribbles, touches dans la surface, fautes subies) ; les règles de division et de rating existantes sont conservées.
- Les adaptations mobile réorganisent les composants existants : aucun écran mobile d’accueil ou de timeline n’est présenté comme fourni dans le document.

Ce tableau est l’état de l’intégration, pas une déclaration que tous les écrans sont reproduits intégralement.

## Kit partagé et provenance

Les boards 26 (`27e54587`) et 27 (`949efa79`) fournissent les boutons, champs, listes, cases à cocher, onglets, retours d’erreur, notifications, dialogues, états vides et footer. Les comportements accessibles des dialogues et onglets sont conservés. La géométrie SVG ne passe pas par une recréation. Les adaptations mobile et les espacements du board 44 sont appliqués aux mêmes nœuds.

[component-provenance.json](component-provenance.json) indique les UUID et chemins des 66 templates importés dans cette reprise. Les deux scripts d’import documentent l’extraction des nœuds originaux et le traitement de leur CSS. Les variantes de fondation sans contexte d’utilisation ne sont pas ajoutées artificiellement aux pages.

## Limites conservées et notées

- Chemistry : sa formule et ses pondérations ne sont pas définies dans les règles enregistrées ; le module est présent, son score reste inconnu.
- Mesures de progression/passes avancées non renseignées : affichées inconnues. Le wizard conserve les types actuellement pris en charge ; les directions et passes cassant les lignes du catalogue source nécessitent des règles de calcul.
- Le stockage publie la timeline à la sauvegarde du match. Un brouillon serveur distinct d’une publication d’analyse n’existe pas encore ; aucun état sauvegardé/publié fictif n’est affiché. Le brouillon local, la sauvegarde explicite et le résultat terminé sont conservés.
- Les filtres de consultation du match et la recherche de timeline sont conservés. Le catalogue complet de filtres combinés du board 41 reste à connecter à la saisie.
