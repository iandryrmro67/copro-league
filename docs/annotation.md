# Analyse des matchs

Le parcours est « Préparer → Analyser → Vérifier → Publier ». Le résultat sportif et l’état de l’analyse sont indépendants. Une annotation partielle conserve le score officiel et les statistiques déjà publiées.

## Préparer

Renseigner participants, équipes, durée réellement jouée, résultat et MVP. Les valeurs manuelles restent disponibles tant qu’une catégorie n’est pas validée depuis les événements. Vide signifie inconnu ; zéro signifie observé et absent. Le temps de jeu individuel et le rôle (champ, gardien, mixte) sont facultatifs et ne sont jamais déduits.

## Analyser

La référence visuelle actuelle est décrite dans `design-system-annotation.md`, à partir du fichier HTML fourni le 2 octobre 2026.

Choisir une vidéo ou saisir les temps manuellement. La saisie rapide fonctionne sans terrain. La scène garde les placements entre actions ; chaque position d’action doit être confirmée avant d’alimenter les cartes. Le décalage correspond au début du match dans la vidéo : temps du match = temps vidéo − décalage.

L’onglet « Annoter » présente une vidéo dominante et un panneau unique de saisie : temps, joueurs des deux équipes, puis actions. La timeline compacte occupe toute la largeur sous ces deux blocs ; les réglages vidéo viennent ensuite. Sélectionner le joueur, puis cliquer l’action. Les boutons enregistrent immédiatement un but, un tir cadré ou non cadré, une passe ratée, une récupération, une interception, une perte ou un dégagement pour le joueur observé. Le temps vient du lecteur, ou du champ manuel lorsqu’il est renseigné. Aucune position n’est déduite. « Autres actions » remplace les commandes rapides par la saisie détaillée ; choisir une action fige son temps pendant la saisie des détails. La validation revient automatiquement aux commandes rapides.

Activer « Passes en chaîne » pour enregistrer une passe réussie en cliquant sur son destinataire. Chaque passe transfère le porteur. Désactiver ce mode pour simplement sélectionner un joueur. But, récupération, interception, perte et dégagement ouvrent une nouvelle possession. Annuler et refaire rétablissent les observations et le porteur sans restaurer d’anciens scores officiels ou anciennes valeurs manuelles.

L’onglet « Revoir » regroupe les filtres, la liste des actions et la lecture des extraits. La timeline affiche deux pistes d’équipe, un curseur synchronisé et des zooms de 2, 5 et 10 minutes. Cliquer le fond pour se déplacer, ou une action pour la corriger. Les filtres équipe, joueur impliqué, type et recherche s’appliquent aux pistes, aux cartes et à « Lire la sélection ». Cette lecture enchaîne les extraits avec 4 secondes avant et 3 secondes après, fusionne les passages voisins et s’arrête à la fin. Les compteurs provisoires permettent aussi d’ouvrir les actions d’un joueur.

Après une passe réussie, son receveur devient le porteur proposé. Un tir propose la dernière passe compatible de la même séquence, antérieure au tir. Le bouton de rupture ouvre une nouvelle possession. Une passe ratée peut avoir un receveur inconnu. Le tag « possession perdue » incrémente une perte réelle ; une action TURNOVER liée à cette cause ne la recompte pas.

Le but attribue l’assist, et la passe liée au tir produit la passe clé. La Secondary Assist conserve la règle des deux dernières passes réussies avant un but assisté, dans une séquence continue. Les échecs, changements de possession, temps inconnus et ruptures empêchent ce crédit. Les actions historiques restent éditables sans conversion automatique.

L’éditeur reste monté entre les onglets. Le brouillon local sauvegarde actions, séquence, contexte et temps vidéo, avec reprise au retour. Il est associé au compte et au match. Un conflit de version conserve le brouillon téléchargeable et bloque l’écrasement. « Enregistrer le brouillon » persiste le travail sur le serveur et garde l’éditeur ouvert. Les fichiers vidéo locaux doivent être sélectionnés à nouveau après rechargement.

## Vérifier et publier

L’écran compare score officiel, buts annotés et contributions par joueur. Cocher uniquement les catégories suivies pour tous les joueurs sur tout le match, puis renseigner les périodes réellement observées. La couverture doit atteindre toute la durée. Les Secondary Assists et les catégories de zone disposent de validations séparées.

La publication exige un résultat terminé, une couverture complète et des liens cohérents. Si les buts sont publiés, leur total doit correspondre au score officiel. Une passe ne peut pas créer deux tirs liés. Les temps hors durée et liens hors séquence bloquent ; les positions absentes restent acceptables hors catégories de zone et sont exclues des cartes.

Seules les catégories cochées remplacent les valeurs manuelles. Retirer une catégorie précédemment publiée restaure son observation manuelle d’origine. Après une correction, les lecteurs gardent les derniers événements et compteurs validés jusqu’à la nouvelle publication. La couverture, la provenance et la date de validation sont visibles dans la restitution.

## Modèle et compatibilité

Les événements résident toujours dans `match_events`. Leurs métadonnées v2 contiennent sequenceId, outcome, tags, opponentPlayerId, linkedEventId, position, endPosition, scene et videoTimestamp. Les coordonnées enregistrées sont relatives au sens d’attaque de l’équipe ; celles de la scène restent dans le repère A→B. Aucune position ni aucun xG n’est inventé.

La colonne nullable `matches.analysis` conserve session, baseline manuelle et dernier instantané publié. Appliquer `202610020001_match_analysis.sql` avant de déployer le nouveau serveur. Les lectures publiques suppriment session, baseline et événements provisoires. Les exports administrateur conservent les brouillons. Les statistiques historiques sans état d’analyse suivent leur fonctionnement existant.

Le rating reste dynamique. Les volumes sont ramenés à 60 minutes lorsque le temps de jeu est confirmé ; les temps inconnus sont comparés entre eux. Les rôles sont comparés séparément, avec au moins trois observations disponibles par métrique. Les taux de réussite demandent au moins cinq tentatives. Une présence nulle ne produit pas de note automatique. Les données manquantes ne sont pas transformées en zéro et les xG restent manuels avec provenance.

## Vérification du 2 octobre 2026

Les tests Node/PostgreSQL PGlite couvrent projection, publication, lectures publiques, corrections, versions, sauvegardes, historique saison 2, liens, ratings, saisie directe et lecture des extraits. Parcours navigateur sur des fixtures locales sans écriture en base : passes→but, annuler/refaire, correction, filtres, temps figé, lecture des sélections et largeur 390 px sans débordement de page. Le banc reproductible est décrit dans `tests/browser/annotation-preview/README.md`. Le déploiement et la migration de production restent distincts de cette vérification locale.
