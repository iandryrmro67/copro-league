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
2. Masquer la vidéo, saisir 12:43, choisir Passe → Ratée → Aucun / intercepteur non identifié. Tester aussi Tir → But → passeur / sans passe décisive, et Faute → Subie → adversaire.
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


### Contreparties et seconde précise

Choisir Mathis → Passe → Ratée → Alex. Vérifier une ligne « interceptée par Alex », une passe tentée/ratée pour Mathis et une interception/récupération pour Alex dans les compteurs. Cliquer le compteur d’interceptions doit retrouver cette ligne. Modifier l’intercepteur vers Paul et enregistrer : Alex revient à zéro, Paul reçoit les crédits, toujours une seule ligne. Tester « Aucun / intercepteur non identifié », Tir → Cadré → gardien, puis Perte de balle → Dépossédé → récupérateur. Les fixtures peuvent être réinitialisées sans toucher à la production.

Tester +1 s et −1 s, la borne zéro et le passage 00:59 → 01:00. À 390 px, vérifier les deux boutons ±1 s de 44 px de haut dans la barre fixe et aucun débordement de page, même avec le tableau des compteurs ouvert.


## Saisie optimisée du 6 octobre 2026

Le choix « Ouvrir ma vidéo » au-dessus du lecteur ouvre directement un fichier local. Tester une vidéo de 2 h et 376 391 Kio sans transfert réseau. Le test de cette version a utilisé un MP4 synthétique de cette durée, complété par un atome `free` jusqu’à 385 424 384 octets ; il valide la taille et la lecture locale, pas tous les codecs d’une vidéo réelle. Après rechargement, le fichier doit être sélectionné à nouveau.

Mathis → Passe → Longue → Réussie → Loris : une seule observation avec précision et Loris devient ciblé. Activer la chaîne des Verts, cliquer Xan → Adam → Mathis : trois passes distinctes et suivi du receveur. Avec une vidéo en lecture, la chaîne ne la met pas en pause. « Passe ratée » ouvre directement les intercepteurs. Tir → Non cadré → Pied gauche → Enregistrer le tir conserve la précision sans rouvrir l’événement. CSC pour Mathis ajoute un but aux Bleus, sans tir ni assist. Vérifier le temps fixe, la correction et le repli des palettes à 390 px, sans débordement de page.


## Lecteur agrandi et commandes

Sur la fixture vidéo de 30 s : le lecteur est plus large que la saisie, avec curseur « Position dans la vidéo », vitesse contrastée, boutons théâtre et plein écran. Tester les vitesses 0,5× / 1,5× / 2× contre la propriété réelle `playbackRate`, puis Home / End sur le curseur contre `currentTime`. Le théâtre conserve la vidéo montée. Le plein écran affiche l’image et les commandes, puis revient à l’atelier. Pendant une passe commencée à 00:01, déplacer la vidéo à 00:30 doit conserver le temps figé de l’action à 00:01. À 390 px : commandes et vitesse visibles, aucun débordement de page. Refaire End sur le fichier synthétique de 2 h : `duration` et `currentTime` valent 7200.
