
from flask import Flask, send_from_directory, jsonify
from pathlib import Path

app = Flask(__name__)

# Dossier contenant les fichiers de la boutique
BASE_DIR = Path(__file__).resolve().parent

# Configuration FUTURE TECH
BOUTIQUE = {
    "nom": "FUTURE TECH",
    "devise": "FCFA",
    "pays": "Côte d'Ivoire",
    "whatsapp": "2250757589892",
    "paiement": "Paiement à la livraison"
}


@app.route("/")
def accueil():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def fichiers(filename):
    # Sert uniquement les fichiers du dossier de la boutique
    return send_from_directory(BASE_DIR, filename)


@app.route("/api/boutique")
def informations_boutique():
    return jsonify(BOUTIQUE)


@app.route("/api/sante")
def verification():
    return jsonify({
        "status": "ok",
        "message": "Le serveur FUTURE TECH fonctionne."
    })


if __name__ == "__main__":
    print("-----------------------------------")
    print(" FUTURE TECH - SERVEUR DEMARRE")
    print("-----------------------------------")
    print("Adresse : http://127.0.0.1:5000")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
