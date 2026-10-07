# Copro League sur Vercel et Supabase

Le site utilise Next.js, PostgreSQL Supabase et Supabase Auth. Les médias restent dans un bucket privé. L’ancien déploiement Sites fonctionne séparément tant que la migration n’est pas validée.

## Configuration

1. Créer un projet Supabase gratuit, région Europe. Désactiver l’exposition automatique des nouvelles tables et activer la RLS automatique.
2. Copier `.env.example` dans `.env.local` (ignoré par Git). Renseigner l’URL du projet, sa clé publishable, la clé serveur secret/service_role et la connexion PostgreSQL **transaction pooler** (port 6543). Encoder les caractères spéciaux du mot de passe dans DATABASE_URL. La connexion vérifie le certificat TLS avec l’autorité Supabase officielle intégrée dans `lib/server/postgres-options.ts` ; ne pas désactiver cette vérification.
3. Exécuter `npm run db:migrate`. Les migrations sont transactionnelles, suivies dans `copro_migrations`, et ne sont pas rejouées. Elles créent les tables, révoquent l’accès direct des navigateurs et créent le bucket privé `league-media`.
4. Dans Supabase Authentication, créer les utilisateurs autorisés avec une adresse confirmée et leur propre mot de passe. Désactiver les inscriptions publiques. `ADMIN_EMAILS` contient les administrateurs ; `MEMBER_EMAILS` contient les lecteurs autorisés, séparés par des virgules. Aucun utilisateur ne devient administrateur simplement en étant le premier à se connecter. Les anciennes identités ChatGPT ne sont pas des identités Supabase.
5. Dans Vercel, importer `iandryrmro67/copro-league`, sélectionner la branche de migration, framework Next.js, et renseigner les mêmes variables. Les clés serveur ne doivent jamais porter le préfixe `NEXT_PUBLIC_`.
6. Vérifier la connexion du propriétaire, la saison 2, l’édition d’un match et une vidéo privée sur l’URL réelle avant de remplacer l’ancien lien du site.

## Données et historique

La base distante n’est jamais initialisée ni écrasée au build. Pour une base neuve, le bouton « Importer ma saison 2 » dans Admin importe le classeur (22 joueurs, 6 matchs). Ce fichier ne contient pas les modifications faites après l’import original.

Pour migrer l’historique complet, exporter les tables brutes de la base **réellement utilisée** dans le format `copro-raw-v1`, puis lancer `npm run db:import -- /chemin/backup.json`. Un export SQLite local peut être produit avec :

```sh
python3 scripts/export-local-d1.py /chemin/source.sqlite /chemin/prive/backup.json
```

Ne pas utiliser automatiquement une base locale comme source du site publié : les modifications peuvent différer. Le script d’import refuse une destination déjà peuplée et annule toute la transaction au premier échec. Il conserve réglages, versions, événements, votes et palmarès. Il ne transfère pas les administrateurs ChatGPT et remet les identifiants de comptes de vote à NULL ; leur adresse vérifiée sera reliée au nouveau compte à sa prochaine connexion.

Le JSON exporté par l’interface (`/api/export`) reste importable par l’interface Admin pour les joueurs, saisons, matchs et palmarès. Pour conserver également les votes et réglages historiques, utiliser la sauvegarde brute décrite ci-dessus.

Les fichiers R2 ne sont pas inclus dans un export SQL/JSON. Ils doivent être sauvegardés et copiés séparément avec `npm run media:import -- /chemin/medias` ; conserver les noms d’origine, photos à la racine et vidéos dans `videos/`. Une copie ne remplace jamais un fichier distant existant et n’active la lecture qu’après validation. Le script affiche les fichiers échoués et peut être relancé. Les fichiers dépassant 50 Mo nécessitent un forfait de stockage adapté ou une réimportation compressée ; l’ancien stockage doit rester disponible jusqu’à validation de tous les médias.

## Vidéos et limites

Les envois vont directement du navigateur à Supabase via une URL signée non réinscriptible. Le serveur vérifie le propriétaire du ticket, la taille et la signature du contenu avant d’activer la lecture. Les URL de lecture sont valables une heure et uniquement émises pour un membre connecté. Un utilisateur disposant déjà d’une URL signée peut la lire jusqu’à expiration.

L’offre gratuite Supabase limite chaque fichier à 50 Mo ; les photos à 5 Mo. La lecture locale de vidéos reste sans limite imposée. Les vidéos YouTube privées ou limitées par âge restent soumises aux restrictions YouTube.

## Vérification

```sh
npm ci
npm test
npm run build
npm start
node tests/access-http.mjs
```

Le test HTTP sans compte vérifie notamment que les invités peuvent consulter les pages et les statistiques, et qu’un en-tête ChatGPT forgé ne donne aucun droit de modification. Les tests PostgreSQL utilisent PGlite : transactions, conflits, sauvegardes brutes et import complet de la saison 2 par les vrais repositories. La connexion à une véritable instance Supabase et l’envoi d’un média doivent aussi être vérifiés après provisioning.

## Retour à la version précédente

Le snapshot GitHub initial est `d0465a40675afad5020a992015acc9b42c1bcd36`. Il correspond au site Sites v6. Restaurer cette version sur Sites ne migre pas une base PostgreSQL vers D1. Conserver les sauvegardes et l’ancien site tant que le transfert n’a pas été validé.

## Vérification réelle du 20 septembre 2026

Projet Supabase `cifxjpybkszppxtmsuap`, région eu-west-1. Les deux migrations ont été appliquées. Les 22 joueurs, 6 matchs, 60 participations et 124 événements ont été copiés depuis le site Sites publié, dont la version 3 du match 6. Aucun média R2 référencé ne nécessitait de copie. Le test `tests/supabase-live.mjs` a vérifié la connexion réelle, le rôle administrateur, les données, les badges, le refus de lecture directe anonyme et un cycle complet de photo signée (avec nettoyage).

Déploiement Vercel validé le 21 septembre 2026 : https://copro-league.vercel.app, version applicative `254cc78f66743d784b0ded80ce9e8b769c0ae113`. Les 13 contrôles HTTP sans session et le parcours Supabase complet ont aussi réussi sur cette URL. Le déploiement est piloté par la CLI ; la connexion GitHub automatique reste non activée.

La consultation publique inclut les joueurs, matchs, statistiques, awards et photos. `/admin`, les écritures, les exports et les vidéos privées restent protégés. Le bucket et les tables Supabase ne sont pas rendus publics : les lectures passent par les routes serveur.

## Mise à jour de l’analyse des matchs — 2 octobre 2026

Avant de déployer cette version, exécuter `npm run db:migrate` avec la connexion de l’environnement cible pour ajouter la colonne nullable `matches.analysis`. La migration `202610020001_match_analysis.sql` ne réécrit aucun match existant. Déployer ensuite le serveur et vérifier l’enregistrement d’un brouillon, sa publication et sa lecture publique. Le build ne lance pas les migrations. Le parcours est documenté dans `docs/annotation.md`.

## Déploiement de l’interface d’analyse — 2 octobre 2026

Premier déploiement de l’atelier : `dpl_HtczwhJvdEaZNhX76HZM59T61J6X` (https://copro-league-25n2m9osu-yurr2.vercel.app). L’interface approuvée est intégrée dans Admin → Match → Analyser, sans le panneau arrondi qui entourait auparavant le composant.

La migration `202610020001_match_analysis.sql` a été appliquée au projet Supabase existant. Une sauvegarde privée antérieure est conservée dans `.vercel/backups/pre-analysis-20261002.json` (ignorée par Git et le déploiement). Les 7 lignes de matchs historiques sont identiques à la sauvegarde, hormis l’ajout nullable de la colonne analysis. Les 23 joueurs et les 7 matchs restent accessibles.

Vérifications : 106 tests Node/PGlite réussis ; compilation et TypeScript réussis sur Vercel ; contrôles HTTP publics et refus des écritures anonymes réussis avant et après la bascule ; interface présente dans les fichiers JavaScript/CSS publiés ; trois polices identiques aux fichiers locaux (SHA-256). Les parcours d’annotation, de correction et de relecture ont été vérifiés localement. Les fichiers du banc fictif, les sauvegardes et les secrets sont exclus du déploiement.

Contrôle complémentaire le 2 octobre : le domaine principal servait de nouveau l’ancien déploiement `dpl_46Dp9WvovW2Gr9HEhNGzRdCNPhDQ`. La cause de cette bascule n’est pas établie. Le déploiement validé `dpl_HtczwhJvdEaZNhX76HZM59T61J6X` a été promu à nouveau. La résolution du domaine, les fichiers publiés et les contrôles HTTP ont été revérifiés. Une session administrateur réelle a confirmé les nouveaux onglets et l’atelier Analyser en mode agrandi sur `/admin?match=s2-match-6`, avec les joueurs à droite et la timeline en dessous. Aucun événement ni résultat du match n’a été enregistré pendant cette vérification.

Retour à la version précédente : promouvoir `https://copro-league-g9kdu7916-yurr2.vercel.app` (`dpl_46Dp9WvovW2Gr9HEhNGzRdCNPhDQ`). La colonne additive peut rester en place pour ce retour ; ne pas restaurer une sauvegarde de données par simple rollback du site.

## Version réunissant le design global et la timeline — 2 octobre 2026

Version active : https://copro-league.vercel.app, déploiement `dpl_6atzX3KCMcdhwTpG8ysBgdfiTpnh` (https://copro-league-bemecu8ww-yurr2.vercel.app), code `82fc8e031f995e68685ead5506d616a76f12d999` sur la branche GitHub `codex/vercel-supabase`.

Le design global du commit `6074806` était dans un checkout distinct ; la version précédente de l’atelier utilisait encore l’ancien habillage global. Le commit `a1591d3` rassemble le design fourni et le workflow d’analyse. `82fc8e0` aligne également la récupération des brouillons et la validation sur les mêmes variables. Les prochaines publications depuis ce checkout incluent les deux interfaces. La publication reste pilotée par la CLI, sans déploiement Git automatique.

Vérifications : 106 tests fonctionnels réussis sur le code réuni, compilation locale réussie, compilation et TypeScript du dernier déploiement réussis sur Vercel, contrôles HTTP d’accès réussis sur la version finale. L’accueil, l’administration, la timeline et Vérifier & publier ont été consultés avec une session réelle. Les trois polices publiées correspondent aux fichiers locaux ; l’atelier et le site utilisent Archivo, Big Shoulders Display et JetBrains Mono. Le banc mobile/tablette confirme l’absence de débordement à 390 et 768 px et la timeline placée après la saisie. Aucun résultat ni événement de match n’a été enregistré pour ces contrôles.

Un onglet déjà ouvert a conservé sa feuille de style précédente après un rechargement simple ; un nouvel onglet sur l’URL officielle a confirmé la version finale, notamment les angles droits du bandeau de récupération. Utiliser un rechargement forcé si l’ancien habillage reste visible.

## Saisie précise et hiérarchie verticale — 2 octobre 2026

Version active : https://copro-league.vercel.app, déploiement `dpl_FASCC2eANhcjVzdKmn33aSuej6WC` (https://copro-league-qnk1kk3ge-yurr2.vercel.app), code `e58f191` sur `codex/vercel-supabase`.

Le parcours suit vidéo → joueur ciblé → treize actions → questions propres à l’action → timeline et liste. Le lecteur peut se masquer et se replie en cas d’erreur ; sans source, le temps est manuel. La création s’enregistre au dernier choix utile, avec annulation ; les corrections restent explicites. Les brouillons antérieurs, précisions d’observation et temps historiques inconnus sont conservés. Les nouveaux champs de session sont facultatifs dans le JSON existant : aucune migration supplémentaire n’est nécessaire. Le design global et l’atelier partagent toujours les mêmes tokens et polices.

Vérifications : 124 tests fonctionnels réussis, dont 18 nouveaux tests de saisie précise ; compilation locale et compilation / TypeScript Vercel réussies ; revue du code sans problème matériel restant ; contrôles HTTP d’accès réussis après promotion. Parcours local sur les composants réels : temps figé, pause / reprise, faute subie, correction sans duplication, annuler / refaire, reprise de saisie, coordonnées incomplètes, lecteur illisible et absence de vidéo. Banc mobile / tablette contrôlé à 390 et 768 px.

Un nouvel onglet authentifié a confirmé les treize actions, le bandeau compact sans vidéo et l’ordre vertical sur `/admin?match=s2-match-6`. Le score officiel 26–24, les événements et valeurs manuelles du match n’ont pas été enregistrés ni modifiés pendant ce contrôle ; le brouillon local existant reste présent. Preuve locale ignorée par Git : `outputs/production-precise-timeline.png`.

Retour à l’interface précédente sans restaurer la base : promouvoir `https://copro-league-bemecu8ww-yurr2.vercel.app` (`dpl_6atzX3KCMcdhwTpG8ysBgdfiTpnh`). Le domaine principal a été inspecté après promotion ; sa version Ready correspond à `dpl_FASCC2eANhcjVzdKmn33aSuej6WC`.


## Animations intégrées — 4 octobre 2026

Version active : https://copro-league.vercel.app, code applicatif `f88b188b7f246a75f76c0c82db700e78d1dd277c` sur GitHub `codex/vercel-supabase`. Candidat promu : https://copro-league-18xc8liok-yurr2.vercel.app, id `dpl_8KmWKGQaoxLYaPzoMentB5yKrtEV`.

BootScreen, carousels joueurs/draft, GameMenu, badges/déblocages et interactions Hover/curseur/son sont intégrés au design KUSH/HUD. La démo `/dev/animations` est autonome avec données fictives. L’administration garde vidéo → saisie précise → timeline et ses treize familles d’actions ; l’ouverture du menu conserve le joueur ciblé et le brouillon.

136 tests réussis ; builds production local et Vercel / TypeScript réussis ; contrôles HTTP d’accès réussis après promotion ; revue indépendante corrigée. Trois audits Lighthouse mobiles de la build finale sur la démo : médiane 94/100 en performance, 100/100 en accessibilité, CLS initial environ 0.000631. Contrôles de viewport à 390/768 px, sans débordement. Le lint hérité conserve des erreurs préexistantes ; les nouveaux fichiers d’animation ont zéro erreur. Détails et limites : `docs/superpowers/reports/2026-10-04-game-animations.md`.

L’inspection du domaine officiel, son `/api/version` sans cache partagé et les métadonnées d’un onglet neuf correspondent au SHA applicatif ci-dessus. Le commit documentaire ultérieur n’exige pas de redéployer. Le déploiement Git automatique depuis l’ancienne branche `main` reste désactivé. Aucun match ni événement n’a été enregistré pendant les contrôles ; aucune migration supplémentaire.

Retour à la version avant animations : promouvoir https://copro-league-qnk1kk3ge-yurr2.vercel.app (`dpl_FASCC2eANhcjVzdKmn33aSuej6WC`), sans restaurer la base. La version animée immédiatement précédente est https://copro-league-l1wyd1hse-yurr2.vercel.app (`dpl_8ue9LsuL5Njb5vR9uPqQFc39Qh3Y`). Preuve locale : `outputs/production-game-menu.png`.


## Cartes joueurs — 5 octobre 2026

Version active : https://copro-league.vercel.app, source applicative `91776a54df19da5389188babaaa37e3ba56ce0af` sur GitHub `codex/vercel-supabase`. Candidat promu : https://copro-league-lx5aacdad-yurr2.vercel.app, id `dpl_1rjGUpWLaCj3BnjzEQHrwuPBtEWK`.

Le conteneur HoverTile avait remplacé le lien comme élément de grille, laissant `.playercard` en inline. Les bordures se fragmentaient et dépassaient les blocs. Une règle ciblée rétablit display block et height 100% sur les cartes de la grille, en conservant leurs liens et effets de survol. Aucun changement de données, de navigation ou de timeline.

Vérifications : reproduction publiée avant correction (lien inline, bordure commençant 21 px avant son parent) ; build locale, build et TypeScript Vercel réussis ; 136 tests réussis ; CUA local à 1280, 390 et 768 px, recherche Clovis fonctionnelle. Les 23 cartes ont une seule boîte de lien, de même hauteur et position que leur conteneur. Le contrôle CUA publié à 1280 px confirme cette géométrie et l’absence de débordement. Inspection canonique, SHA API no-store et métadonnées de page correspondent à la source ci-dessus ; tests HTTP publics/protégés réussis après promotion. Capture locale : `outputs/production-player-spacing.png`.

Retour avant ce correctif : promouvoir https://copro-league-18xc8liok-yurr2.vercel.app (`dpl_8KmWKGQaoxLYaPzoMentB5yKrtEV`, `f88b188`), sans restauration de base. Le commit documentaire ultérieur ne modifie pas l’application déployée.

## Saison d’accueil, draft et temps d’analyse — 5 octobre 2026

Version publiée : https://copro-league.vercel.app, source `89cc2b7246894b0757931d093ad0c8a3fc32d142` sur GitHub `codex/vercel-supabase`. Déploiement promu : https://copro-league-97phdbv2s-yurr2.vercel.app (`dpl_7f92YTTEYbd5Kyvz14rMARPiogx2`).

L’accueil prend toujours la dernière saison réelle par date de début, puis nom et identifiant en ordre numérique en cas d’égalité. Son contenu, y compris les replays, suit cette saison ; le choix historique reste disponible sur les autres pages. Une draft validée efface équipes, sélection, capitaines, verrous et révélation dans l’interface, en conservant les affectations enregistrées sur la feuille de match. Un échec conserve le tirage. Le tirage libre se termine avec un bouton dédié. Le temps d’annotation dispose de boutons ±5/30/60 secondes, d’un curseur et de champs minutes/secondes ; la timeline suit les ajustements manuels.

Vérifications : 142 tests Node/PGlite réussis ; build et TypeScript locaux et Vercel réussis ; parcours CUA sans vidéo, correction sans doublon, passage de minute, curseur et mobile 390 px ; drafts équilibrée/capitaines/pack, tirage libre, changement de match et sauvegarde simulée réussie/refusée. Aucun match réel n’a été modifié. Après promotion, contrôles HTTP publics/protégés réussis, accueil Saison 3 confirmé, contrôle du temps visible dans l’atelier publié. Inspection canonique, `/api/version` et métadonnée `copro-version` correspondent au SHA ci-dessus. Capture : `outputs/production-quick-match-time.png`.

La première commande sans espace explicite a retourné « Not authorized » ; la publication avec `--scope yurr2` a réussi. Conserver cet argument pour déployer, inspecter et promouvoir. La connexion GitHub automatique reste inchangée. Retour arrière : promouvoir https://copro-league-lx5aacdad-yurr2.vercel.app (`dpl_1rjGUpWLaCj3BnjzEQHrwuPBtEWK`), sans restauration de base. Aucune migration n’est nécessaire. Le commit documentaire suivant ne change pas l’application publiée.

## Attributions adverses et réglage à la seconde — 5 octobre 2026

Version publiée : https://copro-league.vercel.app, source `65bd1f853d62cb908b45c6a5bcb845ce851efa32` sur GitHub `codex/vercel-supabase`. Déploiement promu : https://copro-league-ikdoa1pzb-yurr2.vercel.app (`dpl_9Ab9nTSmGQJtfDnEb8QJHn8JXj9t`). Le candidat intermédiaire `acbd079` n’a pas été promu sur le domaine canonique.

La passe ratée propose l’intercepteur ; le tir cadré arrêté propose le gardien ; la dépossession propose le récupérateur. Les crédits réciproques, leur compatibilité historique et leur déduplication sont décrits dans `docs/annotation.md`. Les compteurs défensifs et les filtres retrouvent l’action qui a attribué les statistiques. Les boutons ±1 seconde complètent les raccourcis ; les huit boutons occupent deux rangées. Le tableau défensif peut défiler sur mobile sans élargir la page.

Vérifications : 150 tests Node/PGlite réussis, dont crédits réciproques, valeurs nulles/zéro, corrections, publication différée, filtres et correspondances ambiguës. Compilation locale puis compilation et TypeScript Vercel réussis. Lint ciblé : aucune erreur, un avertissement préexistant sur une image. Parcours CUA sur fixture : passe ratée/intercepteur, transfert Alex→Paul sans doublon, inconnu, gardien, dépossession, filtres de statistiques et ±1 s. À 390 px, huit boutons de 65,5×44 px et aucun débordement avec les compteurs ouverts. Aucun événement réel enregistré pendant les essais.

Après promotion : contrôles HTTP publics/protégés réussis, `/api/version`, métadonnée `copro-version` et inspection canonique concordent. Les huit boutons ont été vérifiés dans l’atelier public. Captures locales : `outputs/interception-choice-preview.png` et `outputs/production-counterpart-time.png`. Aucune migration. Retour arrière : promouvoir https://copro-league-97phdbv2s-yurr2.vercel.app (`dpl_7f92YTTEYbd5Kyvz14rMARPiogx2`) avec `--scope yurr2`, sans restauration de base. Le commit documentaire suivant ne modifie pas l’application publiée.


## Vidéo locale et saisie optimisée — 6 octobre 2026

Version publiée : https://copro-league.vercel.app, source `c0f9f0655c7383dbd524c6f566c0fa66d3192994` sur GitHub `codex/vercel-supabase`. Déploiement promu : https://copro-league-eufbhhgpr-yurr2.vercel.app (`dpl_2bww79fre6YWZ9Kpjvx1VdbnVyKL`). Le candidat intermédiaire `0e018aa` n’a pas été promu sur le domaine canonique.

Le fichier local se choisit au-dessus du lecteur et se lit sans transfert, compression ni limite de taille applicative ; le stockage distant garde sa limite de 50 Mo. Il faut sélectionner le fichier à nouveau après rechargement. Le temps et le joueur restent accessibles dans une barre fixe, avec seulement ±1 s ; vidéo et saisie sont côte à côte sur ordinateur. Les palettes se replient pendant les questions. Une passe réussie sélectionne son receveur. La chaîne d’équipe enregistre une passe par clic sur le receveur sans pause ni défilement automatique ; « Passe ratée » ouvre les intercepteurs. Les précisions de passe et de tir arrivent avant enregistrement. Les CSC créditent le score adverse et une statistique distincte, sans tir ni assist.

Vérifications : 155 tests Node/PGlite réussis ; build et TypeScript locaux puis Vercel réussis ; lint des composants et fonctions concernés sans erreur, avec un avertissement image préexistant. Les six erreurs `any` du schéma de validation sont identiques à celles de la version précédente ; le lint global n’est pas déclaré propre. Parcours CUA local : MP4 synthétique de 2 h / 385 424 384 octets (376 391 Kio), metadata `duration=7200`, `readyState=4` ; tags immédiats, receveur ciblé, trois passes en chaîne, vidéo toujours en lecture pendant la chaîne, échec, tir avec précision et CSC. À 390 px, temps accessible pendant les questions et aucune extension de largeur de page. Le fichier synthétique valide taille et durée, pas tous les codecs d’une vidéo réelle.

Après promotion : contrôles HTTP publics/protégés réussis ; inspection canonique, `/api/version` no-store et métadonnée `copro-version` concordent avec le SHA ci-dessus. Atelier publié vérifié : choix local, barre ±1 s, chaîne des deux équipes, CSC et disposition en colonnes. Aucun événement réel ajouté ou enregistré pendant ces vérifications. Captures : `outputs/fast-circulation-preview.png` et `outputs/production-fast-annotation.png`. Aucune migration nécessaire. Retour arrière : promouvoir https://copro-league-ikdoa1pzb-yurr2.vercel.app (`dpl_9Ab9nTSmGQJtfDnEb8QJHn8JXj9t`) avec `--scope yurr2`, sans restauration de base. Le commit documentaire suivant ne modifie pas l’application publiée.


## Lecteur vidéo agrandi — 6 octobre 2026

Version publiée : https://copro-league.vercel.app, source `b2c82dade0feb865df7a7d8b6999589bdb091682` sur GitHub `codex/vercel-supabase`. Déploiement promu : https://copro-league-an3nvakgn-yurr2.vercel.app (`dpl_1bipc5MTaSKsbe9g5qexc9pMurYm`).

Quand une vidéo est visible, le lecteur reçoit la plus grande colonne. Le mode théâtre utilise toute la largeur ; le plein écran natif garde curseur, lecture/pause, ±1 s et vitesse. Le curseur vidéo parcourt la durée réelle et reste distinct du temps figé de l’observation. Le sélecteur de vitesse possède un fond, une bordure et un texte contrastés. La limite de hauteur inline a été retirée en annotation pour permettre les grandes vues. Un refus du plein écran affiche un message et laisse le mode théâtre disponible.

Vérifications : 155 tests Node/PGlite réussis ; lint des deux composants modifiés sans erreur ni avertissement ; compilation et TypeScript locaux puis Vercel réussis. CUA sur fixture : image normale ~698 px de large, théâtre pleine largeur, plein écran avec image de 749 px de haut et commandes visibles ; entrée et sortie du plein écran ; vitesses 0,5× / 1,5× / 2× confirmées via `playbackRate` ; navigation Home / End ; vidéo à 00:30 pendant une passe dont le temps reste figé à 00:01. À 390 px, vitesse et commandes visibles sans débordement de page. Le fichier synthétique de 2 h / 376 391 Kio expose une durée de 7200 s et le curseur atteint 7200 s. Capture : `outputs/video-controls-fullscreen.png`. Aucun événement réel enregistré.

Après promotion : inspection canonique et `/api/version` no-store confirment le SHA ci-dessus ; contrôles HTTP publics/protégés réussis. Aucune migration. Retour arrière : promouvoir https://copro-league-eufbhhgpr-yurr2.vercel.app (`dpl_2bww79fre6YWZ9Kpjvx1VdbnVyKL`) avec `--scope yurr2`. Le commit documentaire suivant ne change pas l’application déployée.


## Atelier complet en plein écran et saisie directe — 6 octobre 2026

Version publiée : https://copro-league.vercel.app, source applicative `b01ac5725ecf332b27a41d73dd1d7cefecbeff76` sur GitHub `codex/vercel-supabase`. Déploiement promu : https://copro-league-divw9q06y-yurr2.vercel.app (`dpl_7cau3pWHHRwwQUSwKTQkt5W4B3xa`).

Le bouton plein écran agrandit tout l’atelier, avec vidéo, temps, saisie, correction, timeline et sauvegarde. Le navigateur intégré peut quitter le plein écran natif au clic dans les formulaires : la vue pleine fenêtre reste alors active jusqu’au bouton de sortie. Les précisions de passe clé, passe décisive et perte de possession sont disponibles pendant la saisie pertinente. Une passe ratée retire et désactive le tag passe décisive. Sol/aérien sont exclusifs. Toute nouvelle action sélectionne ensuite le deuxième joueur explicitement renseigné (coéquipier ou adversaire), sinon garde le joueur actuel. Une correction démarre sur le dernier joueur ciblé ; si l’auteur change, les associations et positions doivent être renseignées à nouveau, avec avertissement, avant la sauvegarde explicite.

Vérifications : 157 tests Node/PGlite réussis ; compilation et TypeScript locaux puis Vercel réussis ; lint ciblé sans erreur, avec un avertissement image préexistant. CUA sur match fictif : passe clé directe, correction Mathis → Loris proposée sans mutation avant sauvegarde, même événement corrigé sans doublon, passe ratée puis Alex ciblé automatiquement, saisie conservée dans la vue agrandie et sortie explicite. Vidéo synthétique de 30 s chargée après rechargement ; vue mobile 390 px sans débordement de l’atelier. Capture : `outputs/fullscreen-analysis-key-pass.png` (match fictif). Aucun événement réel ajouté ou enregistré.

Après promotion : inspection canonique et API version no-store correspondent au SHA et au déploiement ci-dessus ; contrôles HTTP publics/protégés réussis. Atelier admin publié chargé en lecture, métadonnée `copro-version` confirmée. Aucune migration. Le CLI Vercel 62.5.0 a refusé le déploiement (« Not authorized ») malgré les commandes lecture et la bonne équipe ; le CLI 50.13.2 a déployé puis promu avec succès, sans changer les accès. Retour arrière : promouvoir https://copro-league-an3nvakgn-yurr2.vercel.app (`dpl_1bipc5MTaSKsbe9g5qexc9pMurYm`) avec `--scope yurr2`. Le commit documentaire suivant ne change pas l’application publiée.


## Publication avec positions facultatives — 7 octobre 2026

Version publiée : https://copro-league.vercel.app, source applicative `300a8a17ffeb1ab25c0fa24ca8f8ca89f75640e3` sur GitHub `codex/vercel-supabase`. Déploiement promu : https://copro-league-2jcd8unub-yurr2.vercel.app (`dpl_9pSBgCtidPJ9EuVUprNWAcew9tNi`).

Les positions inconnues et les passes marquées décisives sans but associé ne bloquent plus la publication. La liste de remarques facultatives est regroupée par message. Une catégorie de zone dont les positions pertinentes sont incomplètes reste exclue des clés validées ; ses valeurs manuelles originales sont conservées ou restent nulles. Les autres catégories et tous les événements sont publiés normalement. Les liens structurellement incohérents, les périodes incomplètes et l’écart au score officiel pour la catégorie buts gardent leurs contrôles. Les onglets ne mélangent plus numérotation et phases ; les textes de publication et libellés de passes sont harmonisés en français.

Vérifications : 161 tests Node/PGlite réussis, avec reproduction des blocages avant correction ; tests des positions absentes, catégorie de zone antérieure remplacée, valeurs manuelles conservées, passe décisive non liée, zone complète et interception défensive positionnée. Compilation et TypeScript locaux et Vercel réussis. Lint des fonctions et composants de publication concernés sans erreur ; les 5 erreurs et 6 avertissements préexistants du composant admin sont inchangés (mêmes règles et emplacements). Le lint global n’est pas déclaré propre.

CUA sur fixture locale : 61 événements, 30 récupérations non positionnées et 30 interceptions automatiques, toutes les catégories cochées. Publication explicite réussie, 61 actions conservées, 30 interceptions et 30 récupérations défensives, `highRecoveries=null` et clé exclue des catégories publiées. Les messages répétés sont réduits à trois remarques facultatives. Capture : `outputs/publication-optional-positions.png` (match fictif). Aucun match réel ni brouillon utilisateur modifié.

Après promotion : inspection canonique, `/api/version` no-store et métadonnée `copro-version` confirment le SHA ci-dessus ; contrôles HTTP publics/protégés réussis. Aucune migration. Retour arrière : promouvoir https://copro-league-divw9q06y-yurr2.vercel.app (`dpl_7cau3pWHHRwwQUSwKTQkt5W4B3xa`) avec `--scope yurr2`. Le commit documentaire suivant ne modifie pas l’application publiée.


## Corrections fiables, filtres et position immédiate — 7 octobre 2026

Version publiée : https://copro-league.vercel.app, source applicative `5cc82914bac778e61e4b1c63944f99fc9c5175c3` sur GitHub `codex/vercel-supabase`. Déploiement promu : https://copro-league-rhqobeqkl-yurr2.vercel.app (`dpl_5CzLJBYCFMCJ4GtHevdiU4rfv9ab`).

Un clic sur le joueur ciblé ou le bouton de désélection efface la sélection. Ouvrir une correction recharge les données de cet événement, sans reprendre le joueur de la saisie précédente. Une correction ancienne restée ouverte avec le mauvais auteur est reprise depuis l’événement enregistré, avec message explicite ; les changements d’auteur volontaires de cette version restent conservés après rechargement grâce au marqueur de session. Aucun événement existant n’est modifié au chargement. Après création ou correction, seuls passes, duels, tacles, récupérations et interceptions gardent une sélection suivant le porteur ou le gagnant ; les autres actions la vident.

La position est disponible pendant la saisie. Une option attend le clic sur le terrain ou le choix de conserver la position inconnue avant d’enregistrer. Les coordonnées au clavier sont facultatives et repliées. Le guide des critères décrit chaque action et les doubles comptes à éviter. La timeline combine équipe, joueur, rôle, action, recherche, résultat, précision, présence d’assist, position et période. Le raccourci « Buts sans passe décisive » exclut les CSC.

La sauvegarde d’un brouillon d’analyse ne compare plus l’ancienne feuille manuelle au score officiel. La publication des buts vérifie les événements, CSC inclus. Le contrôle des matchs manuels reste actif et additionne les CSC adverses ; un vrai score incohérent est toujours rejeté.

Les animations reconnaissent les souris des appareils tactiles. Le réglage Animations propose « Selon l’appareil », « Activées » et « Réduites », mémorisés localement. Le mode automatique respecte l’accessibilité du système ; seule une activation explicite la remplace. Le curseur natif reste utilisé sur les champs, vidéos, fenêtres modales et l’atelier de précision. Aucun test natif Windows n’a été réalisé depuis le Mac ; les règles de préférence et de curseur sont testées.

Vérifications : 167 tests Node/PGlite réussis, dont publication avec CSC, ancien total manuel différent, vraie incohérence de score, reprise d’une ancienne correction et conservation d’un changement explicite. Compilation et TypeScript locaux puis Vercel réussis. Lint ciblé sans nouvelle erreur, avec avertissement image existant ; les deux erreurs any et trois avertissements du repository correspondent à la version précédente. Le lint global n’est pas déclaré propre.

CUA sur matchs fictifs : désélection, clic sur le terrain avant enregistrement, receveur automatiquement ciblé, correction indépendante du joueur précédent, but corrigé puis sélection vide, filtres combinés, guide, publication 2–0 avec un but normal et un CSC, reprise de Mathis → Loris à 00:30 malgré une session ancienne ciblant Alex à 00:40. Modes Animations activées/réduites et conservation après rechargement vérifiés sur la page publique locale. À 390 px, atelier et page sans débordement ; terrain visible pendant la saisie. Capture : `outputs/timeline-combined-filters.png` (match fictif). Aucun match réel ou brouillon utilisateur modifié.

Après promotion : inspection canonique, `/api/version` no-store et métadonnée de page confirment le SHA et le déploiement ci-dessus ; contrôles HTTP publics/protégés réussis. Aucune migration de base. Retour arrière : promouvoir https://copro-league-2jcd8unub-yurr2.vercel.app (`dpl_9pSBgCtidPJ9EuVUprNWAcew9tNi`) avec `--scope yurr2`. Le commit documentaire suivant ne modifie pas l’application publiée.

## Refonte des pages publiques de match — 7 octobre 2026

Version applicative publiée : `e1f404a75b2d8a11f588e7325b931b487e954af2` (refonte principale `c4aa60c`, gestion des temps inconnus `e1f404a`). Déploiement `dpl_BtNiNuKNL1EVVHb7BazcDG9qS3Sf`, candidat `https://copro-league-6ktj9v7t8-yurr2.vercel.app`, promu sur `https://copro-league.vercel.app` après build Ready et contrôle authentifié de `/api/version`.

Trois onglets Match / Joueurs / Actions. Le contexte de saison suit le match. Résultat et MVP désigné précèdent la frise des buts, le momentum des tirs observés par cinq minutes, les meilleurs joueurs par équipe, les statistiques complètes, les heatmaps séparées et un résumé factuel. Composition et performances sont réunies en deux colonnes triées par note publiée ; couleurs et décimales des notes sont standardisées. Les buts sont l’affichage initial des actions ; leur score intermédiaire est calculé avant filtrage, CSC attribués à l’adversaire. Filtres équipe / joueur impliqué / type / buts sans passe décisive ou CSC ; séquences contiguës dépliables, chargées par lots de 40, détails montés seulement à l’ouverture. Aucun lecteur ni commande de relecture en l’absence de vidéo.

Le match de référence est cohérent sans modifier les données : 24 buts + 2 CSC adverses = 26, 14 + 1 = 15. La table sépare score officiel, buts hors CSC, CSC adverses et CSC commis. Les buts encaissés ne sont pas additionnés entre joueurs. Les valeurs inconnues restent inconnues ; les totaux partiels sont marqués. Les actions sans temps ne produisent ni score intermédiaire supposé, ni frise/momentum vides ; les positions non renseignées ne sont pas inventées. La densité des heatmaps est normalisée par équipe et explicitement légendée.

Vérifications : 176 tests Node/PGlite réussis ; build et TypeScript locaux et Vercel réussis ; lint des nouveaux composants/helpers/tests propre. Les erreurs de liens et avertissements historiques de `components/league.tsx` n’ont pas été introduits par cette refonte (baseline 17 erreurs / 12 avertissements, après extraction 15 / 11). Le lint global n’est pas déclaré propre. Parcours CUA sur les données publiques réelles : 41 buts jusqu’à 26–15, trois CSC, filtrage des cinq buts de l’équipe A sans passe décisive, 1 564 actions conservées et 40 séquences initiales sans détails montés, ouverture d’une séquence, joueurs séparés et triés, valeurs inconnues, ancien match sans horaires et match sans timeline. Layout local à 360 et 390 px ; layout publié à 390 px, header 64 px, onglets fixes, aucun débordement horizontal. Captures locales ignorées : `outputs/match-refonte-production.png`, `outputs/match-refonte-mobile-production.png`.

Après promotion, les contrôles HTTP publics/protégés passent ; inspection canonique, API de version, métadonnée HTML et interface rendue correspondent au déploiement ci-dessus. Aucun match réel, événement, statistique, MVP ou brouillon n’a été modifié durant ces vérifications.

Retour arrière disponible : `https://copro-league-rhqobeqkl-yurr2.vercel.app`, déploiement `dpl_5CzLJBYCFMCJ4GtHevdiU4rfv9ab`, version applicative `5cc82914bac778e61e4b1c63944f99fc9c5175c3`. Le candidat intermédiaire `c4aa60c` n’a pas été promu sur le domaine canonique.

## Notes de match v2 — 7 octobre 2026

Version applicative publiée : `5f495d03370fc1beb5e8995a77b950ce6dc39ac8` sur GitHub `codex/vercel-supabase`. Déploiement `dpl_3basqNuoZqyPaNAdQkhP34J9674x`, candidat `https://copro-league-35q3nuzdv-yurr2.vercel.app`, promu sur `https://copro-league.vercel.app` après compilation et contrôle authentifié du candidat.

Poids validés par l’utilisateur : finition 20 %, création 20 %, passes 15 %, progression 15 %, défense 15 %, duels 10 %, arrêts 5 %, sans bonus de victoire. La référence est limitée au même match. Petits échantillons modérés, efficacité utilisée lorsqu’elle est observée, valeurs inconnues exclues, doublons défensifs retirés seulement avec provenance prouvée. Les notes partielles et les explications sont visibles. Les formules et leur calibration initiale sont documentées dans `docs/rating-v2.md`. L’ancien moteur reste sélectionnable dans Administration → Réglages & données → Barème des notes.

Vérifications : 197 tests Node/PGlite réussis, dont 21 dédiés à V2, retour au moteur ancien puis réactivation, priorité des corrections manuelles et stabilité publique pendant une correction vidéo. TypeScript et compilation locaux puis Vercel réussis. Revue indépendante et corrections des petits échantillons, du passage de quatre à cinq tentatives et de la provenance des récupérations. Lint des nouveaux fichiers propre ; aucune erreur supplémentaire dans les fichiers existants comparés à leur version antérieure. Le lint global n’est pas déclaré propre.

Le candidat conserve les 23 joueurs, 9 matchs, 80 participations, statistiques brutes et corrections manuelles de la lecture publique précédente : comparaison automatique complète après retrait des seuls champs calculés de notation. 70 notes calculables, dont 60 partielles. Aucun match, événement, brouillon ou réglage réel n’a été enregistré pendant les contrôles. Aucune migration de base.

Après promotion : version API avec `no-store`, métadonnée HTML et notes publiques identiques au candidat vérifié. Contrôles HTTP publics et refus des écritures anonymes réussis. Parcours CUA authentifié sur un match historique : notes partielles, explication V2, même match comme référence, aucun bonus de victoire ; aucune erreur console. Affichage à 390 px sans débordement horizontal. Capture locale ignorée : `outputs/rating-v2-production.jpg`.

Retour arrière de déploiement : promouvoir `https://copro-league-6ktj9v7t8-yurr2.vercel.app` (`dpl_BtNiNuKNL1EVVHb7BazcDG9qS3Sf`) avec `--scope yurr2`. Le commit documentaire suivant ne change pas l’application publiée.

## Réécriture des textes — 7 octobre 2026

Version applicative publiée : `93def0a6d745d8e91639aff6369a78f7080d4ff5` sur `codex/vercel-supabase`. Déploiement `dpl_GmfxtjLzUa1HXE7fvGUr5cfGbCwn`, candidat `https://copro-league-pvjkfq9v2-yurr2.vercel.app`, promu sur `https://copro-league.vercel.app`. L’API de version et la métadonnée de page affichent `93def0a`.

Réécriture validée par l’utilisateur : ton sportif et direct, tutoiement, vocabulaire jeune conservé, humour ponctuel sans private jokes. Pages publiques, admin, annotation, publication des stats, vidéo, erreurs, glossaire, badges et awards harmonisés. Les écrans propres à la version Vercel ont été adaptés en conservant les règles V2 et la limite vidéo de 50 Mo. Les descriptions actuelles des awards sont affichées même pour les saisons figées, sans changer les données du palmarès. Référence éditoriale : `docs/copywriting.md`.

Vérifications : 197 tests réussis, TypeScript et compilation locaux puis Vercel réussis. Assertions de texte existantes actualisées. Contrôles HTTP publics/protégés réussis après promotion. Version API, titre et métadonnée HTML vérifiés. Comparaison des données avant/candidat/après : 23 joueurs et 9 matchs identiques, y compris statistiques et notes calculées ; seuls les textes d’explication du rating ont été exclus de la comparaison avant/candidat. Aucun enregistrement de match, joueur, brouillon ou réglage ; aucune migration.

Retour arrière sans restauration de base : promouvoir `https://copro-league-35q3nuzdv-yurr2.vercel.app` (`dpl_3basqNuoZqyPaNAdQkhP34J9674x`) avec `--scope yurr2`. Le commit documentaire suivant ne modifie pas l’application publiée.

## Timeline et positions finales — 7 octobre 2026

Source applicative publiée : 6bc8e50d52c3382d9669141de9fd1f4c0dbcb0a1,
branche codex/vercel-supabase. Déploiement dpl_3rnDG1QRh2vpEQ9qeeUxCxHJCUGW,
candidat https://copro-league-7o522dqyn-yurr2.vercel.app, promu sur
https://copro-league.vercel.app après vérification de sa version et comparaison
exacte des joueurs, saisons, matchs, statistiques, notes et réglages publics.

Types de passe obligatoires, joueurs triés par équipe, issues rapides, position
observée en dernière étape de chaque nouvelle action, arrivée de passe facultative,
Golazo décoratif, CSC, sortie de pression, pressing distinct du récupérateur et
second ballon. Guide de déduction et contacts estimés séparés des touches exactes.
Les observations révisées portent captureRevision=3 ; les anciens événements
conservent leur interprétation. Aucune migration SQL ni écriture de données
réelles pendant les vérifications.

206 tests réussis (9 nouveaux), TypeScript et build locaux puis Vercel réussis.
Lint ciblé : aucune erreur, avertissement image préexistant. Essais CUA sur fixture
temporaire : passe avec type, aucune écriture avant position, position inconnue,
chaîne et assist déduite, but positionné, récupération après pressing, CSC,
interception et sortie de pression. À 390 px : aucune extension de largeur.
Fixture retirée avant la compilation finale ; capture locale ignorée
outputs/timeline-position-final.jpg.

Après promotion : tests HTTP publics et protection admin/écritures/exports/vidéos
réussis ; version API no-store et métadonnée HTML concordantes ; 23 joueurs et
9 matchs, données et notes identiques à la version précédente. Page d’accueil
vérifiée dans la session navigateur existante, sans erreur console.

Retour arrière sans restaurer la base : promouvoir
https://copro-league-pvjkfq9v2-yurr2.vercel.app
(dpl_GmfxtjLzUa1HXE7fvGUr5cfGbCwn) avec --scope yurr2.
Ce commit documentaire ne modifie pas la version applicative publiée.

## Draft avec profils hybrides — 7 octobre 2026

Version applicative 91b87b2, déploiement dpl_5nUNo64M6SK9SXJtBdR5SXoxqhgo,
https://copro-league-jieelx08u-yurr2.vercel.app, promu sur
https://copro-league.vercel.app. Algorithmes et limites : draft-v2.md.

217 tests réussis, TypeScript et compilations locale/Vercel réussis. Contrôles
d’interface : verrouillages, pack impair 4 contre 5, validation, choix serpent
des capitaines et affichage mobile. Fixture temporaire retirée avant publication.
Après promotion : version API no-store, routes publiques, protections des écritures,
admin et export vérifiées. Réponse publique de la ligue identique au relevé avant
publication. Draft équilibrée exécutée dans le navigateur en production sans
erreur console ; aucune sauvegarde de match réel. Capture ignorée :
outputs/draft-v2-production.png.

Retour arrière sans modification de la base : promouvoir
https://copro-league-7o522dqyn-yurr2.vercel.app
(dpl_3rnDG1QRh2vpEQ9qeeUxCxHJCUGW) avec --scope yurr2.
Ce commit documentaire ne modifie pas la version applicative publiée.

## Correction pack 5 contre 5 et échange après tirage

Version 0b3cc67, déploiement dpl_HyGBZeDuNZoCjKCjZ7vtX1iyrjHf,
https://copro-league-c8drof1fr-yurr2.vercel.app, promu sur l’adresse canonique.
Pack : dix participants obligatoires, tirage par permutation sans équilibrage
selon les notes, cinq joueurs par équipe. Échange après révélation entre deux
adversaires ; conservation du format 5/5 et validation complète obligatoire.

217 tests, TypeScript, compilation locale et Vercel réussis. Lint ciblé sans
erreur (avertissement image existant). Vérifications CUA : neuf participants
refusés, dix cartes en 5/5, échange réussi en local puis en production, aucune
erreur console. Capture ignorée outputs/pack-five-swap-production.png. Aucun
match réel sauvegardé. Routes, version API/HTML et protections contrôlées.
Réponses publiques des données avant correction, candidat et production identiques.

Timeline : comparaison de tous les fichiers hors draft et documentation avec
6bc8e50 strictement identique. Capture révisée, types de passe obligatoires,
position finale, second ballon et sortie de pression conservés ; marqueurs
également vérifiés dans les fichiers JavaScript de la production corrigée.

Retour arrière applicatif sans changer la base : promouvoir
https://copro-league-jieelx08u-yurr2.vercel.app avec --scope yurr2.
Ce commit documentaire ne modifie pas la version applicative publiée.
