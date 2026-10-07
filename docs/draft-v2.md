# Drafts — équilibrage hybride et pack libre

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

Chaque joueur est attribué indépendamment à A ou B à 50 %. Pas de quota, de
verrou ou de correction selon le niveau ; nombres impairs de 3 à 19 possibles,
avec 2 à 20 participants au total. Une équipe vide reste tirable, mais sa
validation est bloquée avec un message et possibilité de relance.
Les cartes sont révélées suivant une permutation indépendante. Puissance,
écart et estimations ne sont affichés qu'après la dernière carte.
Une composition inégale non vide est enregistrable dans le match ou transmissible
au brouillon de l'admin. Les autres modes gardent la validation à effectifs égaux.

Victoire/nul/défaite : modèle ELO indicatif pour des effectifs égaux uniquement,
au moins 20 matchs valides dans la ligue et 5 par joueur. ELO moyen -> score
attendu e ; fréquence empirique de nuls d plafonnée à 2×min(e,1−e) ;
P(victoire A)=e−d/2, P(victoire B)=1−e−d/2. Résultats symétriques et total 100 %.
Pour des effectifs différents ou un historique insuffisant, aucune probabilité
n'est inventée : message d'indisponibilité. Il reste à calibrer un modèle tenant
compte de l'avantage numérique sur des matchs comparables.

## Validation

217 tests du projet réussis, dont 11 nouveaux sur les aptitudes, corrections,
absence de données, frontière temporelle, attribution distincte, optimum global,
verrous, groupe imparfait, hasard sans quota, validation d'effectifs inégaux et
estimations. 80 comparaisons indépendantes du matching avec une recherche brute.
TypeScript propre ; lint ciblé sans erreur, avertissement image préexistant.

CUA sur fixture temporaire : équilibré sans profils affichés, verrou conservé
après relance, déplacement bloquant la validation 4/6 en équilibré, pack à
neuf participants, indicateurs masqués avant révélation, validation 4/5 et
transmission complète au brouillon fictif, remise à zéro après validation,
choix serpent des huit picks après les deux capitaines (A,B,B,A,A,B,B,A).
Aucune écriture en base réelle. La fixture est retirée avant le build final.
