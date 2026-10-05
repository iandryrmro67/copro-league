# Vérification de l’annotation

Cette page monte les vrais composants d’analyse avec dix joueurs fictifs et un état React local. Elle n’utilise ni compte, ni base, ni API de sauvegarde. Le score officiel initial est 8–6 ; les annotations démarrent à zéro.

Depuis la racine de `work/vercel`, générer la vidéo synthétique (FFmpeg requis), puis lancer la page :

```sh
mkdir -p tests/browser/annotation-preview/public/api/videos
node -e "require('sharp')('tests/browser/annotation-preview/public/pitch.svg').png().toFile('/tmp/copro-preview-pitch.png')"
ffmpeg -loop 1 -i /tmp/copro-preview-pitch.png -r 25 -t 30 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -y tests/browser/annotation-preview/public/api/videos/00000000-0000-4000-8000-000000000000.mp4
npx vite --config tests/browser/annotation-preview/vite.config.mts
```

Ouvrir `http://127.0.0.1:5190/`. Le banc `http://127.0.0.1:5190/responsive.html` affiche les vrais composants dans deux fenêtres de 390 px et 768 px. La vidéo générée est ignorée par Git. Le terrain schématique sert uniquement de vidéo de test, sans détection automatique.

Parcours de vérification de la saisie précise :

1. Choisir Mathis, lancer la vidéo et avancer à 5 s. Choisir Passe → Réussie → Xan : une action, temps du clic conservé, Mathis reste ciblé et la vidéo reprend si elle jouait.
2. Masquer la vidéo, saisir 12:43, choisir Passe → Ratée → Destinataire non identifié. Tester aussi Tir → But → passeur / sans passe décisive, et Faute → Subie → adversaire.
3. Annuler / refaire, corriger depuis une ligne sans ajouter d’événement, filtrer un joueur impliqué et lire la sélection.
4. Dans les précisions facultatives d’une correction, saisir uniquement X : aucune position n’est inventée et la sauvegarde attend Y. Tester aussi le clic sur le terrain.
5. Ouvrir `/?video=none` et `/?video=broken` : aucun grand écran vide ou inutilisable, saisie manuelle possible. Le second cas déclenche une erreur sur un fichier inexistant de cette fixture uniquement.
6. Ouvrir `/?video=none&persist=1` : le test conserve son propre état dans la clé locale `precise-preview`. Recharger au milieu d’une saisie ou correction et finir sans perdre ses choix. « Réinitialiser le test » réinitialise uniquement cette fixture.
7. Contrôler l’ordre vidéo → saisie → timeline et l’absence de débordement à 390 / 768 px, y compris un menu de résultat et une liste d’événements. Aucun parcours ne contacte la base de production.

Les tests Node couvrent validation des participants et résultats, projections atomiques, liens, contreparties des blocages, métadonnées de correction, coordonnées incomplètes, anciennes sessions et temps inconnus. La vidéo synthétique ne valide pas les restrictions ou les conditions réseau de YouTube.

Le site et l’atelier utilisent les mêmes polices locales et tokens de `app/design-system.css` : Archivo, Big Shoulders Display, JetBrains Mono, fonds Void / Carbon, accent Kush et angles droits.

### Temps rapide et réinitialisation de draft

Sans vidéo, cliquer +1 min puis +5 s, noter une touche et corriger son temps avec −5 s : vérifier une seule action à 1:00. À 390 px, les six boutons passent sur deux rangées ; vérifier le passage de 2:58 à 3:03 et le déplacement de la timeline.

`/?draft=1&video=none` monte le vrai composant Draft avec quatre joueurs fictifs. Générer puis valider doit vider la sélection et les équipes affichées, tout en conservant les quatre affectations dans la sortie de test. « Simuler un échec de validation » doit conserver le tirage. Tester les modes Équilibré, Capitaines, Pack draft ainsi que « Changer de match fictif ». `&free=1` vérifie « Terminer la draft » sans match. `&draft-api=1` exerce la branche API avec une réponse locale simulée (409 ou succès) : aucune requête de sauvegarde ne quitte la fixture.

### Retour arrière et stockage indisponible

Lancer le même serveur avec `--port 5192`, puis ouvrir `http://127.0.0.1:5192/?history=1&video=none`. « Ouvrir l’éditeur local » utilise la stratégie de navigation des pages admin. Activer « Bloquer le stockage local du test », modifier le numéro et utiliser Retour : rester dans le document conserve la modification du vrai MatchEditor. Remettre le numéro à 1 et désactiver le blocage avant de fermer. Les fixtures restent sur cet origin local ; le bouton serveur ne fait aucune requête d’enregistrement.
