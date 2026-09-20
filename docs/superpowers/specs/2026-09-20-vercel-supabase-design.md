# Migration Vercel et Supabase

Le propriétaire autorise le choix de la base et de l’authentification. Conserver les fonctionnalités, les identifiants des joueurs, les statistiques inconnues et les palmarès figés. Le site Sites et son historique Git restent disponibles pendant la migration.

Utiliser Next.js natif sur Vercel, PostgreSQL Supabase côté serveur, Supabase Auth avec cookies SSR et Storage privé. Aucune confiance dans les anciens en-têtes ChatGPT. Seules les adresses confirmées de ADMIN_EMAILS ou MEMBER_EMAILS accèdent à la ligue ; ADMIN_EMAILS définit les administrateurs. Aucun premier visiteur ne peut se promouvoir. La création des comptes est administrée dans Supabase.

Conserver les requêtes métier derrière un petit adaptateur SQL paramétré : transactions atomiques et versions optimistes identiques à D1. Créer le schéma final PostgreSQL et désactiver l’accès direct des rôles anon/authenticated aux tables. Ne jamais exposer DATABASE_URL ou la clé de service au navigateur.

Les médias sont envoyés directement vers une URL signée Storage, puis validés côté serveur (taille, signature de fichier). Seuls les médias validés sont consultables via des URL de lecture signées et temporaires. Les fichiers ne traversent pas les fonctions Vercel, limitées en taille. Conserver les chemins /api/videos et /api/photos.

Fournir un import transactionnel de la sauvegarde brute D1, conservant les paramètres et les votes ; réinitialiser seulement les liens d’identité ChatGPT devenus invalides. L’import initial de la saison 2 reste disponible dans l’interface. Ne jamais écraser une base peuplée automatiquement.

Validation : tests PostgreSQL locaux, contrôle d’accès/retours de connexion, validation médias, tests métier existants, build Next et vérification HTTP sans session. Le déploiement réel requiert la connexion du propriétaire aux comptes Supabase et Vercel ainsi que leurs variables de production.
