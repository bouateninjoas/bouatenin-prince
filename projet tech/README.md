# PC Market

## Lancer le site

Installe Python 3.10 ou supérieur, ouvre PowerShell dans ce dossier et lance :

```powershell
python server.py
```

Ouvre ensuite `http://127.0.0.1:8000` dans Chrome ou un autre navigateur. Crée un compte avec ton numéro de téléphone et un mot de passe d’au moins 10 caractères, ou connecte-toi avec un compte existant. La connexion sociale Google, Facebook et GitHub n’est pas proposée.

## Paiement

Une fois connecté, le panier peut démarrer un paiement CinetPay. Configure `CINETPAY_API_KEY` et `CINETPAY_SITE_ID` comme variables d’environnement du serveur ; ne place jamais ces clés dans le HTML, le JavaScript ou dans Git. CinetPay affiche les moyens activés sur le compte marchand, par exemple Wave, Orange Money, Moov Money ou carte bancaire. Sans ces clés, la boutique reste accessible mais le paiement est désactivé.

Le serveur recalcule les prix, associe chaque commande au compte connecté et vérifie le paiement auprès de CinetPay. Le mini-PC SOYO M5 Air conserve provisoirement le tarif de 200 000 FCFA du catalogue ; la Surface Laptop 4 est affichée à 350 000 FCFA et le Dell Latitude 7200 2-en-1 à 250 000 FCFA, selon les visuels fournis. Les autres ordinateurs gardent leur tarif affiché de 200 000 FCFA. Les souris Dell et Lenovo coûtent 10 000 FCFA chacune ; la station d’accueil conserve son prix de 145 000 FCFA.

## Sécurité et hébergement

- Les mots de passe sont dérivés avec scrypt. Les sessions utilisent un jeton aléatoire stocké sous forme de condensat et envoyé dans un cookie `HttpOnly`, `SameSite=Lax`.
- Les inscriptions et connexions sont limitées par adresse IP. Les changements de compte exigent une origine correspondante.
- Le fichier [`../render.yaml`](../render.yaml) prépare un hébergement gratuit de démonstration sur Render. Crée le service depuis ce dépôt, puis renseigne ses variables d’environnement dans le tableau de bord Render.
- Pour conserver les comptes et les commandes après un redémarrage, configure `DATABASE_URL` avec une base PostgreSQL Neon. Le serveur utilise SQLite en local et PostgreSQL lorsque `DATABASE_URL` est défini.
- Render fournit automatiquement l’origine HTTPS du service. Si tu utilises un domaine personnalisé, configure `PC_MARKET_ORIGIN` avec son origine HTTPS exacte, sans chemin final. `PC_MARKET_ENV=production`, `PC_MARKET_HOST=0.0.0.0` et `PC_MARKET_COOKIE_SECURE=1` sont prévus dans la configuration Render.
- Les services gratuits Render s’endorment après une période d’inactivité et leur système de fichiers est éphémère ; le premier chargement peut être lent. Leurs services gratuits sont destinés aux essais et projets personnels, pas à une boutique de production. Vérifie les limites et la durée de conservation des offres gratuites avant d’y stocker des données importantes.
- Crée ton compte marchand CinetPay et active les moyens de paiement souhaités. Ajoute `CINETPAY_API_KEY` et `CINETPAY_SITE_ID` uniquement dans les variables secrètes de Render. Ne les envoie pas dans le chat et ne les place jamais dans le HTML, le JavaScript ou Git. Les paiements restent désactivés tant que CinetPay et la boutique n’ont pas été configurés et testés.
- N’ajoute pas ton numéro personnel au site sans décider explicitement de l’afficher. Il ne remplace ni un compte marchand ni ses informations de versement.
- Chrome est un navigateur, pas un hébergeur. Il faut déployer le serveur Python et non publier uniquement les fichiers HTML/CSS/JavaScript.

## Tests

```powershell
python -m unittest -v
```
