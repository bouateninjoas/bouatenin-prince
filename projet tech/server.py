import hashlib
import ipaddress
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = Path(os.environ.get("PC_MARKET_DATABASE", BASE_DIR / "pc-market.sqlite3"))
HOST = os.environ.get("PC_MARKET_HOST", "0.0.0.0" if os.environ.get("K_SERVICE") else "127.0.0.1")
PORT = int(os.environ.get("PC_MARKET_PORT", os.environ.get("PORT", "8000")))
COOKIE_NAME = "pc_market_session"
SESSION_SECONDS = 7 * 24 * 60 * 60
PASSWORD_MIN_LENGTH = 10
PASSWORD_MAX_LENGTH = 128
PASSWORD_SCRYPT_N = 2**14
MAX_BODY_BYTES = 8192
PHONE_PATTERN = re.compile(r"\+?[0-9][0-9\s().-]{6,24}\Z")
RATE_LIMIT_SECONDS = 15 * 60
RATE_LIMITS = {"login": 10, "register": 5}
CINETPAY_API_URL = "https://api-checkout.cinetpay.com/v2"
PAYMENT_PRODUCTS = {
    "toshiba-chromebook": 200000,
    "fujitsu-lifebook": 200000,
    "samsung-galaxy-book": 200000,
    "sony-vaio-fit": 200000,
    "chuwi-corebook": 200000,
    "lenovo-thinkpad-x395": 200000,
    "medion-akoya": 200000,
    "honor-hunter": 200000,
    "razer-blade": 200000,
    "gigabyte-aero": 200000,
    "thinkpad-dock": 145000,
    "dell-inspiron-15": 200000,
    "lenovo-thinkpad-t480": 200000,
    "dell-latitude-5420": 200000,
    "dell-optiplex-micro": 200000,
    "hp-prodesk-mini": 200000,
    "dell-ms116-mouse": 8000,
    "lenovo-300-usb-mouse": 8000,
    "aoa-b1001-wireless-mouse": 8000,
    "wireless-mouse-led": 8000,
    "usb-c-hdmi-8-in-1": 10000,
    "usb-c-adapter-6-in-1": 10000,
    "hp-pavilion-15": 200000,
    "asus-vivobook-15": 200000,
    "acer-aspire-5": 200000,
    "apple-macbook-air": 200000,
    "msi-modern-15": 200000,
    "huawei-matebook-d15": 200000,
    "microsoft-surface-laptop": 200000,
    "soyo-m5-air": 200000,
    "surface-laptop-4": 350000,
    "dell-latitude-7200-2-in-1": 250000,
}


class PaymentProviderError(Exception):
    pass


class WhatsAppProviderError(Exception):
    pass


def send_order_confirmation_whatsapp(phone, order_id, delivery_area):
    access_token = os.environ.get("WHATSAPP_ACCESS_TOKEN", "").strip()
    phone_number_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    template_name = os.environ.get("WHATSAPP_ORDER_TEMPLATE", "order_delivery_confirmation").strip()
    template_language = os.environ.get("WHATSAPP_TEMPLATE_LANGUAGE", "fr").strip()
    api_version = os.environ.get("WHATSAPP_GRAPH_API_VERSION", "v23.0").strip()
    if not access_token or not phone_number_id:
        raise WhatsAppProviderError("La messagerie WhatsApp Business n’est pas configurée.")
    if (
        not re.fullmatch(r"[A-Za-z0-9_-]{1,512}", phone_number_id)
        or not re.fullmatch(r"[a-z0-9_]{1,512}", template_name)
        or not re.fullmatch(r"[a-z]{2,3}(?:_[A-Z]{2})?", template_language)
        or not re.fullmatch(r"v[0-9]{1,3}\.[0-9]{1,2}", api_version)
    ):
        raise WhatsAppProviderError("La configuration WhatsApp Business est invalide.")

    recipient = phone.lstrip("+")
    if not recipient.isdecimal() or not 8 <= len(recipient) <= 15:
        raise WhatsAppProviderError("Le numéro du client doit être au format international.")

    request_payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": template_language},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": order_id},
                        {"type": "text", "text": delivery_area},
                    ],
                }
            ],
        },
    }
    request = Request(
        f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            result = json.loads(response.read())
    except HTTPError as error:
        error.close()
        raise WhatsAppProviderError("WhatsApp Business a refusé l’envoi du message.") from None
    except (URLError, TimeoutError, OSError) as error:
        raise WhatsAppProviderError("WhatsApp Business est momentanément injoignable.") from error
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise WhatsAppProviderError("La réponse de WhatsApp Business est invalide.") from error
    if not isinstance(result, dict):
        raise WhatsAppProviderError("La réponse de WhatsApp Business est invalide.")
    messages = result.get("messages")
    message_id = messages[0].get("id") if isinstance(messages, list) and messages and isinstance(messages[0], dict) else None
    if not isinstance(message_id, str) or not message_id:
        raise WhatsAppProviderError("WhatsApp Business n’a pas confirmé la prise en charge du message.")
    return message_id


@contextmanager
def database_connection():
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if database_url:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as error:
            raise RuntimeError("DATABASE_URL nécessite le paquet psycopg.") from error
        connection = psycopg.connect(database_url, row_factory=dict_row, connect_timeout=10)
        try:
            with connection:
                yield PostgresConnection(connection)
        finally:
            connection.close()
        return

    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


class PostgresConnection:
    def __init__(self, connection):
        self.connection = connection

    def execute(self, query, parameters=()):
        return self.connection.execute(query.replace("?", "%s"), parameters)


def database_integrity_errors():
    errors = (sqlite3.IntegrityError,)
    try:
        import psycopg
    except ImportError:
        return errors
    return errors + (psycopg.errors.UniqueViolation,)


def initialize_database():
    if os.environ.get("DATABASE_URL", "").strip():
        with database_connection() as connection:
            for statement in (
                """
                CREATE TABLE IF NOT EXISTS users (
                    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    phone TEXT NOT NULL UNIQUE,
                    password_salt BYTEA NOT NULL,
                    password_hash BYTEA NOT NULL,
                    created_at BIGINT NOT NULL
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at BIGINT NOT NULL
                )
                """,
                "CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at)",
                """
                CREATE TABLE IF NOT EXISTS auth_attempts (
                    client_hash TEXT NOT NULL,
                    action TEXT NOT NULL,
                    attempted_at BIGINT NOT NULL
                )
                """,
                """
                CREATE INDEX IF NOT EXISTS auth_attempts_client_idx
                    ON auth_attempts(client_hash, action, attempted_at)
                """,
                "CREATE INDEX IF NOT EXISTS auth_attempts_expiry_idx ON auth_attempts(attempted_at)",
                """
                CREATE TABLE IF NOT EXISTS orders (
                    transaction_id TEXT PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    amount BIGINT NOT NULL,
                    currency TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at BIGINT NOT NULL,
                    updated_at BIGINT NOT NULL
                )
                """,
                "CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at)",
                """
                CREATE TABLE IF NOT EXISTS customer_orders (
                    order_id TEXT PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    amount BIGINT NOT NULL,
                    currency TEXT NOT NULL,
                    delivery_area TEXT NOT NULL,
                    items_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at BIGINT NOT NULL
                )
                """,
                "CREATE INDEX IF NOT EXISTS customer_orders_user_idx ON customer_orders(user_id, created_at)",
                """
                CREATE TABLE IF NOT EXISTS customer_order_messages (
                    order_id TEXT PRIMARY KEY REFERENCES customer_orders(order_id) ON DELETE CASCADE,
                    recipient_phone TEXT NOT NULL,
                    opted_in_at BIGINT NOT NULL,
                    status TEXT NOT NULL,
                    provider_message_id TEXT,
                    error_message TEXT,
                    updated_at BIGINT NOT NULL
                )
                """,
            ):
                connection.execute(statement)
        return

    with database_connection() as connection:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                phone TEXT NOT NULL UNIQUE,
                password_salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
            CREATE TABLE IF NOT EXISTS auth_attempts (
                client_hash TEXT NOT NULL,
                action TEXT NOT NULL,
                attempted_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS auth_attempts_client_idx
                ON auth_attempts(client_hash, action, attempted_at);
            CREATE INDEX IF NOT EXISTS auth_attempts_expiry_idx ON auth_attempts(attempted_at);
            CREATE TABLE IF NOT EXISTS orders (
                transaction_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL,
                currency TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at);
            CREATE TABLE IF NOT EXISTS customer_orders (
                order_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL,
                currency TEXT NOT NULL,
                delivery_area TEXT NOT NULL,
                items_json TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS customer_orders_user_idx ON customer_orders(user_id, created_at);
            CREATE TABLE IF NOT EXISTS customer_order_messages (
                order_id TEXT PRIMARY KEY REFERENCES customer_orders(order_id) ON DELETE CASCADE,
                recipient_phone TEXT NOT NULL,
                opted_in_at INTEGER NOT NULL,
                status TEXT NOT NULL,
                provider_message_id TEXT,
                error_message TEXT,
                updated_at INTEGER NOT NULL
            );
            """
        )


def normalize_phone(value):
    if not isinstance(value, str):
        raise ValueError("Numéro de téléphone invalide.")
    value = value.strip()
    if len(value) > 26 or not PHONE_PATTERN.fullmatch(value):
        raise ValueError("Numéro de téléphone invalide.")
    digits = re.sub(r"\D", "", value)
    if not 8 <= len(digits) <= 15:
        raise ValueError("Numéro de téléphone invalide.")
    return f"+{digits}"


def password_digest(password, salt):
    return hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=PASSWORD_SCRYPT_N,
        r=8,
        p=1,
        dklen=64,
    )


def token_digest(token):
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def validate_order_items(items):
    if not isinstance(items, list) or not 1 <= len(items) <= 20:
        raise ValueError("Le panier est vide ou invalide.")

    validated_items = []
    total = 0
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Un article du panier est invalide.")
        product_id = item.get("id")
        quantity = item.get("quantity")
        if (
            not isinstance(product_id, str)
            or not isinstance(quantity, int)
            or isinstance(quantity, bool)
            or not 1 <= quantity <= 10
        ):
            raise ValueError("Un article du panier est invalide.")
        price = PAYMENT_PRODUCTS.get(product_id)
        if price is None and re.fullmatch(r"api-[1-9][0-9]{0,8}", product_id):
            price = 200000
        if price is None:
            raise ValueError("Un article du panier n’est pas disponible.")
        validated_items.append({"id": product_id, "quantity": quantity, "unit_price": price})
        total += price * quantity

    if total <= 0 or total > 50000000:
        raise ValueError("Le montant du panier est invalide.")
    return validated_items, total


def normalize_delivery_area(value):
    if not isinstance(value, str):
        raise ValueError("Indique ta commune ou ton quartier.")
    value = value.strip()
    if not 2 <= len(value) <= 120 or any(ord(character) < 32 for character in value):
        raise ValueError("La commune ou le quartier doit contenir entre 2 et 120 caractères.")
    return value


def configured_public_origin():
    return (
        os.environ.get("PC_MARKET_ORIGIN", "").strip()
        or os.environ.get("RENDER_EXTERNAL_URL", "").strip()
    ).rstrip("/")


def validate_deployment_config(host, public_origin, secure_cookie, production):
    try:
        public_bind = not ipaddress.ip_address(host).is_loopback
    except ValueError:
        public_bind = host.lower() != "localhost"
    origin = urlsplit(public_origin)
    valid_https_origin = (
        origin.scheme == "https"
        and bool(origin.netloc)
        and origin.username is None
        and origin.password is None
        and origin.path in ("", "/")
        and not origin.query
        and not origin.fragment
    )
    if (production or public_bind) and (not valid_https_origin or not secure_cookie):
        raise RuntimeError(
            "Un déploiement public exige PC_MARKET_ORIGIN en HTTPS et PC_MARKET_COOKIE_SECURE=1."
        )


def cinetpay_request(endpoint, payload):
    request = Request(
        f"{CINETPAY_API_URL}/{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            result = json.loads(response.read(1024 * 1024))
    except HTTPError as error:
        raise PaymentProviderError("CinetPay a refusé la requête.") from error
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        raise PaymentProviderError("Le service CinetPay est temporairement injoignable.") from error
    if not isinstance(result, dict):
        raise PaymentProviderError("Réponse CinetPay invalide.")
    return result


class PCMarketServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class PCMarketHandler(BaseHTTPRequestHandler):
    server_version = "PCMarket"
    sys_version = ""

    def _send(self, status, body=b"", content_type="text/plain; charset=utf-8", headers=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' "
            "https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' https://images.unsplash.com data:; "
            "connect-src 'self' https://dummyjson.com; object-src 'none'; "
            "base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
        )
        if os.environ.get("PC_MARKET_COOKIE_SECURE") == "1":
            self.send_header("Strict-Transport-Security", "max-age=31536000")
        if headers:
            for name, value in headers.items():
                self.send_header(name, value)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _json(self, status, payload, cookie=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {}
        if cookie is not None:
            headers["Set-Cookie"] = self._auth_cookie_header(cookie)
        self._send(status, body, "application/json; charset=utf-8", headers)

    def _error(self, status, message):
        self._json(status, {"error": message})

    def _path(self):
        return urlsplit(self.path).path

    def _expected_origin(self):
        configured_origin = configured_public_origin()
        if configured_origin:
            return configured_origin
        host = self.headers.get("Host", "")
        return f"http://{host}" if host else ""

    def _valid_origin(self):
        origin = self.headers.get("Origin")
        return origin is not None and origin.rstrip("/") == self._expected_origin()

    def _request_json(self):
        if self.headers.get_content_type() != "application/json":
            self._error(415, "Le contenu doit être au format JSON.")
            return None
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._error(400, "Requête invalide.")
            return None
        if length < 1 or length > MAX_BODY_BYTES:
            self._error(413 if length > MAX_BODY_BYTES else 400, "Taille de requête invalide.")
            return None
        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._error(400, "Requête JSON invalide.")
            return None
        if not isinstance(payload, dict):
            self._error(400, "Requête invalide.")
            return None
        return payload

    def _session(self):
        try:
            cookies = SimpleCookie(self.headers.get("Cookie", ""))
        except CookieError:
            return None, None
        morsel = cookies.get(COOKIE_NAME)
        if morsel is None or not 20 <= len(morsel.value) <= 128 or not morsel.value.isascii():
            return None, None
        token = morsel.value
        with database_connection() as connection:
            user = connection.execute(
                """
                SELECT users.id, users.phone
                FROM sessions JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.expires_at > ?
                """,
                (token_digest(token), int(time.time())),
            ).fetchone()
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
        return user, token

    def _create_session(self, user_id):
        token = secrets.token_urlsafe(32)
        with database_connection() as connection:
            connection.execute(
                "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                (token_digest(token), user_id, int(time.time()) + SESSION_SECONDS),
            )
        return token

    def _rate_limited(self, action):
        now = int(time.time())
        client_hash = hashlib.sha256(self.client_address[0].encode("utf-8")).hexdigest()
        with database_connection() as connection:
            connection.execute(
                "DELETE FROM auth_attempts WHERE attempted_at <= ?",
                (now - RATE_LIMIT_SECONDS,),
            )
            attempts = connection.execute(
                """
                SELECT COUNT(*) AS attempts FROM auth_attempts
                WHERE client_hash = ? AND action = ? AND attempted_at > ?
                """,
                (client_hash, action, now - RATE_LIMIT_SECONDS),
            ).fetchone()["attempts"]
            if attempts >= RATE_LIMITS[action]:
                return True
            connection.execute(
                "INSERT INTO auth_attempts(client_hash, action, attempted_at) VALUES (?, ?, ?)",
                (client_hash, action, now),
            )
        return False

    def _auth_cookie_header(self, token):
        secure = "; Secure" if os.environ.get("PC_MARKET_COOKIE_SECURE") == "1" else ""
        return (
            f"{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; "
            f"Max-Age={SESSION_SECONDS if token else 0}{secure}"
        )

    def _serve_shop(self):
        self._send(200, (BASE_DIR / "gomycode.HTML").read_bytes(), "text/html; charset=utf-8")

    def do_GET(self):
        path = self._path()
        user, _ = self._session()
        if path == "/":
            self._serve_shop()
            return
        if path == "/auth.html":
            if user is not None:
                self._send(302, b"", headers={"Location": "/gomycode.HTML"})
            else:
                self._send(200, (BASE_DIR / "auth.html").read_bytes(), "text/html; charset=utf-8")
            return
        if path == "/gomycode.HTML":
            self._serve_shop()
            return
        if path == "/payment/return":
            if user is None:
                self._send(302, b"", headers={"Location": "/"})
            else:
                self._serve_shop()
            return
        if path == "/api/auth/me":
            if user is None:
                self._json(200, {"authenticated": False})
            else:
                self._json(200, {"authenticated": True, "user": {"phone": user["phone"]}})
            return
        assets = {
            "/auth.js": ("auth.js", "text/javascript; charset=utf-8"),
            "/auth.css": ("auth.css", "text/css; charset=utf-8"),
            "/lenovo.js": ("lenovo.js", "text/javascript; charset=utf-8"),
            "/lenovo.css": ("lenovo.css", "text/css; charset=utf-8"),
            "/images/lenovo-x395.png": ("images/lenovo-x395.png", "image/png"),
            "/images/soyo-m5-air.jpg": ("images/soyo-m5-air.jpg", "image/jpeg"),
            "/images/surface-laptop-4.jpg": ("images/surface-laptop-4.jpg", "image/jpeg"),
            "/images/dell-latitude-7200-2-in-1.jpg": ("images/dell-latitude-7200-2-in-1.jpg", "image/jpeg"),
            "/images/usb-c-hdmi-8-in-1.jpg": ("images/usb-c-hdmi-8-in-1.jpg", "image/jpeg"),
            "/images/usb-c-adapter-6-in-1.jpg": ("images/usb-c-adapter-6-in-1.jpg", "image/jpeg"),
            "/images/aoa-b1001-wireless-mouse.jpg": ("images/aoa-b1001-wireless-mouse.jpg", "image/jpeg"),
            "/images/wireless-mouse-led.jpg": ("images/wireless-mouse-led.jpg", "image/jpeg"),
        }
        asset = assets.get(path)
        if asset is not None:
            filename, media_type = asset
            self._send(200, (BASE_DIR / filename).read_bytes(), media_type)
            return
        self._error(404, "Page introuvable.")

    def do_POST(self):
        path = self._path()
        auth_actions = {
            "/api/auth/login": "login",
            "/api/auth/register": "register",
            "/api/auth/logout": "logout",
        }
        auth_action = auth_actions.get(path)
        if auth_action is not None:
            if not self._valid_origin():
                self._error(403, "Origine de la requête refusée.")
                return
            if auth_action == "logout":
                _, token = self._session()
                if token:
                    with database_connection() as connection:
                        connection.execute(
                            "DELETE FROM sessions WHERE token_hash = ?",
                            (token_digest(token),),
                        )
                self._json(200, {"ok": True}, cookie="")
                return
            if self._rate_limited(auth_action):
                self._error(
                    429,
                    "Trop de tentatives. Réessaie plus tard.",
                    {"Retry-After": str(RATE_LIMIT_SECONDS)},
                )
                return
            auth_payload = self._request_json()
            if auth_payload is None:
                return
            try:
                phone = normalize_phone(auth_payload.get("phone"))
            except ValueError:
                self._error(400, "Saisis un numéro de téléphone valide.")
                return
            password = auth_payload.get("password")
            if not isinstance(password, str) or not password or len(password) > PASSWORD_MAX_LENGTH:
                self._error(400, f"Le mot de passe doit contenir au maximum {PASSWORD_MAX_LENGTH} caractères.")
                return
            if auth_action == "register":
                if len(password) < PASSWORD_MIN_LENGTH:
                    self._error(400, f"Le mot de passe doit contenir au moins {PASSWORD_MIN_LENGTH} caractères.")
                    return
                salt = secrets.token_bytes(16)
                digest = password_digest(password, salt)
                try:
                    with database_connection() as connection:
                        cursor = connection.execute(
                            """
                            INSERT INTO users(phone, password_salt, password_hash, created_at)
                            VALUES (?, ?, ?, ?)
                            """,
                            (phone, salt, digest, int(time.time())),
                        )
                        if os.environ.get("DATABASE_URL", "").strip():
                            user_id = connection.execute(
                                "SELECT id FROM users WHERE phone = ?",
                                (phone,),
                            ).fetchone()["id"]
                        else:
                            user_id = cursor.lastrowid
                except database_integrity_errors():
                    self._error(409, "Un compte existe déjà avec ce numéro.")
                    return
                self._json(201, {"ok": True}, cookie=self._create_session(user_id))
                return
            with database_connection() as connection:
                account = connection.execute(
                    "SELECT id, password_salt, password_hash FROM users WHERE phone = ?",
                    (phone,),
                ).fetchone()
            salt = account["password_salt"] if account else b"PC Market login salt"
            candidate = password_digest(password, salt)
            expected = account["password_hash"] if account else candidate
            if account is None or not secrets.compare_digest(candidate, expected):
                self._error(401, "Numéro ou mot de passe incorrect.")
                return
            self._json(200, {"ok": True}, cookie=self._create_session(account["id"]))
            return
        if path == "/api/orders":
            if not self._valid_origin():
                self._error(403, "Origine de la requête refusée.")
                return
            user, _ = self._session()
            if user is None:
                self._error(401, "Connecte-toi pour passer une commande.")
                return
            payload = self._request_json()
            if payload is None:
                return
            self._create_customer_order(payload, user)
            return
        if path == "/api/payments/cinetpay/notify":
            self._handle_cinetpay_notification()
            return
        if path not in ("/api/payments/cinetpay", "/api/payments/cinetpay/verify"):
            self._error(404, "Page introuvable.")
            return
        if not self._valid_origin():
            self._error(403, "Origine de la requête refusée.")
            return
        user, _ = self._session()
        if user is None:
            self._error(401, "Connecte-toi avant d’effectuer un paiement.")
            return
        if not os.environ.get("CINETPAY_API_KEY", "").strip() or not os.environ.get("CINETPAY_SITE_ID", "").strip():
            self._error(503, "Le paiement CinetPay n’est pas encore configuré sur le serveur.")
            return
        payload = self._request_json()
        if payload is None:
            return
        if path.endswith("/verify"):
            transaction_id = payload.get("transaction_id")
            if not isinstance(transaction_id, str) or not re.fullmatch(r"[a-f0-9]{32}", transaction_id):
                self._error(400, "Référence de paiement invalide.")
                return
            try:
                status = self._verify_cinetpay_order(transaction_id, user["id"])
            except PaymentProviderError as error:
                self._error(502, str(error))
                return
            if status is None:
                self._error(404, "Commande introuvable.")
                return
            self._json(200, {"status": status})
            return

        self._create_cinetpay_checkout(payload, user)

    def _create_customer_order(self, payload, user):
        try:
            items, total = validate_order_items(payload.get("items"))
            delivery_area = normalize_delivery_area(payload.get("delivery_area"))
        except ValueError as error:
            self._error(400, str(error))
            return
        if payload.get("whatsapp_opt_in") is not True:
            self._error(400, "Accepte la réception du suivi de commande sur WhatsApp.")
            return

        order_id = secrets.token_hex(6).upper()
        created_at = int(time.time())
        with database_connection() as connection:
            connection.execute(
                """
                INSERT INTO customer_orders(
                    order_id, user_id, amount, currency, delivery_area, items_json, status, created_at
                ) VALUES (?, ?, ?, 'XOF', ?, ?, 'PENDING_CONFIRMATION', ?)
                """,
                (order_id, user["id"], total, delivery_area, json.dumps(items), created_at),
            )
            connection.execute(
                """
                INSERT INTO customer_order_messages(
                    order_id, recipient_phone, opted_in_at, status, provider_message_id, error_message, updated_at
                ) VALUES (?, ?, ?, 'PENDING', NULL, NULL, ?)
                """,
                (order_id, user["phone"], created_at, created_at),
            )

        notification_status = "FAILED"
        notification_error = None
        try:
            message_id = send_order_confirmation_whatsapp(user["phone"], order_id, delivery_area)
        except WhatsAppProviderError as error:
            notification_error = str(error)
            print(f"WhatsApp confirmation failed for order {order_id}: {notification_error}")
            with database_connection() as connection:
                connection.execute(
                    """
                    UPDATE customer_order_messages
                    SET status = 'FAILED', error_message = ?, updated_at = ?
                    WHERE order_id = ?
                    """,
                    (notification_error, int(time.time()), order_id),
                )
        else:
            notification_status = "ACCEPTED_BY_PROVIDER"
            sent_at = int(time.time())
            with database_connection() as connection:
                connection.execute(
                    """
                    UPDATE customer_order_messages
                    SET status = 'ACCEPTED_BY_PROVIDER', provider_message_id = ?, error_message = NULL, updated_at = ?
                    WHERE order_id = ?
                    """,
                    (message_id, sent_at, order_id),
                )
                connection.execute(
                    "UPDATE customer_orders SET status = 'ACCEPTED_DELIVERY_24H' WHERE order_id = ?",
                    (order_id,),
                )

        self._json(
            201,
            {
                "order_id": order_id,
                "amount": total,
                "currency": "XOF",
                "delivery_area": delivery_area,
                "status": "ACCEPTED_DELIVERY_24H" if notification_status == "ACCEPTED_BY_PROVIDER" else "PENDING_CONFIRMATION",
                "whatsapp_notification": {
                    "status": notification_status,
                    "error": notification_error,
                },
                "items": items,
            },
        )

    def _verify_cinetpay_order(self, transaction_id, user_id=None):
        query = "SELECT * FROM orders WHERE transaction_id = ?"
        parameters = (transaction_id,)
        if user_id is not None:
            query += " AND user_id = ?"
            parameters = (transaction_id, user_id)
        with database_connection() as connection:
            order = connection.execute(query, parameters).fetchone()
        if order is None:
            return None
        result = cinetpay_request(
            "payment/check",
            {
                "apikey": os.environ["CINETPAY_API_KEY"].strip(),
                "site_id": os.environ["CINETPAY_SITE_ID"].strip(),
                "transaction_id": transaction_id,
            },
        )
        data = result.get("data")
        if result.get("code") != "00" or not isinstance(data, dict):
            raise PaymentProviderError("CinetPay n’a pas pu vérifier cette transaction.")
        reported_amount = data.get("amount")
        if isinstance(reported_amount, bool) or not (
            isinstance(reported_amount, int)
            or isinstance(reported_amount, str) and reported_amount.isdecimal()
        ):
            raise PaymentProviderError("La vérification CinetPay ne contient pas de montant valide.")
        if int(reported_amount) != order["amount"] or data.get("currency") != order["currency"]:
            raise PaymentProviderError("Le montant vérifié ne correspond pas à la commande.")
        status = data.get("status")
        if not isinstance(status, str):
            raise PaymentProviderError("La vérification CinetPay ne contient pas de statut valide.")
        status = status.upper()
        if status not in {"ACCEPTED", "REFUSED", "CANCELLED", "PENDING"}:
            status = "PENDING"
        with database_connection() as connection:
            connection.execute(
                """
                UPDATE orders
                SET status = CASE WHEN status = 'ACCEPTED' THEN status ELSE ? END,
                    updated_at = ?
                WHERE transaction_id = ?
                """,
                (status, int(time.time()), transaction_id),
            )
            saved = connection.execute(
                "SELECT status FROM orders WHERE transaction_id = ?",
                (transaction_id,),
            ).fetchone()
        return saved["status"]

    def _create_cinetpay_checkout(self, payload, user):
        try:
            items, total = validate_order_items(payload.get("items"))
        except ValueError as error:
            self._error(400, str(error))
            return

        transaction_id = secrets.token_hex(16)
        now = int(time.time())
        with database_connection() as connection:
            connection.execute(
                """
                INSERT INTO orders(
                    transaction_id, user_id, amount, currency, status, created_at, updated_at
                ) VALUES (?, ?, ?, 'XOF', 'PENDING', ?, ?)
                """,
                (transaction_id, user["id"], total, now, now),
            )

        origin = self._expected_origin()
        provider_payload = {
            "apikey": os.environ["CINETPAY_API_KEY"].strip(),
            "site_id": os.environ["CINETPAY_SITE_ID"].strip(),
            "transaction_id": transaction_id,
            "amount": total,
            "currency": "XOF",
            "description": f"Commande PC Market {transaction_id}",
            "notify_url": f"{origin}/api/payments/cinetpay/notify",
            "return_url": f"{origin}/payment/return?transaction_id={transaction_id}",
            "channels": "ALL",
            "customer_id": user["phone"],
            "customer_name": "Client PC Market",
            "customer_phone_number": user["phone"].lstrip("+"),
            "customer_country": "CI",
        }
        try:
            result = cinetpay_request("payment", provider_payload)
        except PaymentProviderError as error:
            self._error(502, str(error))
            return
        data = result.get("data")
        payment_url = data.get("payment_url") if isinstance(data, dict) else None
        parsed_url = urlsplit(payment_url) if isinstance(payment_url, str) else None
        if (
            str(result.get("code")) != "201"
            or parsed_url is None
            or parsed_url.scheme != "https"
            or not parsed_url.hostname
            or not (parsed_url.hostname == "cinetpay.com" or parsed_url.hostname.endswith(".cinetpay.com"))
        ):
            self._error(502, "CinetPay n’a pas renvoyé de lien de paiement valide.")
            return
        self._json(201, {"payment_url": payment_url, "transaction_id": transaction_id})

    def _handle_cinetpay_notification(self):
        if not os.environ.get("CINETPAY_API_KEY", "").strip() or not os.environ.get("CINETPAY_SITE_ID", "").strip():
            self._error(503, "Le paiement CinetPay n’est pas encore configuré sur le serveur.")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._error(400, "Notification invalide.")
            return
        if length < 1 or length > MAX_BODY_BYTES:
            self._error(413 if length > MAX_BODY_BYTES else 400, "Taille de notification invalide.")
            return
        body = self.rfile.read(length)
        if self.headers.get_content_type() == "application/json":
            try:
                payload = json.loads(body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                self._error(400, "Notification JSON invalide.")
                return
        else:
            try:
                payload = {key: values[-1] for key, values in parse_qs(body.decode("utf-8")).items() if values}
            except UnicodeDecodeError:
                self._error(400, "Notification invalide.")
                return
        if not isinstance(payload, dict):
            self._error(400, "Notification invalide.")
            return
        transaction_id = payload.get("cpm_trans_id") or payload.get("transaction_id")
        if not isinstance(transaction_id, str) or not re.fullmatch(r"[a-f0-9]{32}", transaction_id):
            self._error(400, "Référence de paiement invalide.")
            return
        try:
            status = self._verify_cinetpay_order(transaction_id)
        except PaymentProviderError as error:
            self._error(502, str(error))
            return
        if status is None:
            self._error(404, "Commande introuvable.")
            return
        self._json(200, {"ok": True})

    def log_message(self, format_string, *args):
        super().log_message(format_string, *args)


def main():
    initialize_database()
    public_origin = configured_public_origin()
    secure_cookie = os.environ.get("PC_MARKET_COOKIE_SECURE") == "1"
    production = os.environ.get("PC_MARKET_ENV", "").lower() == "production"
    validate_deployment_config(HOST, public_origin, secure_cookie, production)
    server = PCMarketServer((HOST, PORT), PCMarketHandler)
    print(f"PC Market prêt sur {HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur PC Market.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
