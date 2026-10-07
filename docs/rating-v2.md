# Notes de match — barème v2.0

Version du 7 octobre 2026. Le périmètre de cette livraison est le moteur des notes,
ses explications et son activation. Le dashboard élargi et le Collective Score du
document de référence ne font pas partie de cette modification.

## Poids validés

Finition 20 %, création 20 %, passes / maîtrise 15 %, progression 15 %, défense
15 %, duels 10 %, arrêts 5 %. Aucun bonus de résultat ni de MVP ; les postes ne
changent ni les poids ni la population de référence. Les gardiens tournent.

Le calcul utilise exclusivement les joueurs du même match. Les volumes sont les
actions du match, sans extrapolation automatique à 60 minutes. Un joueur avec un
temps confirmé de zéro est exclu du calcul et de la référence. Un temps inconnu
reste inconnu ; il ne vaut pas zéro. L'ELO, les victoires et le palmarès figé
restent séparés de ce moteur.

## Formules initiales, centralisées dans `lib/rating-v2.ts`

Les poids viennent du document fourni. Les coefficients internes ci-dessous sont
une première calibration explicite, pas la formule de FotMob ni une validation
statistique de l'équité. Ils pourront évoluer après revue de performances connues.

Une métrique doit être renseignée pour le joueur et au moins trois participants
éligibles du match. Lorsqu'un domaine combine des métriques, ses observations
de référence doivent couvrir le même ensemble de métriques que le joueur ; une
composante absente chez un autre joueur ne devient pas zéro.

### Volumes

- Finition : buts ; à défaut de buts connus, tirs cadrés.
- Création : assists + 0,5 × secondary assists + 0,25 × occasions supplémentaires.
  Les occasions sont le maximum des passes clés et occasions créées, auxquelles
  on retire les assists connues pour éviter un bonus supplémentaire pour la même
  passe décisive. Les catégories inconnues sont exclues de cette comparaison.
- Passes : passes réussies.
- Progression : dribbles réussis. Aucune passe cassant une ligne n'est inventée.
- Défense : tacles + interceptions + récupérations + blocs + dégagements.
  Les récupérations créditées par la même action annotée qu'un tacle ou une
  interception sont retirées du proxy de notation seulement. La provenance des deux catégories doit être la timeline publiée/suivie : un
  total manuel n’est pas corrigé sur la base d’une simple annotation. Les événements
  publiés sont utilisés pendant une correction vidéo. Les totaux bruts sont conservés. Les doublons impossibles à prouver dans des totaux manuels ne
  sont pas reconstruits artificiellement.
- Duels : duels gagnés, sans addition des duels aériens déjà inclus.
- Arrêts : arrêts observés.

Pour chaque volume, référence = moyenne des observations comparables du match.
Indice = (volume − référence) / max(1, référence), borné entre −1 et +2.
Si la référence vaut zéro, l'indice est neutre. Les indices de volume négatifs
sont multipliés par 0,25 : l'absence d'une action est une preuve moins forte d'un
mauvais match qu'un échec effectivement observé.

### Efficacité et petits échantillons

Les ratios utilisent les tentatives brutes, jamais un pourcentage extrapolé.
Ils exigent trois observations appariées valides avec un dénominateur strictement
positif. Un ratio 0/0 est exclu. Il n'existe pas de bascule brutale à cinq tentatives.

Après combinaison volume / efficacité, une confiance progressive multiplie
l'indice : min(1, échantillon / seuil). L'échantillon est le nombre de tentatives
lorsqu'il est connu, sinon le volume d'actions observées. Le seuil est de 5 pour
passes, progression, défense et duels ; 3 pour finition, création et arrêts.
Ce mécanisme modère une unique action réussie, même face à neuf joueurs à zéro.
Pour un indice négatif, la confiance garde un plancher de 0,25 : un zéro observé
reste distinct d’une donnée inconnue, sans forte sanction sur un faible volume.

Référence = somme des réussites / somme des tentatives des observations appariées.
Indice d'efficacité = (taux du joueur − taux de référence) /
max(0,25, taux de référence, 1 − taux de référence), borné entre −1 et +1.

- Finition : 50 % volume, 50 % conversion buts/tirs (ou cadrage si buts inconnus).
- Progression et duels : 50 % volume, 50 % réussite.
- Passes : 25 % volume, 75 % réussite, pour modérer le simple volume de passes.
- Si le ratio est absent ou manque de références appariées, le volume observé reste utilisable ;
  l'explication indique « volume observé uniquement ».

L'indice de domaine sert au calcul. `ratingDomains.score` est sa représentation
de lecture sur 100 : borne(50 + 25 × indice, 0, 100). Il ne représente pas une
compétence de long terme ni un percentile.

### Assemblage

Les poids des domaines de champ disponibles sont renormalisés. Les arrêts
restent plafonnés à 5 % du budget final, y compris lorsque d'autres domaines
manquent : une fiche renseignant seulement les arrêts ne peut pas recevoir une
note exceptionnelle. Cette exception explicite préserve leur rôle de petit bonus.

Les réglages historiques sont des multiplicateurs : 1 conserve le poids canonique,
0 désactive le domaine. `percussion` reste accepté comme ancien nom de
`progression`. Si aucun domaine comparable n'est actif, la note est inconnue.

Indice global = moyenne pondérée des indices de domaine.
Note intermédiaire = 6 + 6 × indice global − pénalité de pertes.
Pénalité initiale conservée = min(1, 0,06 × pertes observées). Ce coefficient est
la valeur héritée du site, conservée pour limiter la portée de la migration ;
il n'est pas présenté comme définitif ou issu de FotMob. Les pertes inconnues
n'ajoutent aucune pénalité. Les pertes ne sont pas aussi déduites dans le domaine
passes, pour éviter de les pénaliser deux fois.

Au-delà de 8 : note = 8 + 2 × (1 − exp(−(note intermédiaire − 8) / 2)).
La note finale est bornée entre 3 et 10, arrondie à un chiffre après la virgule.
Une correction administrateur conserve toujours la priorité.

## Couverture, migration et retour arrière

`ratingVersion`, `ratingDomains` et `ratingCoverage` accompagnent les notes calculées
côté serveur. La couverture est la somme des poids canoniques des domaines
disponibles. Une couverture inférieure à 100 % est signalée comme partielle.
La couverture ne garantit pas que toutes les sous-métriques ou le jeu sans ballon
ont été observés ; chaque explication précise si l'efficacité a pu être évaluée.
Les matchs historiques avec seulement buts et assists couvrent 40 % du barème.

Les notes automatiques sont recalculées avec V2 lors de la lecture, conformément
à la demande de remplacer le système. Aucun total brut ni override n'est migré,
aucune table n'est détruite. Les notes historiques peuvent donc changer dans les
classements ; le palmarès déjà figé n'est pas réécrit. Le site ne possédait pas de
snapshot historique fiable des anciennes notes automatiques.

L'ancien moteur exact est conservé dans `legacyRateMatches`. Dans Administration →
Réglages & données → Barème des notes, sélectionner l'ancien barème et enregistrer
permet de revenir à V1 sans redéploiement. Réactiver V2 restitue les mêmes notes
pour les mêmes données et réglages. En l'absence de préférence enregistrée, V2
est actif. V1 conserve sa référence historique dynamique ; V2 est indépendant
des autres matchs et saisons.

La distinction annotations en brouillon / statistiques publiées reste celle du
site : la lecture publique utilise les actions publiées. Une correction vidéo
non publiée ne modifie pas les notes publiques.

## Vérification

Tests dédiés : stabilité historique, efficacité de finition / dribbles / duels,
petits volumes, pondérations, secondary assists, chevauchements défensifs,
données incomplètes, arrêts, catégories exclues, bornes, overrides et idempotence.
Le test d'intégration PostgreSQL couvre aussi le changement de moteur, le retour
à V2 et la stabilité des notes publiques pendant une correction vidéo.

Commandes : `npm test`, `npx tsc --noEmit`, `npm run build`.
