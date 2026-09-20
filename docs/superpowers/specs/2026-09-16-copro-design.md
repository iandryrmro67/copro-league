# Copro League — conception
Référence contractuelle : ../../brief.txt. Les trois fichiers visuels fournis ont été inspectés : palette #121619 / #FCFCFC / #44CF6C, logo SVG vectoriel, moodboard contrasté monochrome, découpes diagonales. Pas de postes ni de rang global. Logo original conservé. Surfaces charbon, traits fins, rayons 4–12px, chiffres denses, titres condensés, accent vert limité, commandes mobiles 44px.

Architecture : React / TypeScript, conventions Next App Router via Vinext, Tailwind, API serveur Workers, base SQL D1 et photos R2 pour une application déployable sans compte Supabase supplémentaire. Authentification ChatGPT gérée par la plateforme, autorisations administrateur contrôlées côté serveur. Première version privée au propriétaire ; attribution initiale à l'identité du propriétaire dans ce périmètre privé, puis table admins. Aucun secret client.

Routes : /, /matchs, /matchs/:id, /joueurs, /joueurs/:id, /stats, /draft, /saisons, /saisons/:id, /glossaire, /admin. Une interface centrale d'édition responsive ; profils et saisons dynamiques.

SQL : players, player_attributes, seasons, matches, teams, match_players, match_player_stats, match_events, videos, season_awards, player_awards, admins, settings. MatchPlayerStats contient les valeurs brutes nullables. Événements : un champ de statistique passe en mode événement après confirmation ; champs non suivis restent null. Les agrégats lisent uniquement les performances et les résultats validés. ELO rejoué chronologiquement, jamais saisi ni dupliqué ; historique calculé. Ratios = sommes réussies / sommes tentées. Radars = percentiles par match avec minimum de données. Duos = coéquipiers et événements reliés. Une correction entraîne une nouvelle lecture de tous les agrégats sans cache persistant.

MVP : auth, CRUD, participants, résultats, statistiques, saisons, profils, classements, draft, calendrier et vidéos. Extension : ELO, radars, records, duos, récompenses, timeline et annotation. xG/xA/xGOT : nullable avec provenance, sans modèle inventé. Analyse vidéo manuelle uniquement.

Démonstration : jeu de données fictives marqué DEMO, initialisation explicite administrateur, séparé des données réelles par saison ; aucune photo de personne réelle présentée comme joueur fictif.
