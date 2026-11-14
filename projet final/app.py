import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from datetime import timedelta
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    abort,
    current_app,
    flash,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash


PROJECT_DIR = Path(__file__).resolve().parent
PUBLIC_PAGES = {
    "contact",
    "index",
    "inscription",
    "livraison",
    "paiements",
    "vendeurs",
}
STATIC_FILES = {"admin.js", "forms.js", "script.js", "style.css"}
IMAGE_ID_PATTERN = re.compile(r"photo-[A-Za-z0-9-]{3,100}\Z")
EMAIL_PATTERN = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+\Z")
INQUIRY_TYPES = {"contact", "information", "seller"}
MAX_SUBMISSIONS_PER_HOUR = 10
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCK_SECONDS = 15 * 60
LOGIN_WINDOW_SECONDS = 15 * 60

CATEGORY_SEED = [
    ("Téléphones et accessoires", "📱"),
    ("Informatique et ordinateurs", "💻"),
    ("Électronique et électroménager", "🎧"),
    ("Vêtements et chaussures", "👗"),
    ("Mode et accessoires", "👜"),
    ("Beauté et cosmétiques", "🧴"),
    ("Maison, meubles et décoration", "🪴"),
    ("Cuisine et ustensiles", "🍳"),
    ("Alimentation et boissons", "🍯"),
    ("Supermarché et produits du quotidien", "🛒"),
    ("Santé et bien-être", "🌿"),
    ("Sports et loisirs", "⚽"),
    ("Jouets et jeux", "🧸"),
    ("Bébé et puériculture", "🍼"),
    ("Livres et fournitures scolaires", "📚"),
    ("Automobile et accessoires", "🚗"),
    ("Bricolage et jardinage", "🪴"),
    ("Animaux et accessoires", "🐾"),
    ("Bijoux et montres", "⌚"),
    ("Autres produits", "✨"),
]

PRODUCT_SEED = [
    ("Smartphone Nova 128 Go", "Téléphones et accessoires", 89900, "photo-1511707171634-5f897ff02aa9", "Populaire", "4,8", 36),
    ("Casque sans fil Studio", "Informatique et ordinateurs", 24500, "photo-1505740420928-5e560c06d30e", "Bon plan", "4,7", 21),
    ("Mini enceinte Bluetooth", "Électronique et électroménager", 15900, "photo-1608043152269-423dbba4e7e1", "", "4,6", 14),
    ("Baskets urbaines ivoire", "Vêtements et chaussures", 27900, "photo-1542291026-7eec264c27ff", "Nouveau", "4,9", 18),
    ("Sac à main Naya", "Mode et accessoires", 22500, "photo-1584917865442-de89df76afd3", "", "4,8", 12),
    ("Coffret soin éclat naturel", "Beauté et cosmétiques", 18900, "photo-1608248543803-ba4f8c70ae0b", "Coup de cœur", "4,9", 29),
    ("Vase artisanal en céramique", "Maison, meubles et décoration", 12500, "photo-1578500494198-246f612d3b3d", "", "4,7", 9),
    ("Set de cuisine 5 pièces", "Cuisine et ustensiles", 32000, "photo-1556911220-bff31c812dba", "", "4,6", 11),
    ("Coffret de douceurs locales", "Alimentation et boissons", 9500, "photo-1547592180-85f173990554", "Local", "4,9", 17),
    ("Panier découverte du marché", "Supermarché et produits du quotidien", 14500, "photo-1542838132-92c53300491e", "", "4,8", 24),
    ("Tisane détente aux plantes", "Santé et bien-être", 6500, "photo-1544787219-7f47ccb76574", "", "4,7", 15),
    ("Sac de sport tout-terrain", "Sports et loisirs", 19500, "photo-1517836357463-d25dfeac3438", "Nouveau", "4,6", 8),
    ("Jeu de construction créatif", "Jouets et jeux", 11900, "photo-1587654780291-39c9404d746b", "", "4,8", 19),
    ("Coffret premier éveil bébé", "Bébé et puériculture", 16500, "photo-1519689680058-324335c77eba", "", "4,9", 13),
    ("Carnet créatif & crayons", "Livres et fournitures scolaires", 7200, "photo-1455390582262-044cdead277a", "Indispensable", "4,7", 16),
    ("Support téléphone voiture", "Automobile et accessoires", 8500, "photo-1503376780353-7e6692767b70", "", "4,5", 10),
    ("Kit jardinage balcon", "Bricolage et jardinage", 13900, "photo-1416879595882-3373a0480b5b", "", "4,8", 7),
    ("Couchage douillet pour animal", "Animaux et accessoires", 17500, "photo-1548199973-03cce0bbc87b", "", "4,9", 22),
    ("Bracelet doré Luma", "Bijoux et montres", 14900, "photo-1611652022419-a9419f74343d", "Édition locale", "4,8", 20),
    ("Bougie parfumée artisanale", "Autres produits", 7900, "photo-1603006905003-be475563bc59", "", "4,7", 6),
]


def get_db():
    if "database" not in g:
        connection = sqlite3.connect(
            str(current_database_path()), timeout=10, isolation_level=None
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        g.database = connection
    return g.database


def current_database_path():
    return Path(current_app.config["DATABASE"])


def init_db():
    database_path = current_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with get_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                icon TEXT NOT NULL DEFAULT '✨',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
                price INTEGER NOT NULL CHECK (price > 0),
                image TEXT NOT NULL,
                badge TEXT NOT NULL DEFAULT '',
                rating TEXT NOT NULL DEFAULT '',
                reviews INTEGER NOT NULL DEFAULT 0 CHECK (reviews >= 0),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS inquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL CHECK (kind IN ('contact', 'information', 'seller')),
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL DEFAULT '',
                is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS submission_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_submission_events_created_at
                ON submission_events(created_at);
            CREATE INDEX IF NOT EXISTS idx_inquiries_created_at
                ON inquiries(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_products_category
                ON products(category_id);

            CREATE TABLE IF NOT EXISTS admin_login_attempts (
                ip_hash TEXT PRIMARY KEY,
                failures INTEGER NOT NULL,
                window_started INTEGER NOT NULL,
                locked_until INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        category_count = connection.execute(
            "SELECT COUNT(*) FROM categories"
        ).fetchone()[0]
        if category_count == 0:
            connection.executemany(
                "INSERT INTO categories (name, icon) VALUES (?, ?)", CATEGORY_SEED
            )

        product_count = connection.execute(
            "SELECT COUNT(*) FROM products"
        ).fetchone()[0]
        if product_count == 0:
            connection.executemany(
                """
                INSERT INTO products
                    (name, category_id, price, image, badge, rating, reviews)
                SELECT ?, categories.id, ?, ?, ?, ?, ?
                FROM categories
                WHERE categories.name = ?
                """,
                [
                    (name, price, image, badge, rating, reviews, category)
                    for name, category, price, image, badge, rating, reviews in PRODUCT_SEED
                ],
            )


def row_to_dict(row):
    return dict(row) if row is not None else None


def _client_hash():
    address = request.remote_addr or "unknown"
    secret = current_app.config["SECRET_KEY"].encode("utf-8")
    return hmac.new(secret, address.encode("utf-8"), hashlib.sha256).hexdigest()


def _consume_submission_quota():
    now = int(time.time())
    cutoff = now - 60 * 60
    ip_hash = _client_hash()
    with get_db() as connection:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            "DELETE FROM submission_events WHERE created_at < ?", (cutoff,)
        )
        count = connection.execute(
            "SELECT COUNT(*) FROM submission_events WHERE ip_hash = ? AND created_at >= ?",
            (ip_hash, cutoff),
        ).fetchone()[0]
        if count >= MAX_SUBMISSIONS_PER_HOUR:
            connection.rollback()
            return False
        connection.execute(
            "INSERT INTO submission_events (ip_hash, created_at) VALUES (?, ?)",
            (ip_hash, now),
        )
        connection.commit()
    return True


def _is_login_locked(ip_hash, now):
    with get_db() as connection:
        row = connection.execute(
            "SELECT failures, window_started, locked_until "
            "FROM admin_login_attempts WHERE ip_hash = ?",
            (ip_hash,),
        ).fetchone()
    if row is None:
        return False
    return row["locked_until"] > now


def _record_login_failure(ip_hash, now):
    with get_db() as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT failures, window_started, locked_until "
            "FROM admin_login_attempts WHERE ip_hash = ?",
            (ip_hash,),
        ).fetchone()

        if (
            row is None
            or (row["locked_until"] > 0 and row["locked_until"] <= now)
            or row["window_started"] < now - LOGIN_WINDOW_SECONDS
        ):
            failures = 1
            window_started = now
        else:
            failures = row["failures"] + 1
            window_started = row["window_started"]

        locked_until = now + LOGIN_LOCK_SECONDS if failures >= MAX_LOGIN_ATTEMPTS else 0
        connection.execute(
            """
            INSERT INTO admin_login_attempts
                (ip_hash, failures, window_started, locked_until)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(ip_hash) DO UPDATE SET
                failures = excluded.failures,
                window_started = excluded.window_started,
                locked_until = excluded.locked_until
            """,
            (ip_hash, failures, window_started, locked_until),
        )
        connection.commit()


def _clear_login_failures(ip_hash):
    with get_db() as connection:
        connection.execute(
            "DELETE FROM admin_login_attempts WHERE ip_hash = ?", (ip_hash,)
        )


def _csrf_token():
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


def _valid_csrf_token():
    expected = session.get("_csrf_token", "")
    supplied = request.form.get("_csrf_token", "")
    return bool(expected and supplied and hmac.compare_digest(expected, supplied))


def _admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_authenticated"):
            return redirect(url_for("admin_login"))
        return view(*args, **kwargs)

    return wrapped


def _parse_product(data):
    name = str(data.get("name", "")).strip()
    category_name = str(data.get("category", "")).strip()
    raw_price = str(data.get("price", "")).strip()
    image = str(data.get("image", "")).strip()
    badge = str(data.get("badge", "")).strip()

    if not name or len(name) > 120:
        return None, "Le nom du produit doit contenir entre 1 et 120 caractères."
    if not category_name or len(category_name) > 100:
        return None, "Choisissez une catégorie valide."
    if not re.fullmatch(r"[0-9]{1,9}", raw_price) or int(raw_price) < 1:
        return None, "Le prix doit être un nombre positif en FCFA."
    if not IMAGE_ID_PATTERN.fullmatch(image):
        return None, "L’image doit utiliser un identifiant photo Unsplash valide."
    if len(badge) > 30:
        return None, "Le badge ne peut pas dépasser 30 caractères."

    with get_db() as connection:
        category = connection.execute(
            "SELECT id FROM categories WHERE name = ?", (category_name,)
        ).fetchone()
    if category is None:
        return None, "Cette catégorie n’existe pas."

    return {
        "name": name,
        "category_id": category["id"],
        "price": int(raw_price),
        "image": image,
        "badge": badge,
    }, None


def _parse_category(data):
    name = str(data.get("name", "")).strip()
    icon = str(data.get("icon", "✨")).strip()
    if not name or len(name) > 100:
        return None, "Le nom de la catégorie doit contenir entre 1 et 100 caractères."
    if not icon or len(icon) > 8:
        return None, "L’icône de la catégorie n’est pas valide."
    return {"name": name, "icon": icon}, None


def _configured_admin_exists():
    if current_app.config["ADMIN_PASSWORD"]:
        return True
    with get_db() as connection:
        return connection.execute(
            "SELECT 1 FROM admin_users LIMIT 1"
        ).fetchone() is not None


def create_app(test_config=None):
    app = Flask(__name__, static_folder=None)
    default_database = Path(
        os.environ.get(
            "MARKETCI_DATABASE",
            str(PROJECT_DIR / "instance" / "marketci.sqlite3"),
        )
    )
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("MARKETCI_SECRET_KEY"),
        ADMIN_USERNAME=os.environ.get("MARKETCI_ADMIN_USERNAME", "admin"),
        ADMIN_PASSWORD=os.environ.get("MARKETCI_ADMIN_PASSWORD"),
        DATABASE=str(default_database),
        MAX_CONTENT_LENGTH=16 * 1024,
        PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("MARKETCI_ENV") == "production",
        ENVIRONMENT=os.environ.get("MARKETCI_ENV", "development"),
    )
    if test_config:
        app.config.update(test_config)
    if not app.config["SECRET_KEY"]:
        if app.config["ENVIRONMENT"] == "production":
            raise RuntimeError("MARKETCI_SECRET_KEY doit être défini en production.")
        app.config["SECRET_KEY"] = secrets.token_urlsafe(32)
    if app.config["ENVIRONMENT"] == "production":
        if len(app.config["SECRET_KEY"]) < 32:
            raise RuntimeError("MARKETCI_SECRET_KEY doit contenir au moins 32 caractères.")
        admin_password = app.config["ADMIN_PASSWORD"]
        if not admin_password or len(admin_password) < 16:
            raise RuntimeError(
                "MARKETCI_ADMIN_PASSWORD doit contenir au moins 16 caractères en production."
            )

    @app.teardown_appcontext
    def close_db(_error):
        connection = g.pop("database", None)
        if connection is not None:
            connection.close()

    with app.app_context():
        init_db()

    @app.after_request
    def set_response_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' https://images.unsplash.com data:; "
            "style-src 'self' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "script-src 'self'; connect-src 'self'; "
            "form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
        )
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        if current_app.config["ENVIRONMENT"] == "production":
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000"
            )
        return response

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify({"error": "La demande est trop volumineuse."}), 413

    @app.errorhandler(404)
    def page_not_found(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Ressource introuvable."}), 404
        return "Page introuvable.", 404

    @app.get("/")
    def home():
        return send_from_directory(PROJECT_DIR, "index.html")

    @app.get("/<page>.html")
    def public_page(page):
        if page not in PUBLIC_PAGES:
            abort(404)
        return send_from_directory(PROJECT_DIR, f"{page}.html")

    @app.get("/<path:filename>")
    def public_asset(filename):
        if filename not in STATIC_FILES:
            abort(404)
        return send_from_directory(PROJECT_DIR, filename)

    @app.get("/api/health")
    def health():
        with get_db() as connection:
            count = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        return jsonify({"status": "ok", "products": count})

    @app.get("/api/categories")
    def categories_api():
        with get_db() as connection:
            rows = connection.execute(
                "SELECT name, icon FROM categories ORDER BY id"
            ).fetchall()
        return jsonify({"items": [row_to_dict(row) for row in rows]})

    @app.get("/api/products")
    def products_api():
        query = request.args.get("q", "").strip()
        category = request.args.get("category", "").strip()
        sort = request.args.get("sort", "featured").strip()
        if len(query) > 120:
            return jsonify({"error": "La recherche ne peut pas dépasser 120 caractères."}), 400
        if sort not in {"featured", "price-asc", "price-desc"}:
            return jsonify({"error": "Le tri demandé n’est pas valide."}), 400

        clauses = []
        parameters = []
        if query:
            escaped_query = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            clauses.append(
                "(products.name LIKE ? ESCAPE '\\' OR categories.name LIKE ? ESCAPE '\\')"
            )
            search_term = f"%{escaped_query}%"
            parameters.extend([search_term, search_term])
        if category and category != "all":
            clauses.append("categories.name = ?")
            parameters.append(category)
        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        order_clause = {
            "featured": "products.id",
            "price-asc": "products.price, products.id",
            "price-desc": "products.price DESC, products.id",
        }[sort]

        with get_db() as connection:
            total = connection.execute(
                f"""
                SELECT COUNT(*)
                FROM products
                JOIN categories ON categories.id = products.category_id
                {where_clause}
                """,
                parameters,
            ).fetchone()[0]
            rows = connection.execute(
                f"""
                SELECT products.id, products.name, categories.name AS category,
                    products.price, products.image, products.badge,
                    products.rating, products.reviews
                FROM products
                JOIN categories ON categories.id = products.category_id
                {where_clause}
                ORDER BY {order_clause}
                LIMIT 100
                """,
                parameters,
            ).fetchall()

        return jsonify({"items": [row_to_dict(row) for row in rows], "total": total})

    @app.post("/api/inquiries")
    def create_inquiry():
        if not request.is_json:
            return jsonify({"error": "Envoyez les données du formulaire au format JSON."}), 415
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({"error": "Le contenu de la demande doit être un objet JSON."}), 400
        if data.get("website"):
            return jsonify({"message": "Merci pour votre demande."}), 201

        kind = str(data.get("kind", "")).strip()
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        subject = str(data.get("subject", "")).strip()
        message = str(data.get("message", "")).strip()

        if kind not in INQUIRY_TYPES:
            return jsonify({"error": "Le type de demande n’est pas valide."}), 400
        if not name or len(name) > 100:
            return jsonify({"error": "Le nom est obligatoire et limité à 100 caractères."}), 400
        if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
            return jsonify({"error": "Saisissez une adresse e-mail valide."}), 400
        if not subject or len(subject) > 120:
            return jsonify({"error": "Le sujet est obligatoire et limité à 120 caractères."}), 400
        if len(message) > 5000:
            return jsonify({"error": "Le message ne peut pas dépasser 5 000 caractères."}), 400
        if not _consume_submission_quota():
            return jsonify(
                {"error": "Trop de demandes depuis cette connexion. Réessayez plus tard."}
            ), 429

        with get_db() as connection:
            cursor = connection.execute(
                """
                INSERT INTO inquiries (kind, name, email, subject, message)
                VALUES (?, ?, ?, ?, ?)
                """,
                (kind, name, email, subject, message),
            )
            inquiry_id = cursor.lastrowid

        return jsonify(
            {"message": "Votre demande a bien été envoyée.", "id": inquiry_id}
        ), 201

    @app.get("/admin/login")
    def admin_login():
        if session.get("admin_authenticated"):
            return redirect(url_for("admin_dashboard"))
        if not _configured_admin_exists():
            return render_template(
                "admin.html", page="setup", csrf_token=_csrf_token()
            )
        return render_template("admin.html", page="login", csrf_token=_csrf_token())

    @app.post("/admin/setup")
    def admin_setup_post():
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        if _configured_admin_exists():
            return redirect(url_for("admin_login"))

        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirmation = request.form.get("password_confirmation", "")

        if not re.fullmatch(r"[A-Za-z0-9._-]{3,50}", username):
            return render_template(
                "admin.html",
                page="setup",
                csrf_token=_csrf_token(),
                error="Choisissez un identifiant de 3 à 50 caractères (lettres, chiffres, point, tiret ou soulignement).",
            ), 400
        if len(password) < 12:
            return render_template(
                "admin.html",
                page="setup",
                csrf_token=_csrf_token(),
                error="Le mot de passe doit contenir au moins 12 caractères.",
            ), 400
        if len(password) > 1024:
            return render_template(
                "admin.html",
                page="setup",
                csrf_token=_csrf_token(),
                error="Le mot de passe est trop long.",
            ), 400
        if not hmac.compare_digest(password, confirmation):
            return render_template(
                "admin.html",
                page="setup",
                csrf_token=_csrf_token(),
                error="Les deux mots de passe ne correspondent pas.",
            ), 400

        with get_db() as connection:
            connection.execute("BEGIN IMMEDIATE")
            existing_admin = connection.execute(
                "SELECT 1 FROM admin_users LIMIT 1"
            ).fetchone()
            if existing_admin:
                connection.rollback()
                return redirect(url_for("admin_login"))
            connection.execute(
                "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
                (username, generate_password_hash(password)),
            )
            connection.commit()

        session.clear()
        session["admin_authenticated"] = True
        session["admin_username"] = username
        session["_csrf_token"] = secrets.token_urlsafe(32)
        session.permanent = True
        return redirect(url_for("admin_dashboard"))

    @app.post("/admin/login")
    def admin_login_post():
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")

        configured_password = app.config["ADMIN_PASSWORD"]

        now = int(time.time())
        ip_hash = _client_hash()
        if _is_login_locked(ip_hash, now):
            return render_template(
                "admin.html",
                page="login",
                csrf_token=_csrf_token(),
                error="Trop de tentatives. Réessayez dans quelques minutes.",
            ), 429

        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if configured_password:
            valid_username = hmac.compare_digest(
                username.encode("utf-8"),
                app.config["ADMIN_USERNAME"].encode("utf-8"),
            )
            valid_password = hmac.compare_digest(
                password.encode("utf-8"), configured_password.encode("utf-8")
            )
        else:
            with get_db() as connection:
                admin_user = connection.execute(
                    "SELECT username, password_hash FROM admin_users WHERE username = ?",
                    (username,),
                ).fetchone()
            valid_username = admin_user is not None
            valid_password = (
                check_password_hash(admin_user["password_hash"], password)
                if admin_user
                else check_password_hash(
                    generate_password_hash("invalid-account-timing-protection"),
                    password,
                )
            )
            if admin_user is None:
                valid_username = False

        if not valid_username or not valid_password:
            _record_login_failure(ip_hash, now)
            return render_template(
                "admin.html",
                page="login",
                csrf_token=_csrf_token(),
                error="Identifiant ou mot de passe incorrect.",
            ), 401

        _clear_login_failures(ip_hash)
        session.clear()
        session["admin_authenticated"] = True
        session["admin_username"] = username
        session["_csrf_token"] = secrets.token_urlsafe(32)
        session.permanent = True
        return redirect(url_for("admin_dashboard"))

    @app.get("/admin")
    @_admin_required
    def admin_dashboard():
        with get_db() as connection:
            categories = connection.execute(
                """
                SELECT categories.id, categories.name, categories.icon,
                    COUNT(products.id) AS product_count
                FROM categories
                LEFT JOIN products ON products.category_id = categories.id
                GROUP BY categories.id
                ORDER BY categories.name COLLATE NOCASE
                """
            ).fetchall()
            products = connection.execute(
                """
                SELECT products.id, products.name, products.price, products.image,
                    products.badge, categories.name AS category
                FROM products
                JOIN categories ON categories.id = products.category_id
                ORDER BY products.id DESC
                """
            ).fetchall()
            inquiries = connection.execute(
                """
                SELECT id, kind, name, email, subject, message, is_read, created_at
                FROM inquiries
                ORDER BY is_read ASC, created_at DESC
                LIMIT 200
                """
            ).fetchall()
        return render_template(
            "admin.html",
            page="dashboard",
            categories=categories,
            products=products,
            inquiries=inquiries,
            csrf_token=_csrf_token(),
        )

    @app.post("/admin/products")
    @_admin_required
    def admin_create_product():
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        product, error = _parse_product(request.form)
        if error:
            flash(error, "error")
        else:
            with get_db() as connection:
                connection.execute(
                    """
                    INSERT INTO products (name, category_id, price, image, badge)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        product["name"],
                        product["category_id"],
                        product["price"],
                        product["image"],
                        product["badge"],
                    ),
                )
            flash("Le produit a été ajouté.", "success")
        return redirect(url_for("admin_dashboard") + "#products")

    @app.post("/admin/products/<int:product_id>/edit")
    @_admin_required
    def admin_edit_product(product_id):
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        product, error = _parse_product(request.form)
        if error:
            flash(error, "error")
        else:
            with get_db() as connection:
                cursor = connection.execute(
                    """
                    UPDATE products
                    SET name = ?, category_id = ?, price = ?, image = ?, badge = ?
                    WHERE id = ?
                    """,
                    (
                        product["name"],
                        product["category_id"],
                        product["price"],
                        product["image"],
                        product["badge"],
                        product_id,
                    ),
                )
            flash(
                "Le produit a été modifié."
                if cursor.rowcount
                else "Ce produit n’existe plus.",
                "success" if cursor.rowcount else "error",
            )
        return redirect(url_for("admin_dashboard") + "#products")

    @app.post("/admin/products/<int:product_id>/delete")
    @_admin_required
    def admin_delete_product(product_id):
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        with get_db() as connection:
            cursor = connection.execute("DELETE FROM products WHERE id = ?", (product_id,))
        flash(
            "Le produit a été supprimé."
            if cursor.rowcount
            else "Ce produit n’existe plus.",
            "success" if cursor.rowcount else "error",
        )
        return redirect(url_for("admin_dashboard") + "#products")

    @app.post("/admin/categories")
    @_admin_required
    def admin_create_category():
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        category, error = _parse_category(request.form)
        if error:
            flash(error, "error")
        else:
            try:
                with get_db() as connection:
                    connection.execute(
                        "INSERT INTO categories (name, icon) VALUES (?, ?)",
                        (category["name"], category["icon"]),
                    )
                flash("La catégorie a été ajoutée.", "success")
            except sqlite3.IntegrityError:
                flash("Cette catégorie existe déjà.", "error")
        return redirect(url_for("admin_dashboard") + "#categories")

    @app.post("/admin/categories/<int:category_id>/edit")
    @_admin_required
    def admin_edit_category(category_id):
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        category, error = _parse_category(request.form)
        if error:
            flash(error, "error")
        else:
            try:
                with get_db() as connection:
                    cursor = connection.execute(
                        "UPDATE categories SET name = ?, icon = ? WHERE id = ?",
                        (category["name"], category["icon"], category_id),
                    )
                flash(
                    "La catégorie a été modifiée."
                    if cursor.rowcount
                    else "Cette catégorie n’existe plus.",
                    "success" if cursor.rowcount else "error",
                )
            except sqlite3.IntegrityError:
                flash("Une catégorie porte déjà ce nom.", "error")
        return redirect(url_for("admin_dashboard") + "#categories")

    @app.post("/admin/categories/<int:category_id>/delete")
    @_admin_required
    def admin_delete_category(category_id):
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        try:
            with get_db() as connection:
                cursor = connection.execute(
                    "DELETE FROM categories WHERE id = ?", (category_id,)
                )
            flash(
                "La catégorie a été supprimée."
                if cursor.rowcount
                else "Cette catégorie n’existe plus.",
                "success" if cursor.rowcount else "error",
            )
        except sqlite3.IntegrityError:
            flash(
                "Supprimez ou déplacez d’abord les produits associés à cette catégorie.",
                "error",
            )
        return redirect(url_for("admin_dashboard") + "#categories")

    @app.post("/admin/inquiries/<int:inquiry_id>/read")
    @_admin_required
    def admin_mark_inquiry_read(inquiry_id):
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        with get_db() as connection:
            connection.execute(
                "UPDATE inquiries SET is_read = 1 WHERE id = ?", (inquiry_id,)
            )
        return redirect(url_for("admin_dashboard") + "#inquiries")

    @app.post("/admin/logout")
    @_admin_required
    def admin_logout():
        if not _valid_csrf_token():
            abort(400, description="Le formulaire a expiré. Rechargez la page.")
        session.clear()
        return redirect(url_for("admin_login"))

    @app.cli.command("init-db")
    def init_db_command():
        init_db()
        print("Base de données MarketCI initialisée.")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.environ.get("MARKETCI_HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
    )
