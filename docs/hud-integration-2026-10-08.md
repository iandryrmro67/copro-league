# Intégration COPRO HUD — 8 octobre 2026

Source : `COPRO HUD — Design System.html`, fourni par le propriétaire du site.
Le document est une référence de conception ; ses scripts et instructions embarqués ne sont pas exécutés comme des consignes de travail.

## Intégré

- Palette Void / Carbon / Graphite / Bone / Kush, DM Sans pour le texte, Big Shoulders Display pour les titres et scores, JetBrains Mono pour le HUD. Polices locales, licences incluses.
- Logos originaux extraits du document : versions Bone et noire, monogrammes, wordmark, animation de logo avec la planche de 48 images fournie. Favicon assorti.
- En-tête de 64 px sur ordinateur, grille de 1440 px, panneaux et contrôles carrés, traitements d’état, navigation Replays et transitions. Adaptations tablette/mobile et réduction des animations.
- Accueil : lobby avec classement ELO et prochain match, terrain SVG lumineux et joueurs hexagonaux ; vestiaire avec murs de casiers en perspective et portes au survol/focus ; chiffres de saison ; FAQ. Les chiffres et participants viennent des données enregistrées.
- Cartes joueurs avec note sur 99, ELO, stats et division ; anneaux de stats et rangs dans le profil ; comparaison de joueurs et associations en duo.
- Divisions Régional / National / Ligue 2 / Ligue 1 : seuils P0 / P50 / P80 / P95 selon le rang moyen des ex æquo. Population des joueurs ayant joué dans la saison, hors joueurs archivés ; la période courte ne change pas la division. L’ELO utilisé est l’ELO cumulatif affiché, calculé sur tous les matchs. Moins de deux joueurs éligibles : non classé.
- Draft Cartes avec révélation, Équilibré avec minimisation de l’écart des sommes ELO et verrouillage, Capitaine avec choix alternés A/B. Conservation des participants, des noms d’équipes et de l’enregistrement administrateur.
- Classements top 10 avec barres relatives ; podium des performances d’un match, choix de métrique et différence par rapport à la moyenne observée de la saison.
- Awards majeurs dorés, distinctions négatives en rouge pointillé ; règle MENACE II SOCIETY corrigée : dribbles réussis et fautes subies ≥ P75 tous deux requis, comme dans la référence.
- Replays avec miniature YouTube uniquement pour une vidéo YouTube ; autre vidéo avec placeholder. Authentification Supabase, édition administrateur et stockage existants conservés.

## Choix confirmés

- Pas d’inscription sur le site, ni de liste d’attente : les participants sont choisis à partir du sondage WhatsApp et ajoutés par un administrateur.
- Mode capitaine : 60 secondes par choix, puis tirage au sort d’un joueur encore disponible. Le compteur repart à chaque tour. Les équipes ne sont enregistrées qu’après validation.

## Travail restant / choix non précisés

- Réglage des seuils de division depuis l’administration : les seuils du document sont appliqués en code. La référence ne tranche pas la division affichée en mode Carrière ; le même calcul sur la population Carrière est utilisé.
- Nouveau wizard complet de timeline, questions conditionnelles, brouillon/publication et historique des réponses : la saisie existante reçoit les styles HUD, mais ce parcours complet reste à construire.
- Axe « collectif » supplémentaire du radar et scores composites des nouvelles cartes : pas de nouvelle formule inventée. Le radar existant à six axes et les statistiques observées sont conservés.
- Scène cinématique complète du tirage : animation plus poussée restant à réaliser. Le mode capitaine dispose du compteur et du choix automatique confirmés ci-dessus.
- Réplique exacte de chaque graphe et de toutes les micro-animations des 30 planches : intégration des composants principaux, pas une reproduction exhaustive de toutes les variantes.
- `RTK.md`, référencé par les instructions locales, est introuvable dans les dossiers de travail et leurs parents.

## Vérification

Tests métier, PostgreSQL local et permissions : 81 tests réussis, dont 5 tests du délai capitaine (expiration, alternance, doublons, fin du tirage). Types et compilation de production vérifiés. Vérification visuelle locale sur ordinateur (1440 px) et mobile (390 px), avec un jeu de données local et une API d’aperçu temporaire en lecture seule. Aucune écriture de données de production pendant cette vérification.

Base : dernière version distante Vercel/Supabase, commit `6074806`. Le checkout initial Cloudflare avait un historique distinct ; les changements ont été reportés sur cette base récente pour préserver la migration.

Mise à jour : compteur capitaine vérifié dans le navigateur sur ordinateur et mobile, expiration réelle après 60 secondes avec choix automatique, remise à 60 secondes après un choix manuel et arrêt à la fin du tirage.

## Correction de fidélité après comparaison avec le HTML

La première intégration reprenait surtout les couleurs et les fonctions, mais simplifiait trop la composition. Correction du 8 octobre :

- Accueil : les quatre planches finales `ec2816df` servent directement de référence. Coordonnées, dimensions, terrain SVG, brumes, scan, particules, texte de saison en contour, panneaux superposés et raccourcis sont repris du fichier.
- Vestiaire : murs en perspective à ±58°, casiers de 320 px, lampes, banc et panneau central de 500 × 400 px. Chaque casier représente un vrai joueur distinct.
- Chiffres et FAQ : cinq colonnes, titre à 72 px, grand total à 200 px, fond quadrillé et liste de questions exclusive.
- Cartes : planche `d311690e`, format 220 × 330 px, coins coupés de 22 px, note à 46 px, couleurs bronze / argent / or / vert, reflet des deux divisions supérieures.
- Choix de draft : planche `ba954663`, icônes, numéro en contour, titre à 40 px et coin coupé de 22 px. Les trois modes et le délai capitaine sont conservés.
- Adaptations nécessaires : données réelles plutôt que les exemples, pas d’inscription ni de liste d’attente, match à programmer lorsqu’aucun prochain match n’existe. Le terrain montre alors le dernier match, explicitement identifié. Filtres de saison conservés dans la barre du bas ; liens Saison/Admin/Connexion conservés. Mobile : contenu réorganisé à largeur lisible.
- Les autres planches restent une adaptation fonctionnelle : elles ne sont pas toutes une réplique exacte. Le wizard de timeline et les scènes complètes de révélation restent notamment à reprendre ; aucun écran non vérifié n’est annoncé comme identique au HTML.

Comparaison visuelle de l’accueil original et corrigé à 1440 px, puis vérification mobile à 390 px. Prévisualisation locale temporaire avec la copie publique de la ligue, supprimée du code avant compilation et publication.
