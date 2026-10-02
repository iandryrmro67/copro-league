# Référence visuelle de l’analyse vidéo

Depuis le 2 octobre 2026, la référence de cet écran est le fichier fourni par le propriétaire : `Coproleague — Design System.html`. Ses planches internes sont titrées « KUSH/HUD » ; ces noms d’exemple ne sont pas repris dans le produit. Cette référence remplace la palette et les choix typographiques de la conception du 16 septembre pour cet écran.

- Fond Void `#0A0C0A`, surfaces Carbon `#121512`, relief Graphite `#1C211C`, filets Line `#2A322A`.
- Texte Bone `#E9ECE6`, texte secondaire Ash `#8E978C`.
- Accent `#56B947`, survol `#8BE36B`, sélection teintée `#12290F`.
- Big Shoulders Display pour les titres et scores, JetBrains Mono pour les données et commandes, Archivo pour les noms et explications.
- Angles droits, bordures de 1 px, espacements sur une grille de 8 px. Le vert indique les actions et sélections, sans code couleur par statistique.

Les trois fichiers WOFF2 sont extraits des ressources incorporées au document fourni, servis localement dans `public/fonts` avec leurs licences. Le site et l’atelier partagent les mêmes variables de palette et de typographie définies dans `app/design-system.css`. La disposition propre à l’analyse reste limitée à `.sequence-workspace`.

La hiérarchie est identique sur ordinateur et mobile : vidéo → joueur ciblé → grande palette complète → questions adaptées à l’action → timeline et liste → réglages secondaires. Il n’existe plus de séparation rapide / détaillée ni de mode passes en chaîne. Les treize familles d’action restent visibles ; le joueur ciblé reste sélectionné après l’enregistrement.

Le lecteur peut être masqué. Sans source ou en cas d’erreur, un bandeau compact permet la saisie du temps manuellement. Le lecteur reste monté quand il est masqué. Au clic sur une action, le temps est figé ; si la vidéo jouait, elle se met en pause puis reprend après le dernier choix nécessaire. Les corrections demandent une sauvegarde explicite. Le résumé propose annuler et modifier / préciser.

La timeline expose toujours ses filtres et ses lignes lisibles, avec temps, résultat, joueurs impliqués et commandes de correction / extrait. Les événements proches sont regroupés dans les pistes et peuvent être agrandis ; la liste conserve chaque événement. Les réglages vidéo, possessions, raccourcis et compteurs sont repliés sous la liste.

Validation locale : le banc `tests/browser/annotation-preview` monte les composants réels avec un match fictif. Vérifier saisie guidée, temps figé, reprise de lecture, annuler / refaire, correction, reprise des brouillons, fichier illisible, absence de vidéo et absence de débordement à 390 / 768 px. La vidéo de test ne réalise aucune détection.
