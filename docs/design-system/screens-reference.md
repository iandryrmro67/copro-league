# COPRO//HUD — README des écrans

Oct 8, 2026 · @iandj

## Comment lire ce document

Chaque écran du design system COPRO//HUD est un board numéroté dans le [canvas Design](https://claude.ai/artifact/ESdd9T2Y4CZZsaUJDiVuHj) ; ce README dit quel board correspond à quelle page de l'app Copro League.

- Le numéro du board est le préfixe de son titre dans le canvas (ex. « 42 — Accueil · version finale »).
- Les numéros manquants (10 à 16, 32 à 35, 38 à 40) sont des boards supprimés pendant le tri : ne les cherche pas.
- Statuts utilisés plus bas : **Retenu** = à implémenter tel quel, **Référence** = composant ou règle à réutiliser, **Ancien** = remplacé, gardé pour mémoire.
- Tout est en 1440 px de large, sauf le board 06 (mobile, 390 px).

## Fondations du design system

Ces boards définissent les règles ; ils ne sont pas des pages de l'app. Les consulter avant d'implémenter n'importe quel écran.

| Board | Contenu | Statut |
| --- | --- | --- |
| 00 — Logo | Logo COPRO//HUD et variantes | Référence |
| 01 — Principes & couleurs | Palette (Kush #56B947, Trichome #8BE36B, Void #0A0C0A…), principes | Référence |
| 02 — Typo & chiffres | Big Shoulders Display, JetBrains Mono, DM Sans, style des chiffres | Référence |
| 03 — Composants | Boutons, champs, tuiles, coins coupés à 45° | Référence |
| 21 — Grille & mise en page | Grille 1440 px, marges, espacements | Référence |
| 22 — Hiérarchie visuelle | Niveaux de titres, poids, contraste | Référence |
| 26 — Kit web · saisie & navigation | Formulaires, menus, onglets | Référence |
| 27 — Kit web · retours & données | Toasts, états vides, tableaux, badges d'état | Référence |
| 29 — Chargement & transition 2D | Animation du logo au chargement et entre pages | Référence |

Règles générales : fond sombre, un seul accent vert, rayon 0, filets de 1 px, pas de raccourcis clavier, pas de photos placées en attente.

## Quel écran va où

Une ligne par page de l'app, avec le ou les boards à suivre. « Retenu » signifie choisi par toi pendant le travail ; « Proposé » signifie conçu mais pas encore validé explicitement.

| Page de l'app | Board(s) | Statut | Note |
| --- | --- | --- | --- |
| Accueil | 42 (scroll animé), 43 (4 écrans à plat) | Retenu | Premier écran = board 20, inchangé |
| Chargement / transition | 29 | Proposé | Logo animé en 2D |
| Page match (résultat, stats du match) | 31 | Proposé | Version A, dashboard |
| Tirage des équipes (draft) | 37, 28, 04 | Retenu | 37 = choix du mode et animations ; 28 = animation des cartes réutilisée dans le mode Cartes ; 04 = cartes joueurs |
| Liste et menu joueurs | 08 | Proposé | Structure du menu |
| Fiche joueur | 17 (overview), 18 (compare), 19 (duo), 25 (identité & palmarès) | Proposé | Quatre onglets de la même fiche |
| Stats individuelles | 36 | Retenu | Fiche immersive avec radar, heatmap et mur de tuiles |
| Classements & stats | 30, 09 | Retenu (30) | 30 = composants retenus ; 09 = dataviz |
| Classement mobile | 06 | Proposé | Seul board en 390 px |
| Awards & badges | 23, 07, 24 | Proposé | 24 = badges d'identité |
| Admin : analyse du match, saisie timeline | 41 | Retenu | Parcours complet, voir la section Match, analyse et saisie |
| Replays | 41 (vidéo liée à la timeline) | À concevoir | Pas de board dédié |

## Accueil : version finale

L'accueil est une page verticale de 4 écrans de 900 px, un par section. Le board 42 est la version qui défile avec animations ; le board 43 montre les mêmes 4 écrans à plat pour les relire d'un coup d'œil.

1. **Terrain** : le board 20, inchangé (terrain en perspective, top 5 ELO, prochain match avec compte à rebours et bouton « Je suis partant », chiffres clés).
2. **Vestiaire** : 10 casiers (un par joueur du match), écran du match au fond avec la programmation (19:30 à 21:15), boutons Google Agenda, Apple / Outlook (.ics) et « Ajouter à mon calendrier ». Une porte s'ouvre au survol et montre l'ELO.
3. **Chiffres** : cinq fun facts en colonnes, avec compteurs qui s'incrémentent et barres de progression. Le logo CL tourne en fond et se déclenche au scroll.
4. **FAQ** : accordéon de 6 questions, une seule réponse ouverte à la fois, avec pied de page.

Comportements à implémenter :

- Les sections alignent le scroll sur chaque écran (scroll-snap vertical).
- La barre de navigation apparaît après le terrain ; quatre repères cliquables restent à droite.
- Les blocs montent et apparaissent en entrant dans l'écran ; la rotation du logo suit le scroll avec une animation liée au scroll (Chrome récent), prévoir un repli sur les autres navigateurs.
- Le logo vient de la vidéo d'origine, découpée en 48 images ; à réutiliser comme planche d'images ou comme vidéo liée au scroll.

## Match, analyse et saisie

**Board 31, fiche match.** C'est la page de consultation d'un match terminé : score, stats des joueurs et déroulé. Elle se lit depuis le calendrier et depuis le profil d'un joueur.

**Board 41, saisie de la timeline (admin).** C'est le flux d'analyse d'un match, étape par étape :

1. Choisir l'auteur de l'action.
2. Choisir l'action (passe, tir, perte, récupération, etc.).
3. Répondre à une seule question à la fois, pour garder la saisie rapide.
4. Indiquer le résultat de l'action.
5. Choisir le receveur et le type de passe quand c'est pertinent.
6. Placer la position finale en dernier, avec l'option « Position inconnue ».

Les passes s'enchaînent : le receveur d'une action devient l'auteur de la suivante. La timeline gère aussi les scénarios (but, tir arrêché, perte de balle) et des filtres pour retrouver une action. Trois états existent pour une saisie : brouillon local, sauvegardé, publié.

**Board 37, tirage.** Le tirage des équipes propose 3 modes. Les boards 28 et 04 en sont les états complémentaires. Pas de postes dans le tirage, c'est du foot à 5.

## Boards à ignorer et points ouverts

**À ignorer.** L'ancien lobby du board 05 est remplacé par l'accueil (boards 20 et 42). Les boards 38, 39 et 40, ainsi que les anciennes variantes d'accueil HomeA à D, ont été supprimés : ne pas les chercher. Certains numéros manquent dans le canvas, c'est normal.

**Points ouverts pour le développement.**

- Les fun facts, la date du prochain match (sam. 11 oct), le lieu (« Five de la bande »), le programme du soir et les ELO affichés sont des valeurs d'exemple.
- Le board 40 (analyse retenue) n'existe plus : le board 41 porte maintenant tout le flux de saisie.
- La page Replays n'a pas encore de board.
- Aucune version mobile n'est dessinée pour l'accueil ni pour la timeline.
- Les états de correction d'une saisie de timeline ne sont pas conçus.
- Les animations liées au scroll demandent un Chrome récent : prévoir un repli.
- La section Fondations de ce document décrit les boards d'après leur titre ; à vérifier contre le contenu réel avant de s'y fier.
