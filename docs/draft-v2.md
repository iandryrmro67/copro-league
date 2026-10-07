# Drafts — équilibrage hybride et pack à 5 contre 5

Implémentation du 7 octobre 2026 dans la version Vercel.

## Équilibré

L'apparence et le calcul de puissance existants sont conservés. Les profils,
aptitudes, fonctions et score de compromis ne sont pas affichés dans la draft.
Le mode Capitaines conserve son choix serpent et ses commandes.

`lib/draft.ts` calcule les sept styles continus à partir des vingt dernières
participations terminées avec score et équipes valides. Chaque statistique
utilise sa moyenne observée, avec trois observations et trois joueurs comparables
minimum. Le percentile est combiné à la caractéristique de préparation par
`c = n / (n + 5)`. Un indicateur absent reprend la préparation ; une préparation
absente reçoit 50 pour le calcul interne, jamais une statistique publique.
Les badges publics et la notation des matchs ne sont pas modifiés.

Quatre aptitudes sont conservées par joueur : protéger = max(Stoppeur,
Intercepteur, 0,75 × Duelliste), construire = max(Créateur, Métronome), éliminer
= Percuteur, finir = Finisseur. Un hybride peut être affecté à la fonction utile
sans perdre ses contributions secondaires aux moyennes collectives.

La recherche exhaustive compare les répartitions à effectifs égaux autorisées
par les verrous. La couverture maximin utilise une programmation dynamique sur
16 masques, avec un joueur distinct par fonction. Le coût normalisé est :
45 % écart de puissance + 35 % faiblesse de la fonction la moins couverte des
deux équipes + 20 % écart moyen des quatre aptitudes collectives. Le seuil 5 %
n'est plus un filtre. Une fonction faible n'empêche pas le résultat. Tirage
uniforme par réservoir entre coûts égaux à 1e-9 près.

Les poids sont des hypothèses de départ, pas une calibration sportive validée.
Le calcul tourne dans un worker. Le secours sans worker cède la main tous les
256 candidats. Jusqu'à 184 756 répartitions à 20 joueurs ; contrôle local
mesuré à environ 193 ms pour le moteur synchrone. Aucun seuil arbitraire ne
transforme silencieusement le moteur en recherche approchée.
Le match préparé et les matchs datés postérieurs sont exclus de l'historique.
Les matchs historiques non datés restent utilisables sans inventer de date.

## Pack

Le pack nécessite exactement 10 participants. Une permutation Fisher–Yates des
identifiants attribue les cinq premiers à A et les cinq autres à B, sans consulter
notes, ELO, profils ou verrous. Les équipes restent donc aléatoires en niveau,
mais comportent obligatoirement cinq joueurs chacune. Les cartes sont révélées
suivant une permutation indépendante. Puissance, écart, estimations et commandes
d’échange restent masqués jusqu’à la dernière carte.

Après révélation, un joueur peut être sélectionné pour un échange avec un joueur
adverse. L’échange conserve cinq joueurs par équipe ; sélection annulable, effacée
à la relance ou au changement de participants, de match ou de mode. La validation
exige les dix identifiants uniques sélectionnés et une répartition 5/5.

Victoire/nul/défaite : modèle ELO indicatif pour des effectifs égaux uniquement,
au moins 20 matchs valides dans la ligue et 5 par joueur. ELO moyen -> score
attendu e ; fréquence empirique de nuls d plafonnée à 2×min(e,1−e) ;
P(victoire A)=e−d/2, P(victoire B)=1−e−d/2. Résultats symétriques et total 100 %.
Pour un historique insuffisant, aucune probabilité n’est inventée : message
d’indisponibilité. La fonction d’estimation refuse également des effectifs
différents si elle est utilisée hors du pack.

## Validation de la correction du pack

217 tests réussis, dont validation du format 5/5 même aux extrêmes du générateur,
absence d’équilibrage selon le niveau, rejet des effectifs incomplets et doublons,
validation après échange. TypeScript propre ; lint ciblé sans erreur,
avertissement image préexistant.

CUA en local avec données publiques : pack à neuf joueurs refusé, dix cartes
révélées en 5/5, aucun joueur ni échange affiché avant révélation, échange de deux
adversaires conservant 5/5 et absence d’erreur console. Aucun match réel sauvegardé.

La correction touche uniquement la draft. Comparaison avec le commit timeline
6bc8e50 : aucun changement aux fichiers de timeline, saisie d’actions, calcul de
statistiques ou notes. Les marqueurs de la saisie révisée sont aussi présents dans
le JavaScript publié avant cette correction (captureRevision, passTypeChosen,
SECOND_BALL, ESCAPE_PRESSURE et Position inconnue).
