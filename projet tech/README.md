# PC Market

## Lancer le site

Installe Python 3.10 ou supérieur, ouvre PowerShell dans ce dossier et lance :

```powershell
python server.py
```

Ouvre ensuite `http://127.0.0.1:8000` dans Chrome ou un autre navigateur. Les visiteurs peuvent parcourir, rechercher et ajouter des articles au panier sans compte. La connexion ou la création d’un compte est demandée au moment de commander. Le panier est conservé dans le navigateur pour être retrouvé après la connexion. Le client connecté indique sa commune ou son quartier et accepte explicitement le suivi WhatsApp. Le serveur recalcule les prix et conserve la référence de commande. Si WhatsApp Business accepte l’envoi, un modèle approuvé informe le client que sa commande est prise en charge, qu’elle sera livrée sous 24 h à compter de la commande et que le livreur le contactera avant son arrivée. Le paiement est prévu à la livraison ; l’adresse précise et les frais sont à confirmer avec le vendeur. Si l’envoi automatique échoue, la commande reste en attente de confirmation et le site invite le client à contacter le vendeur. Un message quotidien propose une sélection du catalogue lors de la première visite de la journée ; il s’affiche uniquement sur le site et ne prétend pas signaler un nouveau stock. La connexion sociale Google, Facebook et GitHub n’est pas proposée.

Le catalogue actuel comprend dix articles, dont deux adaptateurs USB-C à 10 000 FCFA chacun et trois souris à 8 000 FCFA chacune. Les anciens identifiants de souris conservés côté serveur ont aussi ce prix. Le SOYO M5 Air conserve un prix provisoire. Pour ajouter une nouveauté, ajoute sa fiche dans `lenovo.js` (`productsDemo`) et son prix autorisé dans `server.py` (`PAYMENT_PRODUCTS`).

## Paiements et prix

Le parcours de commande actuel utilise le paiement à la livraison et une confirmation automatique WhatsApp. L’ancienne intégration serveur CinetPay est conservée, mais elle n’est pas proposée dans le parcours de commande du site.

## Confirmation WhatsApp automatique

L’envoi utilise la WhatsApp Cloud API officielle de Meta. Configure les variables d’environnement côté serveur (ou dans les variables secrètes de l’hébergeur) :

- `WHATSAPP_ACCESS_TOKEN` : jeton d’accès permanent ou valide à la Cloud API.
- `WHATSAPP_PHONE_NUMBER_ID` : identifiant du numéro d’envoi WhatsApp Business, pas le numéro affiché au public.
- `WHATSAPP_ORDER_TEMPLATE` : nom du modèle Utility approuvé (par défaut `order_delivery_confirmation`).
- `WHATSAPP_TEMPLATE_LANGUAGE` : langue approuvée du modèle (par défaut `fr`).
- `WHATSAPP_GRAPH_API_VERSION` : version Graph encore prise en charge par Meta (par défaut `v23.0`).

Crée et fais approuver dans WhatsApp Manager un modèle Utility français dont le corps utilise exactement deux paramètres, dans cet ordre :

```text
Bonjour, votre commande {{1}} est prise en charge. La livraison est prévue dans les 24 heures suivant votre commande à {{2}}. Le livreur vous contactera avant de venir. Paiement à la livraison.
```

Le client doit posséder WhatsApp sur le numéro de son compte et cocher la case d’accord avant de recevoir le message. L’API accepte l’envoi d’un modèle pré-approuvé en dehors de la fenêtre de service de 24 h. Si les variables Meta ne sont pas configurées, si le modèle n’est pas approuvé ou si le numéro n’est pas joignable, la commande reste `PENDING_CONFIRMATION` et aucune réussite d’envoi n’est annoncée. Les identifiants API ne doivent jamais être copiés dans le navigateur, le dépôt ou le chat.

**Engagement de livraison :** le message annonce une livraison sous 24 h après la commande et un appel du livreur avant son arrivée. N’active cet engagement que si le stock, la zone de livraison, le paiement à la livraison et les livreurs permettent réellement de le respecter. Le site n’attribue pas automatiquement un livreur et ne fournit pas encore de suivi GPS.

Le serveur recalcule les prix et associe chaque commande au compte connecté. Le mini-PC SOYO M5 Air conserve provisoirement le tarif de 200 000 FCFA du catalogue ; la Surface Laptop 4 est affichée à 350 000 FCFA et le Dell Latitude 7200 2-en-1 à 250 000 FCFA, selon les visuels fournis. Les autres ordinateurs gardent leur tarif affiché de 200 000 FCFA. Les souris Dell et Lenovo coûtent 10 000 FCFA chacune ; la station d’accueil conserve son prix de 145 000 FCFA.

## Sécurité et hébergement

- Les mots de passe sont dérivés avec scrypt. Les sessions utilisent un jeton aléatoire stocké sous forme de condensat et envoyé dans un cookie `HttpOnly`, `SameSite=Lax`.
- Les inscriptions et connexions sont limitées par adresse IP. Les changements de compte exigent une origine correspondante.
- Le fichier [`../render.yaml`](../render.yaml) prépare un hébergement gratuit de démonstration sur Render. Crée le service depuis ce dépôt, puis renseigne ses variables d’environnement dans le tableau de bord Render.
- Pour conserver les comptes et les commandes après un redémarrage, configure `DATABASE_URL` avec une base PostgreSQL Neon. Le serveur utilise SQLite en local et PostgreSQL lorsque `DATABASE_URL` est défini.
- Render fournit automatiquement l’origine HTTPS du service. Si tu utilises un domaine personnalisé, configure `PC_MARKET_ORIGIN` avec son origine HTTPS exacte, sans chemin final. `PC_MARKET_ENV=production`, `PC_MARKET_HOST=0.0.0.0` et `PC_MARKET_COOKIE_SECURE=1` sont prévus dans la configuration Render.
- Les services gratuits Render s’endorment après une période d’inactivité et leur système de fichiers est éphémère ; le premier chargement peut être lent. Leurs services gratuits sont destinés aux essais et projets personnels, pas à une boutique de production. Vérifie les limites et la durée de conservation des offres gratuites avant d’y stocker des données importantes.
- Le numéro WhatsApp commercial `07 57 58 98 92` est affiché comme contact public. Les confirmations automatiques sont envoyées aux clients par le numéro WhatsApp Business configuré séparément.
- Chrome est un navigateur, pas un hébergeur. Il faut déployer le serveur Python et non publier uniquement les fichiers HTML/CSS/JavaScript.

## Tests

```powershell
python -m unittest -v
```
