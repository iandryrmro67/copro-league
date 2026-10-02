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
