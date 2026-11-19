# Installer le moteur Google (15 minutes, gratuit)

Le moteur fait le lien entre la tablette et ton Google Agenda, l'horoscope et tes radiateurs Cozytouch.
Il tourne dans ton propre compte Google : personne d'autre n'y a accès.

Fais ces étapes sur un ordinateur, c'est plus confortable que sur la tablette.

## 1. Créer le projet

1. Ouvre https://script.google.com avec ton compte Google (celui de ton agenda).
2. Clique sur **Nouveau projet**.
3. En haut à gauche, clique sur **Projet sans titre** et renomme le projet en `Moteur tableau de bord`.

## 2. Coller le code

1. Ouvre https://raw.githubusercontent.com/gildasgeffray-coder/tableau-de-bord/main/apps-script/Code.gs
2. Sélectionne tout (Ctrl+A) et copie (Ctrl+C).
3. Retourne dans l'éditeur Apps Script, efface tout le contenu de `Code.gs` et colle le code.
4. Clique sur l'icône **disquette** pour enregistrer.

## 3. Régler le fuseau horaire et Cozytouch

1. Dans la barre de gauche, clique sur la **roue dentée** (Paramètres du projet).
2. Vérifie que le **fuseau horaire** est `(GMT+01:00) Paris`. Sinon, change-le.
3. Descends jusqu'à **Propriétés du script**, puis clique sur **Ajouter une propriété du script** deux fois :
   1. Propriété `COZYTOUCH_USER`, valeur : l'e-mail de ton compte Cozytouch.
   2. Propriété `COZYTOUCH_PASSWORD`, valeur : ton mot de passe Cozytouch.
4. Clique sur **Enregistrer les propriétés du script**.

## 4. Initialiser et autoriser

1. Reviens dans l'**Éditeur** (icône `< >` à gauche).
2. Dans la liste en haut, à côté de **Déboguer**, choisis la fonction `setup`, puis clique sur **Exécuter**.
3. Google demande une autorisation :
   1. Clique sur **Examiner les autorisations** et choisis ton compte.
   2. Un écran dit « Google n'a pas validé cette application ». C'est normal : c'est ton propre script.
      Clique sur **Paramètres avancés**, puis sur **Accéder à Moteur tableau de bord (non sécurisé)**.
   3. Clique sur **Autoriser**.
4. En bas, le **Journal d'exécution** affiche une ligne `CODE SECRET à copier dans la tablette : ...`.
   **Note ce code**, tu en auras besoin à l'étape 7.
   Tu ne le vois pas ? Va dans la **roue dentée** (Paramètres du projet), puis **Propriétés du script** :
   la valeur de la ligne `TOKEN` est ton code secret.
   S'il n'y a pas de ligne `TOKEN`, relance `setup` et va jusqu'au bout de l'autorisation.

## 5. Vérifier que tout marche

1. Choisis la fonction `testCozytouch` et clique sur **Exécuter**.
   Le journal doit afficher la température de chaque radiateur et la moyenne (`"temp": 19.6` par exemple).
   S'il affiche une erreur, copie-la et envoie-la à Claude.
2. Choisis la fonction `testHoroscope` et clique sur **Exécuter**.
   Le journal doit afficher le texte du jour pour le Lion, le Sagittaire et la Vierge.

## 6. Mettre le moteur en ligne

1. En haut à droite, clique sur **Déployer**, puis **Nouveau déploiement**.
2. Clique sur la roue dentée à côté de « Sélectionner le type » et choisis **Application Web**.
3. Remplis :
   1. Description : `Tableau de bord`
   2. Exécuter en tant que : **Moi**
   3. Qui a accès : **Tout le monde**
4. Clique sur **Déployer**, puis copie l'**URL de l'application Web** (elle se termine par `/exec`).

« Tout le monde » est nécessaire pour que la tablette puisse joindre le moteur sans se connecter à Google.
Sans le code secret, le moteur refuse toute demande.

## 7. Relier la tablette

1. Sur la tablette, ouvre le tableau de bord et touche la **roue dentée** en bas à droite.
2. Colle l'**adresse du moteur** (URL `/exec`) et le **code secret**.
3. Touche **Enregistrer**. Le tableau se recharge et le voyant en bas à droite passe au **vert**.

## Plus tard : mettre à jour le moteur

Quand le code du moteur change :

1. Remplace le contenu de `Code.gs` par la nouvelle version et enregistre.
2. Clique sur **Déployer**, puis **Gérer les déploiements**.
3. Clique sur le **crayon**, choisis **Version : Nouvelle version**, puis **Déployer**.

L'adresse `/exec` reste la même : rien à changer sur la tablette.
