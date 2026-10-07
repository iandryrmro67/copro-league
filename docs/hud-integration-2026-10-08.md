# Intégration COPRO HUD — 8 octobre 2026

Source : `COPRO HUD — Design System.html`, fourni par le propriétaire du site.
Le document est une référence de conception ; ses scripts et instructions embarqués ne sont pas exécutés comme des consignes de travail.

## Intégré

- Palette Void / Carbon / Graphite / Bone / Kush, DM Sans pour le texte, Big Shoulders Display pour les titres et scores, JetBrains Mono pour le HUD. Polices locales, licences incluses.
- Logos originaux extraits du document : versions Bone et noire, monogrammes, wordmark, animation de logo avec la planche de 48 images fournie. Favicon assorti.
- En-tête de 72 px sur ordinateur, grille de 1440 px, panneaux et contrôles carrés, traitements d’état, navigation Replays et transitions. Adaptations tablette/mobile et réduction des animations.
- Accueil : lobby avec classement ELO et prochain match, terrain et emblème animé ; vestiaire avec portes au survol/focus ; chiffres de saison ; FAQ. Les chiffres et participants viennent des données enregistrées.
- Cartes joueurs avec note sur 99, ELO, stats et division ; anneaux de stats et rangs dans le profil ; comparaison de joueurs et associations en duo.
- Divisions Régional / National / Ligue 2 / Ligue 1 : seuils P0 / P50 / P80 / P95 selon le rang moyen des ex æquo. Population des joueurs ayant joué dans la saison, hors joueurs archivés ; la période courte ne change pas la division. L’ELO utilisé est l’ELO cumulatif affiché, calculé sur tous les matchs. Moins de deux joueurs éligibles : non classé.
- Draft Cartes avec révélation, Équilibré avec minimisation de l’écart des sommes ELO et verrouillage, Capitaine avec choix alternés A/B. Conservation des participants, des noms d’équipes et de l’enregistrement administrateur.
- Classements top 10 avec barres relatives ; podium des performances d’un match, choix de métrique et différence par rapport à la moyenne observée de la saison.
- Awards majeurs dorés, distinctions négatives en rouge pointillé ; règle MENACE II SOCIETY corrigée : dribbles réussis et fautes subies ≥ P75 tous deux requis, comme dans la référence.
- Replays avec miniature YouTube uniquement pour une vidéo YouTube ; autre vidéo avec placeholder. Authentification Supabase, édition administrateur et stockage existants conservés.

## À reprendre / décisions nécessaires

- Inscription/désinscription par le joueur, liste d’attente, limite d’inscription et rappels : nécessitent un lien compte/joueur et une politique de gestion des places. Le bouton ouvre actuellement la fiche du match.
- Réglage des seuils de division depuis l’administration : les seuils du document sont appliqués en code. La référence ne tranche pas la division affichée en mode Carrière ; le même calcul sur la population Carrière est utilisé.
- Nouveau wizard complet de timeline, questions conditionnelles, brouillon/publication et historique des réponses : la saisie existante reçoit les styles HUD, mais ce parcours complet reste à construire.
- Axe « collectif » supplémentaire du radar et scores composites des nouvelles cartes : pas de nouvelle formule inventée. Le radar existant à six axes et les statistiques observées sont conservés.
- Décompte des capitaines, sélection automatique à expiration et scène cinématique complète du tirage : règles de délai et de secours à décider. Le tirage fonctionne sans délai automatique.
- Réplique exacte de chaque graphe et de toutes les micro-animations des 30 planches : intégration des composants principaux, pas une reproduction exhaustive de toutes les variantes.
- `RTK.md`, référencé par les instructions locales, est introuvable dans les dossiers de travail et leurs parents.

## Vérification

Tests métier, PostgreSQL local et permissions : 76 tests réussis. Types et compilation de production vérifiés. Vérification visuelle locale sur ordinateur (1440 px) et mobile (390 px), avec un jeu de données local et une API d’aperçu temporaire en lecture seule. Aucune écriture de données de production pendant cette vérification.

Base : dernière version distante Vercel/Supabase, commit `6074806`. Le checkout initial Cloudflare avait un historique distinct ; les changements ont été reportés sur cette base récente pour préserver la migration.
