# Analyse des matchs

Le parcours est « Préparer → Analyser → Vérifier → Publier ». Le résultat sportif et l’état de l’analyse sont indépendants. Une annotation partielle conserve le score officiel et les statistiques déjà publiées.

## Préparer

Renseigner participants, équipes, durée réellement jouée, résultat et MVP. Les valeurs manuelles restent disponibles tant qu’une catégorie n’est pas validée depuis les événements. Vide signifie inconnu ; zéro signifie observé et absent. Le temps de jeu individuel et le rôle (champ, gardien, mixte) sont facultatifs et ne sont jamais déduits.

## Analyser

La référence visuelle actuelle est décrite dans `design-system-annotation.md`, à partir du fichier HTML fourni le 2 octobre 2026.

La disposition suit un seul parcours précis : vidéo, joueur ciblé, palette complète d’actions, questions propres à l’action, puis timeline. Le lecteur se masque avec « Masquer la vidéo / annoter sans vidéo ». Sans source ou si le lecteur échoue, un bandeau compact remplace l’écran. Le temps est alors manuel, également pour une vidéo regardée dans un autre onglet YouTube. La source et le décalage vidéo restent dans les réglages secondaires. Le décalage correspond au début du match dans la vidéo : temps du match = temps vidéo − décalage.

Sélectionner le joueur, puis l’action. Ce premier clic fige le temps. S’il était en lecture, le lecteur se met en pause puis reprend après enregistrement. Les passes réussies demandent le destinataire. Les passes ratées demandent directement l’intercepteur adverse, avec « Aucun / intercepteur non identifié » si le ballon sort ou si le joueur est inconnu. Les tirs demandent but / cadré / non cadré / bloqué / montant, puis le passeur pour un but, le gardien pour un tir cadré arrêté ou le défenseur pour un tir bloqué. Dribbles, duels, tacles et fautes demandent le résultat et l’adversaire ; les fautes peuvent être commises ou subies par le joueur ciblé. Arrêts, interceptions et blocages proposent le joueur adverse ou « non identifié ». Récupération, dégagement et perte proposent leurs causes propres, sans menu de réussite artificiel.

Le dernier choix nécessaire enregistre l’action dans le brouillon. Le joueur ciblé reste sélectionné. Le résumé permet d’annuler ou de modifier / préciser. Il n’existe plus de parcours rapide ni de passes en chaîne. Les touches sont accessibles dans la palette complète. Les positions restent facultatives, par clic sur le terrain de correction ou avec deux coordonnées réellement observées. Une coordonnée seule ne crée aucun point.

La timeline affiche toujours sa liste lisible, les filtres (équipe, joueur impliqué, action et recherche), les extraits et la correction. Les actions proches sont regroupées dans les pistes pour éviter les superpositions ; agrandir un groupe ou cliquer une ligne permet de retrouver une observation. Les zooms incluent 30 secondes, 2, 5 et 10 minutes. La lecture enchaîne les extraits avec 4 secondes avant et 3 secondes après, fusionne les passages voisins et s’arrête à la fin. La liste démarre par les actions récentes ; un bouton rétablit l’ordre chronologique.

Une correction garde l’identifiant et les précisions de l’observation ; elle demande « Enregistrer la correction ». Les actions historiques conservent leur modèle et leurs temps inconnus tant qu’on ne choisit pas une nouvelle action. Annuler et refaire conservent les scores officiels et les valeurs manuelles. Le joueur ciblé ne change pas après une passe réussie : sélectionner son partenaire pour noter l’action suivante si nécessaire.

Un but demande explicitement son passeur ou « Sans passe décisive ». Un tir peut être lié à la dernière passe compatible de la même possession. Les buts, pertes, fautes, arrêts, récupérations, interceptions et dégagements terminent la possession ; un bouton secondaire permet aussi de démarrer une nouvelle possession. Le tag « possession perdue » incrémente une perte réelle ; une action TURNOVER liée à cette cause ne la recompte pas. Un blocage et son tir bloqué partageant le même temps et les mêmes joueurs explicitement identifiés sont liés pour compter un seul blocage.

Le but attribue l’assist, et la passe liée au tir produit la passe clé. La Secondary Assist conserve la règle des deux dernières passes réussies avant un but assisté, dans une séquence continue. Les échecs, changements de possession, temps inconnus et ruptures empêchent ce crédit. Les actions historiques restent éditables sans conversion automatique.

L’éditeur reste monté entre les onglets. Le brouillon local sauvegarde actions, séquence, contexte et temps vidéo, avec reprise au retour. Il est associé au compte et au match. Un conflit de version conserve le brouillon téléchargeable et bloque l’écrasement. « Enregistrer le brouillon » persiste le travail sur le serveur et garde l’éditeur ouvert. Les fichiers vidéo locaux doivent être sélectionnés à nouveau après rechargement.

## Vérifier et publier

Le contrôle du temps propose des boutons −/+ 1 seconde, 5 secondes, 30 secondes et 1 minute, un curseur à la seconde et deux champs minutes/secondes. Un ajustement fixe le temps de l’action et déplace aussi le lecteur lorsqu’il est disponible. « Suivre la vidéo » réactive le suivi hors saisie en cours. La timeline suit également les ajustements sans vidéo. Les temps historiques inconnus restent inconnus tant qu’aucun réglage explicite n’est effectué.

L’écran compare score officiel, buts annotés et contributions par joueur. Cocher uniquement les catégories suivies pour tous les joueurs sur tout le match, puis renseigner les périodes réellement observées. La couverture doit atteindre toute la durée. Les Secondary Assists et les catégories de zone disposent de validations séparées.

La publication exige un résultat terminé, une couverture complète et des liens cohérents. Si les buts sont publiés, leur total doit correspondre au score officiel. Une passe ne peut pas créer deux tirs liés. Les temps hors durée et liens hors séquence bloquent ; les positions absentes restent acceptables hors catégories de zone et sont exclues des cartes.

Seules les catégories cochées remplacent les valeurs manuelles. Retirer une catégorie précédemment publiée restaure son observation manuelle d’origine. Après une correction, les lecteurs gardent les derniers événements et compteurs validés jusqu’à la nouvelle publication. La couverture, la provenance et la date de validation sont visibles dans la restitution.

## Modèle et compatibilité

Les événements résident toujours dans `match_events`. Leurs métadonnées v2 contiennent sequenceId, outcome, tags, opponentPlayerId, linkedEventId, position, endPosition, scene et videoTimestamp. Les coordonnées enregistrées sont relatives au sens d’attaque de l’équipe ; celles de la scène restent dans le repère A→B. Aucune position ni aucun xG n’est inventé.

La colonne nullable `matches.analysis` conserve session, baseline manuelle et dernier instantané publié. Appliquer `202610020001_match_analysis.sql` avant de déployer le nouveau serveur. Les lectures publiques suppriment session, baseline et événements provisoires. Les exports administrateur conservent les brouillons. Les statistiques historiques sans état d’analyse suivent leur fonctionnement existant.

Le rating reste dynamique. Les volumes sont ramenés à 60 minutes lorsque le temps de jeu est confirmé ; les temps inconnus sont comparés entre eux. Les rôles sont comparés séparément, avec au moins trois observations disponibles par métrique. Les taux de réussite demandent au moins cinq tentatives. Une présence nulle ne produit pas de note automatique. Les données manquantes ne sont pas transformées en zéro et les xG restent manuels avec provenance.

## Vérification du 2 octobre 2026

Les tests Node/PostgreSQL PGlite couvrent projection, publication, lectures publiques, corrections, versions, sauvegardes, historique saison 2, liens, ratings, saisie directe et lecture des extraits. Parcours navigateur sur des fixtures locales sans écriture en base : passes→but, annuler/refaire, correction, filtres, temps figé, lecture des sélections et largeur 390 px sans débordement de page. Le banc reproductible est décrit dans `tests/browser/annotation-preview/README.md`. Le déploiement et la migration de production restent distincts de cette vérification locale.


## Attributions aux deux joueurs — 5 octobre 2026

Les nouvelles saisies attribuent les effets observés aux deux joueurs sans ajouter une seconde ligne : passe ratée → interception/récupération de l’adversaire choisi ; tir cadré arrêté → arrêt du gardien ; dépossession → récupération adverse. En saisissant l’action défensive, le passeur d’une interception reçoit une passe ratée, le tireur d’un arrêt un tir cadré, celui d’un blocage un tir bloqué, et l’adversaire d’une récupération sur erreur une perte. Sans joueur identifié, aucun crédit adverse n’est inventé. Un dribble raté n’implique pas automatiquement un tacle.

Le marqueur `metadata.counterpartStats` réserve ces effets aux nouvelles saisies et corrections explicites. Les observations anciennes ne sont pas réinterprétées au chargement. Les observations réciproques portant le même temps connu et les mêmes joueurs ne doublent pas le crédit : la ligne défensive conserve son compteur. Une ambiguïté entre plusieurs observations n’est pas fusionnée automatiquement. Aucun emplacement de récupération n’est déduit de la position du passeur ; la validation des récupérations hautes demande l’observation défensive et sa position réelle.

Les compteurs de défense apparaissent dans « Statistiques des actions saisies ». Leurs filtres retrouvent aussi une passe ou un tir qui a crédité le défenseur. Changer l’adversaire en correction déplace les crédits tout en gardant l’identifiant de l’événement et la publication antérieure jusqu’à la prochaine validation.
