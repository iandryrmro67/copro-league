# Audit du parcours de statistiques de match — 2 octobre 2026

## Périmètre et méthode

Objectif : comprendre le système actuel de statistiques détaillées et proposer un parcours plus rapide, plus fiable et plus facile à reprendre.

Sources examinées : administration, annotation, vidéo, modèle de match, projection des événements, validation, sauvegarde, rating et restitution. La version destinée à Vercel se trouve dans `work/vercel`, selon le document de déploiement. Son analyseur et son moteur de projection sont identiques à ceux du checkout racine.

Vérifications : navigation dans l'administration locale sur le port 5173 ; 36 tests existants exécutés avec succès dans `work/vercel` ; reproductions en mémoire de plusieurs cas limites. Aucun match ni résultat n'a été modifié ou enregistré. La production Vercel n'a pas été inspectée en direct : les constats portent sur les sources locales et l'interface locale.

Le fichier RTK.md référencé par les instructions n'a pas été trouvé dans le projet, ses répertoires parents examinés, Documents ou les skills locaux.

## Fonctionnement actuel

1. Renseigner le match, la saison, les équipes, la date, la durée et le lieu.
2. Sélectionner les participants.
3. Générer et ajuster le draft.
4. Saisir le résultat, le MVP et les statistiques individuelles. Trois niveaux filtrent les champs visibles.
5. Ouvrir « Vidéo & événements », choisir YouTube, un fichier partagé ou un fichier local.
6. Choisir un joueur, une action, son résultat, les joueurs impliqués et éventuellement les positions, tags et liens.
7. Valider chaque action dans le brouillon React. La projection recalcule immédiatement les familles de statistiques suivies.
8. Enregistrer le match entier. Le serveur valide, projette à nouveau les événements et sauvegarde les données avec contrôle de version.
9. Les lectures recalculent ratings, agrégats et classements. Les résultats influencent aussi ELO et récompenses.

Les événements portent un temps en secondes, une séquence, l'acteur, son équipe, un partenaire éventuel, un adversaire éventuel, un résultat, des tags, un lien vers une autre action et une scène. Les coordonnées sont orientées relativement à l'équipe du joueur.

## Points solides

- Catalogue de 13 actions adapté au five, résultats et implications pour les deux joueurs.
- Lecteur synchronisé, navigation temporelle, raccourcis et lecture locale sans upload.
- Édition, suppression et annulation des événements ; recalcul après correction.
- Gestion de l'historique sans inventer les positions ni les xG manquants.
- Secondary Assist calculée sur une chaîne explicite de deux passes réussies suivies d'un but, avec règles de rupture.
- Validation serveur et protection contre l'écrasement concurrent.
- Distinction entre valeurs absentes et zéros dans les agrégations, sous réserve du problème de couverture décrit ci-dessous.

## Constats prioritaires

### 1. L'annotation partielle devient une mesure complète

`lib/events.ts`, fonction `projectEvents`, remet à zéro chaque catégorie suivie pour tous les participants, puis recompte les événements présents. Dès que les buts sont suivis et que le match est terminé, le score est remplacé par leur somme.

Reproduction : match terminé à 8–6 avec totaux individuels cohérents ; annotation d'un seul but A ; projection obtenue à 1–0. Dans l'interface, une protection demande d'autoriser le remplacement lorsque certaines nouvelles catégories contiennent déjà des valeurs manuelles positives. Cette autorisation permet ensuite le remplacement ; elle ne prouve pas que toute la vidéo a été analysée. Le serveur ne dispose pas d'une notion de couverture.

Même problème avec les tirs, passes ou Secondary Assists : une catégorie activée devient un zéro pour les joueurs sans événement, y compris lorsque l'analyse est incomplète. Un premier tir non cadré suffit aussi à activer le suivi des buts par famille.

**Amélioration prioritaire :** conserver un score officiel indépendant ; distinguer données manuelles, observations provisoires et catégories entièrement analysées. Ne remplacer un total officiel qu'après validation de sa couverture. Comparer score officiel et buts annotés avant publication.

### 2. Une assist peut compter deux fois

Dans `lib/actions.ts`, un but avec passeur attribue une assist. Une passe portant le tag ASSIST attribue également une assist, sauf si le but référence explicitement cette passe.

Reproduction : passe A → B marquée décisive, puis but B avec passeur A ; sans `linkedEventId`, A reçoit 2 assists. Avec le lien, A reçoit 1 assist. Le lien est facultatif et doit être choisi manuellement.

**Amélioration :** proposer la passe précédente compatible à la création du tir ; confirmer le lien ; calculer l'assist depuis le but validé. Conserver une méthode explicite pour les données historiques ne disposant que d'une assist isolée.

### 3. Le contexte d'analyse se perd en changeant d'onglet

Vérifié dans le navigateur : « Vidéo & événements » → « Résultat & stats » → retour. L'identifiant de séquence est passé de `5996c9` à `710874` sans demander de nouvelle séquence.

L'analyseur conserve dans son état local la séquence, le fichier local, le contexte d'action et l'historique annuler/refaire. Le changement d'onglet démonte ce composant. Les événements déjà validés restent dans l'éditeur parent, mais le contexte de travail est réinitialisé. Au rechargement de la page, le brouillon du match n'a pas de mécanisme de récupération visible dans ces composants.

**Amélioration :** conserver la session d'analyse entre onglets ; sauvegarder automatiquement le brouillon avec son horodatage ; séparer « Sauvegarder mon travail » et « Publier les statistiques ». Reprendre au dernier temps vidéo avec la même séquence.

### 4. Les positions de scène peuvent donner une précision trompeuse

Les positions restent en place après validation. Une nouvelle action utilise la position conservée du joueur, ou celle du ballon s'il n'est pas placé. Il n'existe pas de confirmation que cette position correspond à la nouvelle action.

**Amélioration :** rendre la position de l'action explicitement observée ou inconnue. La scène reste une aide visuelle ; seules les positions confirmées alimentent les cartes et les statistiques de zones. Permettre un mode rapide sans placement de tous les joueurs.

### 5. Trop de décisions manuelles pour une chaîne simple

L'utilisateur doit choisir les acteurs successifs, le receveur, éventuellement le passeur du but, puis le lien vers l'action. Même une passe ratée exige un receveur connu. Les tags « passe clé » et « décisive » sont renseignés manuellement alors que l'événement suivant pourrait fournir l'information.

**Amélioration :** après une passe réussie, proposer son receveur comme prochain porteur. Lors du tir suivant, proposer la dernière passe compatible. Afficher la séquence sous une forme lisible « A → B → C », avec un bouton de rupture. Permettre un receveur inconnu sur une passe ratée. Les suggestions restent corrigeables.

### 6. Une perte liée à une passe ou un dribble nécessite une autre saisie

Reproduction : une passe FAILED produit une tentative et zéro réussite, mais aucune valeur de turnovers. Le modèle prévoit une action TURNOVER distincte. C'est une convention possible, mais elle impose un second événement lorsqu'une perte réelle a eu lieu.

**Amélioration :** définir la convention, puis proposer « possession perdue » sur les échecs qui la causent. Une passe ratée ne doit pas automatiquement être assimilée à une perte si le ballon reste à l'équipe. Éviter le double comptage avec une action TURNOVER liée.

### 7. Match terminé et analyse publiée partagent le même état

Les états actuels sont « à venir », « terminé » et « annulé ». Le niveau 1/2/3 décrit les champs disponibles, pas la complétude. Une analyse commencée sur un match terminé peut donc modifier des résultats déjà utilisés ailleurs.

**Amélioration :** garder l'état sportif du match, et ajouter un état d'analyse séparé : non commencée, en cours, à vérifier, validée. Un match peut avoir un résultat officiel publié et des statistiques détaillées encore provisoires.

### 8. Les notes comparent surtout des volumes bruts

`lib/performance.ts` compare les familles disponibles aux observations des matchs terminés, sans temps de jeu individuel ni couverture vidéo. Le modèle possède une durée du match, mais aucun intervalle de présence ni rôle de gardien. Le rating n'emploie pas les taux de réussite des passes ou des duels et sa référence peut évoluer lorsque de nouveaux matchs sont ajoutés.

**Amélioration ultérieure :** afficher la couverture utilisée par la note ; comparer des observations comparables ; ajouter temps de jeu et gardien seulement si ces informations sont réellement saisissables. Définir si les anciennes notes doivent rester figées ou évoluer avec le groupe.

### 9. La revue avant publication est limitée

Les contrôles serveur vérifient notamment les équipes, les champs, la compatibilité des liens et certains rapports numériques. Ils ne vérifient pas la complétude de l'analyse, l'ordre chronologique d'une passe liée à un but ou l'unicité de son usage. Les options de liaison ne sont pas restreintes aux passes précédentes de la même séquence.

**Amélioration :** écran de revue avec score officiel / buts annotés, catégories couvertes, actions à compléter, liens suspects et provenance des données. Les anomalies bloquantes doivent être distinguées des informations inconnues acceptables.

## Parcours proposé

**Préparer → Analyser → Vérifier → Publier.**

- Préparer : réutiliser la feuille actuelle pour les participants, équipes et informations du match.
- Analyser : vidéo, saisie rapide des actions, terrain facultatif, timeline et compteur provisoire visibles dans un même espace. Brouillon récupérable ; séquences conservées ; suggestions de liens.
- Vérifier : comparer le score officiel avec l'annotation ; indiquer quelles catégories et quelles portions de vidéo ont été observées ; corriger les liens.
- Publier : rendre les statistiques validées disponibles pour les profils et classements. Une correction ultérieure doit repasser par la vérification concernée.

Deux modes d'usage peuvent partager ce parcours : « actions principales » pour buts, tirs et faits marquants ; « analyse complète » pour les familles effectivement suivies sur toute la vidéo. Le nom du mode ne suffit pas à certifier la couverture.

## Ordre recommandé

1. **Fiabilité :** score officiel, couverture, provenance et dédoublonnage des actions liées.
2. **Continuité :** contexte conservé et récupération du brouillon ; sauvegarde distincte de la publication.
3. **Vitesse :** porteur suivant suggéré, liens proposés, receveur inconnu et position facultative.
4. **Revue :** tableau de contrôle avant publication et affichage public de la couverture.
5. **Enrichissement :** temps de jeu, rôles et évolution du rating, après stabilisation des observations.

Une simple refonte visuelle améliorerait le confort mais laisserait les problèmes de score et de couverture. La première tranche recommandée porte donc sur la fiabilité et la reprise du travail ; le moteur d'événements existant reste réutilisable.

## Critères d'acceptation de la première tranche

- Annoter un but d'un match officiel à 8–6 conserve le score officiel à 8–6 et affiche un décompte provisoire distinct.
- Une passe décisive et son but produisent une seule assist, avec un lien explicable.
- Changer d'onglet conserve la séquence et le contexte d'analyse.
- Une catégorie partiellement observée ne transforme pas les autres joueurs en zéros vérifiés.
- Un brouillon peut être récupéré après rechargement ; le mécanisme annonce clairement son état de sauvegarde.
- Publier les statistiques exige une revue de la couverture et des anomalies bloquantes.
- Les matchs historiques conservent leurs valeurs et leurs inconnues jusqu'à une correction explicite.

## Limites de cet audit

Les 36 tests passent sur le comportement actuel ; cela ne valide pas les améliorations proposées. Les reproductions de score, d'assist et de passe ratée ont été exécutées en mémoire, sans écriture en base. Aucun chronométrage d'une analyse complète, contrôle mobile supplémentaire, build ou test de production n'a été réalisé pour cet audit. Le principal irritant de l'utilisateur reste à préciser.
