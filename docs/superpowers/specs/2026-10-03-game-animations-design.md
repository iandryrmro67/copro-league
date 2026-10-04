# Copro League — animations et navigation de jeu

Date : 3 octobre 2026. Statut : proposition validée par la demande d’intégration et de publication du 4 octobre 2026 ; réalisation et publication à effectuer après revue du plan.

## Objectif et demande de référence

Implémenter les cinq systèmes demandés dans le texte fourni par l’utilisateur : BootScreen, CardCarousel, GameMenu, BadgeViewer et interactions Hover partagées. Donner au site l’aspect d’un menu de jeu sombre et technique, avec une utilisation mobile rapide, sans ralentir la saisie des actions d’un match. Le texte utilisateur constitue le brief visuel ; ce document précise son raccordement au site existant et les contradictions techniques à résoudre.

Les couleurs, les trois polices, les coins carrés, les durées et les courbes sont ceux du brief. Une seule animation dominante joue à la fois. Les effets secondaires restent courts et discrets. Toutes les animations de propriétés utilisent uniquement transform et opacity.

## État du projet vérifié

- Source de production : `work/vercel`, branche `codex/vercel-supabase`, code existant `2a3fa33`.
- Next.js App Router, React 19, TypeScript, Tailwind ; Motion et GSAP absents des dépendances actuelles.
- `components/league.tsx` charge `/api/league`, gère les filtres et affiche les pages selon `usePathname`. Les liens actuels sont des ancres qui rechargent la page.
- `/api/league` consulte Supabase côté serveur. La réponse dépend de la connexion et peut contenir des brouillons administrateur ; elle ne doit pas être copiée dans un cache public ou persistant.
- La liste des joueurs, la sélection des participants et les trois modes de draft existent. Le moteur de répartition et la validation des équipes doivent garder leur comportement.
- Les profils ont 35 badges calculés, actifs ou inactifs. Les Awards ont 25 trophées, avec projections et palmarès figés distincts. Aucun événement persistant de déblocage des badges n’existe.
- Les vidéos sont déjà liées aux matchs ; il n’existe pas de page `/replays`. Les fichiers vidéo internes requièrent une connexion.
- L’analyseur dispose de 13 familles d’actions, d’une saisie guidée précise, d’une timeline, d’un mode vidéo masquée et d’une sauvegarde locale. L’ordre vertical vidéo → joueurs/actions → timeline est conservé.
- Les polices sont locales. `app/design-system.css` définit déjà la palette ; `--highlight` correspond à la nouvelle appellation `--trichome`. Le focus actuel diffère du brief.

## Approche retenue et alternatives

**Recommandation : une couche commune Motion, intégrée aux flux existants.** Un fournisseur persistant dans le layout racine porte les transitions, le son et les préférences. Les composants métier gardent leurs calculs et leurs droits d’accès. Les gestes et la grille animée sont chargés sur les écrans qui en ont besoin.

Une réalisation essentiellement CSS réduirait les dépendances, mais ne fournirait pas le système Motion de gestes et de layout demandé. Une refonte complète du routage et du moteur de draft permettrait une grande liberté, mais élargirait le travail sans bénéfice nécessaire pour ces animations. Ces deux alternatives ne sont pas retenues.

Motion est la seule dépendance produit ajoutée. Pas de GSAP nécessaire pour la séquence prévue ; pas de composants premium Motion+ ni de service payant.

## 1. Fondations, chargement et accessibilité

Créer `app/tokens.css`, source unique des couleurs et des familles de polices. Déplacer les déclarations correspondantes du design system existant, conserver ses règles de composants et ses alias de compatibilité : `--highlight: var(--trichome)`, `--green`, `--bg`, `--panel`, `--muted`, ainsi que `--body` utilisé par le site.

Palette : Void #0A0C0A, Carbon #121512, Graphite #1C211C, Line #2A322A, Ash #8E978C, Bone #E9ECE6, Kush #56B947, Trichome #8BE36B, Indica #1E4A19, Resin #12290F. Big Shoulders Display 800/900 pour les titres, JetBrains Mono pour le HUD et les nombres, Archivo pour le texte. Espacements sur une grille de 8 px ; capitales et espacement des lettres sur les labels, sans imposer les capitales aux textes longs ou aux champs saisis.

`lib/motion.ts` centralise entrée `[.22, 1, .36, 1]`, sortie `[.64, 0, .78, 0]`, micro 150–250 ms, transition 350–600 ms, séquences longues 800–1500 ms, fondus réduits 150 ms, et variantes communes. L’inertie du glisser est amortie sans rebond visible ; les autres mouvements utilisent les courbes du brief.

Le fournisseur d’animation respecte les changements de `prefers-reduced-motion` en direct. Dans ce mode, supprimer translations, inclinaisons, curseur personnalisé, particules, scanlines, tremblement et décodage ; utiliser un fondu de 150 ms. Les contenus restent accessibles si le moteur d’animation est encore en cours de chargement.

Focus : contour Kush 1 px, décalage 2 px. Cibles tactiles d’au moins 44 px. Aucun contrôle exclusivement fondé sur un geste. Les dialogues bloquants gèrent le focus et le rendent au déclencheur. M, les flèches et Échap n’interceptent pas la saisie d’un champ ni les raccourcis de l’analyseur ou d’un autre dialogue.

Le son est désactivé au premier chargement. Le bouton SON ON/OFF expose son état. Les sons sont générés localement avec Web Audio, durent au plus 120 ms et ne démarrent qu’après activation par l’utilisateur. Une préférence non sensible peut être mémorisée ; aucune lecture automatique de vidéo n’est ajoutée. Retour haptique de 8 ms après un geste utilisateur si pris en charge, sans erreur sur les autres appareils.

## 2. BootScreen et vrai chargement

Afficher une fois par session avec une clé sessionStorage versionnée. Une réponse de ligue déjà disponible en mémoire permet de sauter l’intro. Le mode sans sessionStorage reste fonctionnel et évite une boucle d’intros pendant les navigations internes.

Suivre trois groupes de tâches effectivement terminées : chargement des trois polices locales, décodage du logo/image critique de l’écran initial, résolution de la première requête `/api/league`. Les groupes valent respectivement 30, 10 et 60 points. Le pourcentage représente ces étapes pondérées, pas un pourcentage fictif d’octets téléchargés. Il est monotone et atteint 100 seulement quand les groupes sont prêts. Le compteur interpolé rejoint la progression réelle sans la dépasser.

Grain fixe à 3 %, introduction noire de 300 ms, logo existant présenté dans un cadre circulaire Kush, remplissage de bas en haut via un calque déplacé dans un masque fixe. Révéler le contour par des calques de masquage mobiles : pas d’animation de stroke-dashoffset. Barre de 2 px remplie par scaleX ; repère blanc mobile. Les lignes de terminal apparaissent toutes les 250 ms, puis affichent la saison et les nombres réellement chargés, jamais les exemples fixes « 22 joueurs · 6 matchs ».

Durée minimale de lecture 1,2 s, ouverture du rideau 500 ms ; viser environ 2,5 s sur un chargement ordinaire, sans attendre artificiellement 2,5 s à chaque visite. Flash décoratif de 80 ms à faible surface, contraction du logo, deux moitiés de rideau déplacées par transform. Le flash est supprimé en mouvement réduit.

PASSER apparaît à 600 ms et ferme l’intro immédiatement, mais ne fabrique pas de données : le chargement ou l’erreur du site reste visible. Une erreur API révèle tout de suite l’écran existant Réessayer. Une ressource non critique en échec utilise sa présentation de secours. Après 8 s, retirer l’intro même si une tâche reste en attente ; la requête de ligue possède un délai maximal de 10 s avec erreur et nouvel essai explicites. Aucun rideau ne reste bloqué en cas de navigation ou d’erreur.

## 3. CardCarousel et raccordement à la draft

Composant générique à identifiants stables, rendu de carte fourni par le parent, index contrôlable, callbacks `onSelect` et `onReturn`, texte d’action explicite. Centrage par translation ; carte centrale scale 1, voisines .86 et opacity .5. Glisser horizontal Motion avec élasticité .12, projection de vélocité et snap limité aux index valides, sans ressort mou. Molette horizontale/trackpad et Shift+molette sur desktop ; laisser le défilement vertical de la page fonctionner.

Flèches visibles et clavier gauche/droite/Entrée, annonce du joueur courant après le snap. État sélectionné exposé, bouton « Sélectionner » ou « Retirer » également disponible. Une zone de geste identifiée sur la carte permet les balayages verticaux : monter sélectionne, descendre retire. En dehors de cette zone, le scroll mobile reste naturel. Annuler une sélection ne déclenche aucune écriture serveur.

Tilt de la carte centrale ±8°, perspective 800 px, reflet diagonal Trichome 18 % déplacé par transform. L’orientation mobile est activée uniquement par un bouton explicite et une autorisation quand le navigateur la demande ; refus ou absence de capteur laisse le tilt désactivé. Les listeners sont retirés quand la carte ou l’écran disparaît.

Sélection : mouvement vers le haut, flash local et verrouillage par petite translation de 120 ms, puis retour au repos. La sélection métier est traitée une seule fois, indépendamment du nombre de callbacks d’animation.

Sur `/joueurs`, le carousel présente les profils filtrés et Entrée ouvre le profil. La grille existante reste disponible pour parcourir rapidement tous les noms. Dans la draft, sélectionner/retirer modifie le même roster que les contrôles existants ; après changement, réinitialiser équipes, verrous et capitaines comme actuellement. En mode capitaines, le geste sélectionne un candidat autorisé pour le tour courant ; en mode pack, il révèle la prochaine carte sans modifier le tirage. Les règles d’équilibre et l’enregistrement demeurent dans les fonctions métier existantes. L’analyseur de match conserve ses boutons de joueurs directs.

## 4. GameMenu, HUD et transitions de route

Remplacer masthead/navbar par un HUD permanent : marque vers l’accueil, saison courante, SON ON/OFF, MENU, connexion ou compte/déconnexion. Garder Saisons, Comprendre les stats et Admin autorisé dans une zone secondaire du menu. Le POST de déconnexion reste une opération d’authentification normale.

Menu principal : MATCHS `/matchs`, DRAFT `/draft`, JOUEURS `/joueurs`, STATS `/stats`, AWARDS `/awards`, REPLAYS `/replays`. Grille de 3 colonnes desktop et 2 mobile dans un dialogue plein écran, à contenu défilable si nécessaire. Index 01–06, cascade de 60 ms, entrée Y 16 px, flèche de 6 px et coin coupé fixe. Le remplissage Kush de sélection est un calque scaleX de 250 ms, sous le texte.

À l’ouverture, focus sur l’entrée courante ou la première entrée. Flèches selon le nombre de colonnes réellement affichées, Entrée pour choisir, Échap pour fermer et retour au déclencheur. M ouvre/ferme uniquement hors des champs et des zones possédant déjà un raccourci. Les tuiles demeurent de vrais liens : ouvrir dans un nouvel onglet, copier le lien et utiliser les touches modificatrices fonctionne normalement.

Transition normale : cinq bandes Void fixes, décalage de 40 ms, montée du rideau puis changement de route derrière le rideau, puis sortie. La séquence visuelle totale vise 600 ms lorsque la destination est prête ; le remplissage de tuile précède cette séquence. Préchargement des routes et délai maximal pour libérer l’overlay si une route échoue. Le précédent/suivant du navigateur et les ancres internes restent immédiats et valides. En mouvement réduit, simple fondu de 150 ms.

Le fournisseur de transition est placé dans le layout persistant ; ne pas lui donner une clé fondée sur l’URL, ni remonter les enfants pour relancer un effet. Les réponses de ligue sont partagées en mémoire entre les instances de page, avec requêtes initiales dédupliquées et revalidation existante au focus. Aucune réponse privée dans sessionStorage, localStorage, cache HTTP partagé ou démo. Après connexion/déconnexion, l’état est invalidé par la navigation d’authentification.

Ouvrir/fermer MENU ne démonte jamais l’éditeur. Avant une navigation interne quittant un brouillon, déclencher sa sauvegarde locale existante de manière synchrone ; si elle est indisponible ou en conflit, laisser le dispositif existant de protection présenter la situation au lieu de masquer ou d’effacer le brouillon. Les modifications de la route doivent conserver les protections de version et la récupération actuelles.

La nouvelle page Replays utilise uniquement les vidéos déjà associées aux matchs, avec filtres saison/période, lien vers l’onglet vidéo et état vide clair. Les liens des fichiers internes gardent les protections de connexion ; aucune nouvelle exposition de média privé. Pas de nouvelle plateforme vidéo ni de traitement vidéo.

## 5. BadgeViewer et célébrations

Viewer générique pour badges ou trophées : suivant/précédent, swipe horizontal, flèches clavier, contenu complet accessible. Sortie X 40 px dans le sens du geste ; entrée opposée scale .92→1 en 350 ms. Nom déplacé dans un masque fixe, description retardée de 80 ms, anneau de 1 px révélé en 500 ms par des masques transformés. Réserver les dimensions nécessaires pour empêcher les sauts de mise en page.

Ajouter ce viewer dans Identity/Badge Collection, le palmarès d’un profil et Awards en adaptant les données à leur type. Un trophée non attribué ou en projection garde cette mention ; ne pas le présenter comme un badge verrouillé ou définitivement gagné. Les icônes actuelles sont réutilisées.

Badges inactifs : apparence Ash monochrome, cadenas, barre « Critères vérifiés X / Y » et conditions détaillées. Cette barre indique les vérifications connues, pas une probabilité ni un pourcentage calculé à partir du Badge Score. Montrer les données absentes et les groupes de règles OU/seuil sans laisser croire qu’une simple somme de critères suffit à débloquer le badge. Un badge actif est déterminé uniquement par `BadgeResult.active`, jamais par cette barre.

Grilles filtrées et triées avec Motion layout et identifiants stables. Conserver les règles et les valeurs du moteur `lib/recognition.ts`, ainsi que la distinction historique/projection des Awards.

Célébration de badge : comparaison entre deux réponses réussies pour le même joueur et la même saison pendant la session ; uniquement inactive→active, sur le profil actuellement consulté. Le premier chargement établit la référence sans célébrer. Changer de joueur/saison réinitialise la référence. Pas de célébration provenant d’une absence de données, d’un échec réseau ou du simple montage d’un composant. Dédupliquer par saison/joueur/badge durant la session ; une file bornée évite les superpositions. Il n’existe pas de notification de déblocage entre deux visites indépendantes dans cette version, car aucun historique de ces événements n’est actuellement stocké.

Overlay Void 80 %, badge .6→1, flash Trichome 100 ms, anneau scale 1→2.4, dix particules transform/opacity, bandeau et nom. Fermeture au clic, bouton Fermer, Échap ou après 3 s ; restaurer le focus. Ne jamais superposer cette célébration au boot, au menu ou à une transition. Réduire à un message avec fondu en mouvement réduit. La démo possède son propre déclencheur fictif.

## 6. Hover partagé et curseur

Un fichier par composant : HoverTile, HoverButton, HoverLink. Props TypeScript documentées, conservation des attributs natifs, des refs, du disabled et des liens Next. Des classes compatibles donnent les interactions simples aux boutons/liens existants sans remplacer chaque formulaire ni modifier son comportement.

Desktop avec `(hover: hover) and (pointer: fine)` : aplat Trichome 220 ms sur bouton principal ; Kush sur secondaire ; flèche +6 px ; soulignement scaleX avec origine variable ; appui scale .98 et changement d’état instantané Indica. Ne pas interpoler couleurs, bordures, largeur, blur, filtre ou clip-path : les couches sont déjà peintes et seules leur transformation/opacité changent.

Carte : tilt max 6°, lueur Kush 12 % portée par un calque déplacé, quatre coins de 10 px écartés de 4 px. Image : voile et grain en fondu 200 ms, scanline déplacée une fois en 300 ms. Réutiliser le tilt du carousel plutôt que le cumuler avec HoverTile.

Décodage HUD de 400 ms : couche décorative aria-hidden à largeur fixe au-dessus du texte réel stable, sans changement de texte annoncé aux lecteurs d’écran. Aucun rendu React global à chaque mouvement de souris ; Motion values et rafraîchissement borné pour les caractères.

Curseur personnalisé : point 6 px et viseur 32 px par calques, transform et opacity, suivi amorti d’environ 80 ms. Décoratif, pointer-events none ; masquer le curseur natif uniquement une fois le suivi opérationnel sur un pointeur fin. Conserver le curseur natif sur les champs, texte sélectionnable, lecteur vidéo et surfaces de précision de l’analyseur ; le restaurer à la sortie, en mouvement réduit et en cas de désactivation.

Magnétisme : max 6 px dans un rayon de 60 px autour des boutons principaux, limites au viewport, uniquement desktop. Les boutons de saisie d’actions et les contrôles de timeline ne se déplacent pas, pour conserver la précision du point-and-click. Sur mobile, état appuyé Indica avec retour visuel de 100 ms ; pas de simulation permanente de hover.

## 7. Démonstration et vérification

Créer une vraie route `/dev/animations` indépendante de la requête Supabase, avec données fictives locales. Présenter une animation dominante à la fois et des boutons Rejouer pour les cinq groupes, les transitions, le déblocage et les interactions. Boot exécuté seulement sur demande dans la démo ; rejouer n’efface pas la préférence de session réelle. Contrôles pour observer le mode réduit, les états verrouillés, la progression et les erreurs fictives. Les permissions d’orientation ne sont jamais demandées automatiquement.

Livrables : composants dans `components/animations/`, fournisseur et utilitaires correspondants, `lib/motion.ts`, `app/tokens.css`, styles d’animation séparés, route de démonstration et documentation des intégrations. Aucun changement de schéma Supabase n’est requis.

Vérifications attendues avant publication :

1. Tests des états boot/cache/erreur/skip, navigation et index limites, activation/déduplication de badges et conservation des brouillons. Tests métier existants conservés ; données de test isolées, aucune annotation fictive dans les matchs de production.
2. Compilation Next de production et lint ciblé sur les fichiers modifiés ; signaler séparément les problèmes préexistants.
3. Parcours navigateur mobile 390 px/tablette/desktop : gestes, scroll normal, clavier, focus, menu, état réduit, retour arrière, refus des permissions et son coupé par défaut.
4. Audit Lighthouse mobile de la démo sur une build de production, trois mesures à froid, objectif médiane performance ≥90. Archiver le rapport réel et son contexte ; aucune promesse de score avant mesure. Le boot manuel n’est pas actif pendant cet audit, mais fait l’objet d’un parcours visuel séparé.
5. CLS de la démo égal à 0 pendant les animations après le chargement initial. Réserver hauteur/largeur des médias et du viewer, fondre/translater les couches sans déplacer le flux ; vérifier aussi le chargement initial des polices et les changements de contenu.
6. Publication dans le projet Vercel existant une fois la réalisation validée, vérification des pages publiques et des protections admin/média, puis contrôle de l’analyseur réel sans enregistrer d’action de test.

## Points soumis à validation

La demande utilisateur conserve ses cinq groupes. Les adaptations proposées sont : rendu équivalent par transform/opacity au lieu des animations de tracé/découpage interdites par la règle globale ; navigation commune avec sauvegarde locale avant changement de route ; catalogue Replays issu des vidéos existantes ; sélection verticale limitée à une zone de geste pour préserver le scroll ; barre des critères et célébration sessionnelle respectant le modèle actuel ; interactions de précision de l’analyseur gardées immobiles.

## Sources techniques consultées

- [Motion — réduction du bundle, LazyMotion et fonctionnalités de gestes/layout](https://motion.dev/docs/react-reduce-bundle-size).
- [Motion — gestes de glisser](https://motion.dev/docs/react-drag).
- [Motion — useReducedMotion](https://motion.dev/docs/react-use-reduced-motion).
- [Next.js — layout persistant](https://nextjs.org/docs/app/api-reference/file-conventions/layout).

Ces documents orientent la proposition. Le score Lighthouse et la fluidité doivent être mesurés sur la réalisation ; ils ne sont pas établis par la documentation.
