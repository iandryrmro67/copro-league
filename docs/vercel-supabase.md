# Copro League sur Vercel et Supabase

Le site utilise Next.js, PostgreSQL Supabase et Supabase Auth. Les médias restent dans un bucket privé. L’ancien déploiement Sites fonctionne séparément tant que la migration n’est pas validée.

## Configuration

1. Créer un projet Supabase gratuit, région Europe. Désactiver l’exposition automatique des nouvelles tables et activer la RLS automatique.
2. Copier `.env.example` dans `.env.local` (ignoré par Git). Renseigner l’URL du projet, sa clé publishable, la clé serveur secret/service_role et la connexion PostgreSQL **transaction pooler** (port 6543). Encoder les caractères spéciaux du mot de passe dans DATABASE_URL. La connexion vérifie le certificat TLS ; ne pas désactiver cette vérification.
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

Le test HTTP sans compte vérifie notamment qu’un en-tête ChatGPT forgé ne donne aucun accès. Les tests PostgreSQL utilisent PGlite : transactions, conflits, sauvegardes brutes et import complet de la saison 2 par les vrais repositories. La connexion à une véritable instance Supabase et l’envoi d’un média doivent aussi être vérifiés après provisioning.

## Retour à la version précédente

Le snapshot GitHub initial est `d0465a40675afad5020a992015acc9b42c1bcd36`. Il correspond au site Sites v6. Restaurer cette version sur Sites ne migre pas une base PostgreSQL vers D1. Conserver les sauvegardes et l’ancien site tant que le transfert n’a pas été validé.
