# Copro League

Application de football à 5, en français, construite à partir du logo, du moodboard et de la palette fournis : noir #121619, blanc #FCFCFC, vert #44CF6C.

## Utiliser le site

L’aperçu local fonctionne sur http://localhost:5173. Cliquez sur **Connexion** pour ouvrir l’administration. En développement local, cette connexion est simulée ; sur le site hébergé, elle utilise le compte ChatGPT. Sur une nouvelle base privée, **Activer mon compte administrateur** initialise le premier administrateur. Faites cette initialisation avant tout élargissement des accès.

L’administration permet de gérer joueurs et photos, caractéristiques de draft, saisons et récompenses, matchs, participants, équipes, résultats, statistiques, vidéos et événements. Les champs vides représentent des données inconnues ; un zéro représente une mesure réelle. Les profils et classements sont générés automatiquement.

Pour préparer un match : créez-le, renseignez date/heure/lieu, choisissez les participants, générez puis validez les équipes, et enregistrez. Après le match, saisissez le score et les performances. Les corrections recalculent profils, classements, ELO, radars et facts.

## Saison 2

Le classeur **Five classement saison 2.xlsx** a été lu sans modification. L’import préparé contient 22 joueurs, 6 matchs, 271 buts et 184 passes décisives. Les 124 buts des timelines des trois premiers matchs sont conservés dans leur ordre d’origine. Mathis et Matisse sont fusionnés, conformément à la confirmation du propriétaire.

Dans une base vierge : **Admin → Importer la saison 2**. L’import est effectué dans l’aperçu local et sur le site en ligne. Le bouton refuse un deuxième import de cette saison. Les anciennes données DEMO sont exclues des lectures et ne peuvent plus être installées.

Les feuilles de matchs constituent la référence : les totaux de victoires du classeur sont incomplets et certaines formules de classement sont en erreur. Les matchs 7–10 vides et le match bonus incomplet ne sont pas importés. Dates, lieux, durée, MVP et données avancées restent inconnus. Le nouveau rating est calculé depuis les observations disponibles, avec explication des familles couvertes. Les couleurs d’équipe servent à distinguer les deux groupes ; elles ne prétendent pas restituer les couleurs historiques. L’ELO est reconstruit suivant les numéros de match, faute de dates.

Le rapport détaillé est dans `data/imports/saison-2-audit.json`. Le script `scripts/extract-season2.py` permet de reproduire l’extraction avec Python et openpyxl :

```sh
python3 scripts/extract-season2.py '/chemin/Five classement saison 2.xlsx'
```

Le classement par points spécifique à l’ancien classeur n’est pas repris : les classements disponibles portent sur les performances et les résultats recalculés.

## Architecture et données

React 19, TypeScript, routes compatibles Next via Vinext/Vite, Tailwind et composants accessibles Radix. Backend Worker Cloudflare ; base SQL D1 via Drizzle ; photos dans R2. Ce choix conserve un déploiement intégré sans serveur séparé.

`db/schema.ts` décrit joueurs, caractéristiques, saisons, matchs, équipes, participations, statistiques individuelles, événements, vidéos, récompenses et administrateurs. `MatchPlayerStats` reste la source centrale. `lib/engine.ts` calcule agrégats, pourcentages, ELO, duos, facts, records et radars à partir des matchs. L’historique ELO est recalculé plutôt que stocké en double. Les champs suivis par événements sont projetés dans les statistiques sans additionner une seconde saisie manuelle.

Les écritures vérifient l’identité, le rôle admin, l’origine, les données et la version modifiée. Une édition concurrente est refusée pour éviter d’écraser une correction. Les uploads contrôlent taille, format et signature du fichier. Le premier déploiement reste privé au propriétaire.

## Fonctionnalités

- Accueil, matchs, profils dynamiques, statistiques et historique des saisons.
- Administration depuis ordinateur ou téléphone, photos et archivage des joueurs.
- Draft équilibré avec verrous et déplacements, capitaines en serpent et pack à révéler.
- Calendriers Google, Outlook et fichier ICS utilisable avec Apple Calendar.
- Vidéos YouTube, analyse manuelle avec raccourcis, événements et timestamp du lecteur lorsqu’il est disponible.
- ELO collectif, radars normalisés avec seuils de données, records, duos, facts et récompenses de saison.
- Sauvegarde/restauration JSON et exports CSV lisibles dans Excel : joueurs, saisons, matchs, statistiques, caractéristiques, ELO.

## Limites explicites

Les champs xG/xA/xGOT et métadonnées de tirs sont prêts, mais aucun modèle prédictif ni analyse automatique de vidéo n’est activé. Les valeurs doivent provenir d’une observation ou d’un modèle externe identifié. L’analyse YouTube dépend de l’autorisation d’intégration de la vidéo et de la disponibilité de son API ; la saisie manuelle du temps reste disponible.

Les radars incomplets montrent les axes disponibles, sans inventer de notes. Les attributs absents utilisent une valeur neutre pour équilibrer le draft uniquement. Le moteur de facts possède une sélection par intérêt et seuils, mais ne constitue pas un modèle statistique de rareté entraîné.

L’import Excel fourni est spécifique à la structure de la saison 2. L’import générique accepte le format JSON de sauvegarde, pas tous les classeurs XLSX. Une restauration importe les enregistrements successivement : en cas d’échec, une partie peut avoir été enregistrée. Les sauvegardes JSON conservent les références des photos, pas les objets R2 ; sauvegardez R2 séparément pour une restauration complète sur un autre hébergement.

## Lancer le projet

Node.js 22.13 ou plus récent est requis (Node 22.18+ recommandé pour les tests TypeScript).

```sh
npm ci
npm run build
```

Sur une **nouvelle base locale uniquement**, appliquer dans l’ordre les cinq fichiers SQL de `drizzle/` :

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_young_lenny_balinger.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_green_norrin_radd.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_aspiring_annihilus.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_productive_tag.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_dear_blazing_skull.sql
npm run dev
```

Ne rejouez pas les migrations déjà appliquées. Les données locales résident dans `.wrangler/state` et ne sont pas incluses dans Git.

## Vérifier et déployer

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/engine.test.ts tests/season2.test.ts
npm run build
```

`node tests/journey.mjs` exerce le parcours API contre le serveur local et crée des données QA. `node tests/restore.mjs` vérifie une restauration de saison 2 avec versions et récompense. `tests/cleanup-local.sql` supprime uniquement les enregistrements QA de ces tests.

La configuration Sites existante est `.openai/hosting.json` : réutiliser son projet, pousser un commit source, enregistrer cette version puis publier en privé et vérifier le statut. Le déploiement applique les migrations de production ; les données de l’aperçu local ne sont pas transférées automatiquement. Initialiser ensuite l’administrateur et importer la saison 2 depuis le back-office. Aucun secret ne doit être inscrit dans Git.

Les détails du runtime, des bindings D1/R2 et de l’authentification de plateforme sont conservés dans `docs/runtime.md`. Le brief complet, le design et le plan de réalisation figurent dans `docs/`.

## Mise à jour du 17 septembre

Équipes renommables, événements éditables, passes et coordonnées, cartes de terrain, rating automatique avec override et poids admin, PlayStyles expliqués, carousel de facts et Awards avec votes authentifiés. Le Golden Boy nécessite des nominations définies par l’admin. Les résultats des votes restent cachés pendant leur ouverture. Les cartes exigent des positions réellement annotées : 3 tirs ou 5 autres actions. Les sauvegardes JSON historiques concernent la ligue ; les tables Awards et les associations de comptes doivent être sauvegardées avec D1.
