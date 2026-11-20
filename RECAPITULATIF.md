# Récapitulatif du projet « Tableau de bord tablette »

Tableau de bord personnel sur Samsung Galaxy Tab A 10.1 (SM-T580), réalisé les 19 et 20 novembre 2026.
Adresse : https://gildasgeffray-coder.github.io/tableau-de-bord/

## 1. Cadrage et choix techniques (19/11)

1. **Environnement vérifié** : développement dans un environnement cloud (Node 22, Git, Python, navigateur de test).
2. **Tablette identifiée** : Galaxy Tab A 10.1 (SM-T580), écran 1920×1200, Android 8.1, Chrome limité à la version 138.
3. **Architecture retenue, coût 0 €** :
   1. **Affichage** : page web en JavaScript simple, sans React, hébergée gratuitement sur **GitHub Pages**.
   2. **Moteur** : **Google Apps Script**, gratuit, dans le compte Google de l'utilisateur.
   3. **Météo** : **Open-Meteo**, gratuit et sans clé.
4. **Écartés volontairement** : React (trop lourd pour la tablette) et Supabase (service inutile).

## 2. Première version de l'écran (19/11)

1. **Création du projet** : `index.html`, feuille de style, scripts par module, `manifest.json` (plein écran), icônes, `sw.js` (affichage hors ligne).
2. **Design** : fond bleu nuit, accents vert et bleu, gros caractères, blocs adaptés au paysage.
3. **Horloge** : heure en grand, secondes, jour, date complète, numéro de semaine.
4. **Météo de Guenrouët** : température, ressenti, vent et direction, rafales, pluie, humidité, prévisions sur 5 jours ; mise à jour toutes les 15 minutes.
5. **Agenda** : rendez-vous du jour et à venir ; ajout, modification, suppression ; bandeau orange moins d'une heure avant un rendez-vous, vert pendant ; anniversaires en rose.
6. **Calendrier mensuel** : navigation par mois, points sous les jours occupés, détail du jour au toucher.
7. **Fonctionnement 24 h/24** : mode nuit de 23 h à 6 h, rechargement automatique à 4 h, affichage maintenu sans Internet, voyant d'état vert, orange ou rouge.
8. **Écran de réglages** : adresse du moteur, code secret, signes astrologiques, lieu de la météo, mode nuit.
9. **Tests** au format de la tablette, dont l'ajout, la modification et la suppression d'événements.

## 3. Ajustements demandés (19/11)

1. **Température intérieure** ajoutée à côté de la température extérieure.
2. **Modules Actualités et Sport retirés**, écran réorganisé et météo agrandie.

## 4. Moteur Google Apps Script (19/11)

1. **Agenda Google** : lecture de tous les agendas, création, modification, suppression, détection des anniversaires, protection des événements récurrents.
2. **Horoscope** : Lion, Sagittaire, Vierge, source mon-horoscope-du-jour.com.
3. **Cozytouch (radiateurs Atlantic)** : connexion non officielle sur le modèle de Home Assistant ; **moyenne de la maison** avec minimum et maximum ; appels à Atlantic limités à un toutes les 10 minutes ; mention « ancienne mesure » en cas de panne.
4. **Sécurité** : moteur protégé par un code secret ; identifiants Cozytouch stockés uniquement dans le compte Google.
5. **Guide d'installation** pas à pas (`apps-script/INSTALLATION.md`) et fonctions de test : `setup`, `testCozytouch`, `testHoroscope`, `testCitation`.

## 5. Publication et installation (19/11)

1. **Dépôt GitHub** `gildasgeffray-coder/tableau-de-bord` créé, relié à Claude, code envoyé.
2. **GitHub Pages** activé : tableau en ligne.
3. **Moteur installé** dans le compte Google. Deux blocages résolus : code collé dans `myFunction`, déploiement à refaire en « Nouvelle version ».
4. **Correctif** : le code secret s'affiche en premier dans le journal.
5. **Horoscope corrigé** : texte complet lu sur la page du jour, flux RSS en secours.

## 6. Nouveautés et fiabilité (20/11)

1. **Citation du jour** avec son auteur, source citationdujour.fr ; dernière citation conservée si le site ne répond pas.
2. **Mises à jour garanties** : la tablette vérifie à chaque chargement qu'elle a la dernière version ; bouton **Recharger** avec « Rechargement… ».
3. **Réglages renforcés** :
   1. nettoyage des espaces et caractères invisibles des copier-coller ;
   2. messages d'erreur précis (adresse incomplète, longueur du code, code refusé) ;
   3. **ID de déploiement** accepté seul, adresse complète reconstruite.

## 7. Mode kiosque sur la tablette (20/11)

1. **Fully Kiosk Browser** installé, version gratuite ; publicités causées par une adresse de départ erronée, corrigée.
2. **Réglages Fully** : écran toujours allumé, démarrage automatique, paysage, plein écran (**Enable Fullscreen**).
3. **Réglages Samsung** : verrouillage de l'écran désactivé.
4. **Test de redémarrage réussi** : la tablette repart seule sur le tableau, voyant vert.
5. **Cozytouch vérifié** : moyenne maison affichée.

## 8. Spotify (20/11)

1. **Vérification préalable** dans la documentation officielle : Premium obligatoire depuis 2026, fonctions de lecture toujours autorisées.
2. **Module Spotify** : pochette, titre, artiste, progression, lecture/pause, précédent, suivant, volume ; placé sous l'agenda.
3. **Bouton « Relier Spotify »** dans les réglages.
4. **Messages d'erreur visibles** dans le bloc.
5. **Problème de compte résolu** : application Spotify recréée sur le compte Premium, liaison refaite.
6. **Sélecteur d'appareil** (« sur … ▾ ») : tablette, téléphone, enceinte connectée.
7. **Spotify installé sur la tablette** pour qu'elle serve d'appareil d'écoute.

## 9. Bilan

1. **Coût** : 0 €, en plus de l'abonnement Spotify Premium existant.
2. **Versions** : chaque version a été testée au format de la tablette avant d'être envoyée sur GitHub.
3. **Écarté** : surveillance par la caméra de la tablette.
4. **Limites connues** :
   1. Cozytouch utilise un accès non officiel, qu'Atlantic peut modifier.
   2. Après un redémarrage, Spotify doit être ouvert une fois sur la tablette.
   3. Tablette branchée en permanence : surveiller que la batterie ne gonfle pas.

## 10. Entretien

1. **Changement d'affichage** : il arrive seul sur la tablette (ou via ⚙, puis **Recharger**).
2. **Changement du moteur** : recoller `apps-script/Code.gs` dans Apps Script, puis **Déployer**, **Gérer les déploiements**, crayon, **Nouvelle version**, **Déployer**.
