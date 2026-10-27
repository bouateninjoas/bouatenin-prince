import http.client
import io
import json
import tempfile
import threading
import unittest
from http.cookies import SimpleCookie
from pathlib import Path
from unittest.mock import patch

import server


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_patch = patch.object(server, "DATABASE_PATH", Path(self.temp_dir.name) / "test.sqlite3")
        self.database_patch.start()
        self.origin_patch = patch.dict(server.os.environ, {"PC_MARKET_ORIGIN": ""})
        self.origin_patch.start()
        server.initialize_database()
        self.httpd = server.PCMarketServer(("127.0.0.1", 0), server.PCMarketHandler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.host, self.port = self.httpd.server_address
        self.origin = f"http://{self.host}:{self.port}"

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)
        self.origin_patch.stop()
        self.database_patch.stop()
        self.temp_dir.cleanup()

    def request(self, method, path, payload=None, origin=None, cookie=None):
        connection = http.client.HTTPConnection(self.host, self.port, timeout=5)
        headers = {}
        body = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(payload)
        if origin is not None:
            headers["Origin"] = origin
        if cookie is not None:
            headers["Cookie"] = cookie
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        result = response.read()
        response_headers = response.headers
        connection.close()
        return response.status, response_headers, result

    @staticmethod
    def session_cookie(headers):
        cookies = SimpleCookie()
        cookies.load(headers.get("Set-Cookie", ""))
        return f"{server.COOKIE_NAME}={cookies[server.COOKIE_NAME].value}"

    def register(self):
        return self.request(
            "POST",
            "/api/auth/register",
            {"phone": "+225 07 12 34 56 78", "password": "safe-password-2026"},
            origin=self.origin,
        )

    def test_sqlite_foreign_keys_cascade_when_user_is_deleted(self):
        with server.database_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users(phone, password_salt, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                ("+2250700000000", b"salt", b"hash", 0),
            )
            user_id = cursor.lastrowid
            connection.execute(
                "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                ("session-token", user_id, 1),
            )
            connection.execute(
                """
                INSERT INTO orders(
                    transaction_id, user_id, amount, currency, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                ("a" * 32, user_id, 10000, "XOF", "PENDING", 0, 0),
            )
            connection.execute(
                """
                INSERT INTO customer_orders(
                    order_id, user_id, amount, currency, delivery_area, items_json, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("order-1", user_id, 10000, "XOF", "Cocody", "[]", "PENDING_CONFIRMATION", 0),
            )
            connection.execute(
                """
                INSERT INTO customer_order_messages(
                    order_id, recipient_phone, opted_in_at, status, provider_message_id, error_message, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                ("order-1", "+2250700000000", 0, "PENDING", None, None, 0),
            )
            connection.execute("DELETE FROM users WHERE id = ?", (user_id,))
            session_count = connection.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
            order_count = connection.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
            customer_order_count = connection.execute("SELECT COUNT(*) FROM customer_orders").fetchone()[0]
            message_count = connection.execute("SELECT COUNT(*) FROM customer_order_messages").fetchone()[0]

        self.assertEqual(session_count, 0)
        self.assertEqual(order_count, 0)
        self.assertEqual(customer_order_count, 0)
        self.assertEqual(message_count, 0)

    def test_visitors_can_browse_and_authentication_is_available_when_needed(self):
        status, headers, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b'id="product-grid"', body)
        self.assertIn(b'id="login-link"', body)
        self.assertIn(b'id="daily-news"', body)
        self.assertIn(b'id="whatsapp-opt-in"', body)
        self.assertIn(b"livreur te contactera", body)
        self.assertNotIn(b"Continuer avec Google", body)
        self.assertNotIn(b"Continuer avec Facebook", body)
        self.assertNotIn(b"Continuer avec GitHub", body)
        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertIn("frame-ancestors 'none'", headers.get("Content-Security-Policy"))

        status, _, body = self.request("GET", "/auth.html")
        self.assertEqual(status, 200)
        self.assertIn(b'id="auth-form"', body)
        status, _, body = self.request("GET", "/auth.js")
        self.assertEqual(status, 200)
        self.assertIn(b"/api/auth/", body)
        status, _, body = self.request("GET", "/gomycode.HTML")
        self.assertEqual(status, 200)
        self.assertIn(b'id="product-grid"', body)
        status, _, body = self.request("GET", "/lenovo.js")
        self.assertEqual(status, 200)
        self.assertIn(b"function renderProducts", body)
        self.assertIn(b"function showDailyNews", body)
        status, _, _ = self.request("GET", "/lenovo.css")
        self.assertEqual(status, 200)
        for image_path in (
            "/images/usb-c-hdmi-8-in-1.jpg",
            "/images/usb-c-adapter-6-in-1.jpg",
            "/images/aoa-b1001-wireless-mouse.jpg",
            "/images/wireless-mouse-led.jpg",
        ):
            status, headers, body = self.request("GET", image_path)
            self.assertEqual(status, 200)
            self.assertEqual(headers.get("Content-Type"), "image/jpeg")
            self.assertTrue(body.startswith(b"\xff\xd8"))
        status, _, body = self.request("GET", "/api/auth/me")
        self.assertEqual(status, 200)
        self.assertFalse(json.loads(body)["authenticated"])
        for provider in ("google", "facebook", "github"):
            status, _, _ = self.request("GET", f"/auth/oauth/{provider}")
            self.assertEqual(status, 404)

        status, headers, _ = self.register()
        self.assertEqual(status, 201)
        self.assertIn("HttpOnly", headers.get("Set-Cookie"))
        self.assertIn("SameSite=Lax", headers.get("Set-Cookie"))
        cookie = self.session_cookie(headers)
        status, _, body = self.request("GET", "/gomycode.HTML", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertIn(b'id="product-grid"', body)
        status, _, body = self.request("GET", "/api/auth/me", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["user"]["phone"], "+2250712345678")

    def test_login_rejects_wrong_password_and_logout_clears_session(self):
        status, _, _ = self.register()
        self.assertEqual(status, 201)
        status, _, body = self.request(
            "POST",
            "/api/auth/login",
            {"phone": "+2250712345678", "password": "incorrect-password"},
            origin=self.origin,
        )
        self.assertEqual(status, 401)
        self.assertIn("incorrect", json.loads(body)["error"])

        status, headers, _ = self.request(
            "POST",
            "/api/auth/login",
            {"phone": "+2250712345678", "password": "safe-password-2026"},
            origin=self.origin,
        )
        self.assertEqual(status, 200)
        cookie = self.session_cookie(headers)
        status, _, body = self.request("GET", "/gomycode.HTML", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertIn(b'id="product-grid"', body)

        status, _, _ = self.request(
            "POST",
            "/api/auth/logout",
            {},
            origin=self.origin,
            cookie=cookie,
        )
        self.assertEqual(status, 200)
        status, _, body = self.request("GET", "/", cookie=cookie)
        self.assertIn(b'id="product-grid"', body)

    def test_guest_can_browse_but_cannot_start_checkout(self):
        status, _, body = self.request(
            "POST",
            "/api/payments/cinetpay",
            {"items": [{"id": "toshiba-chromebook", "quantity": 1}]},
            origin=self.origin,
        )
        self.assertEqual(status, 401)
        self.assertIn("Connecte-toi", json.loads(body)["error"])

    def test_authenticated_customer_can_create_delivery_order(self):
        status, headers, _ = self.register()
        self.assertEqual(status, 201)
        cookie = self.session_cookie(headers)
        with patch.object(server, "send_order_confirmation_whatsapp", return_value="wamid.order-test") as send_message:
            status, _, body = self.request(
                "POST",
                "/api/orders",
                {
                    "items": [
                        {"id": "toshiba-chromebook", "quantity": 2},
                        {"id": "dell-ms116-mouse", "quantity": 1},
                    ],
                    "delivery_area": "Cocody, Angré",
                    "whatsapp_opt_in": True,
                },
                origin=self.origin,
                cookie=cookie,
            )
        send_message.assert_called_once_with("+2250712345678", json.loads(body)["order_id"], "Cocody, Angré")
        self.assertEqual(status, 201)
        result = json.loads(body)
        self.assertRegex(result["order_id"], r"^[A-F0-9]{12}$")
        self.assertEqual(result["amount"], 408000)
        self.assertEqual(result["delivery_area"], "Cocody, Angré")
        self.assertEqual(result["status"], "ACCEPTED_DELIVERY_24H")
        self.assertEqual(result["whatsapp_notification"]["status"], "ACCEPTED_BY_PROVIDER")
        self.assertEqual(
            result["items"],
            [
                {"id": "toshiba-chromebook", "quantity": 2, "unit_price": 200000},
                {"id": "dell-ms116-mouse", "quantity": 1, "unit_price": 8000},
            ],
        )
        with server.database_connection() as connection:
            order = connection.execute(
                """
                SELECT user_id, amount, delivery_area, items_json, status
                FROM customer_orders WHERE order_id = ?
                """,
                (result["order_id"],),
            ).fetchone()
        self.assertGreater(order["user_id"], 0)
        self.assertEqual(order["amount"], 408000)
        self.assertEqual(order["delivery_area"], "Cocody, Angré")
        self.assertEqual(json.loads(order["items_json"]), result["items"])
        self.assertEqual(order["status"], "ACCEPTED_DELIVERY_24H")
        with server.database_connection() as connection:
            message = connection.execute(
                "SELECT recipient_phone, opted_in_at, status, provider_message_id FROM customer_order_messages WHERE order_id = ?",
                (result["order_id"],),
            ).fetchone()
        self.assertEqual(message["recipient_phone"], "+2250712345678")
        self.assertGreater(message["opted_in_at"], 0)
        self.assertEqual(message["status"], "ACCEPTED_BY_PROVIDER")
        self.assertEqual(message["provider_message_id"], "wamid.order-test")

    def test_customer_confirmation_uses_whatsapp_approved_template(self):
        response = io.BytesIO(json.dumps({"messages": [{"id": "wamid.confirmation"}]}).encode())
        with patch.dict(
            server.os.environ,
            {
                "WHATSAPP_ACCESS_TOKEN": "test-access-token",
                "WHATSAPP_PHONE_NUMBER_ID": "123456789",
                "WHATSAPP_ORDER_TEMPLATE": "order_delivery_confirmation",
                "WHATSAPP_TEMPLATE_LANGUAGE": "fr",
                "WHATSAPP_GRAPH_API_VERSION": "v23.0",
            },
        ), patch.object(server, "urlopen") as send_request:
            send_request.return_value.__enter__.return_value = response
            message_id = server.send_order_confirmation_whatsapp(
                "+2250712345678",
                "A1B2C3D4E5F6",
                "Cocody, Angré",
            )

        self.assertEqual(message_id, "wamid.confirmation")
        request = send_request.call_args.args[0]
        self.assertEqual(
            request.full_url,
            "https://graph.facebook.com/v23.0/123456789/messages",
        )
        self.assertEqual(request.get_header("Authorization"), "Bearer test-access-token")
        payload = json.loads(request.data)
        self.assertEqual(payload["messaging_product"], "whatsapp")
        self.assertEqual(payload["to"], "2250712345678")
        self.assertEqual(payload["type"], "template")
        self.assertEqual(payload["template"]["name"], "order_delivery_confirmation")
        self.assertEqual(
            [parameter["text"] for parameter in payload["template"]["components"][0]["parameters"]],
            ["A1B2C3D4E5F6", "Cocody, Angré"],
        )

    def test_unconfigured_whatsapp_keeps_order_pending_and_reports_failure(self):
        _, headers, _ = self.register()
        cookie = self.session_cookie(headers)
        with patch.dict(
            server.os.environ,
            {
                "WHATSAPP_ACCESS_TOKEN": "",
                "WHATSAPP_PHONE_NUMBER_ID": "",
            },
        ):
            status, _, body = self.request(
                "POST",
                "/api/orders",
                {
                    "items": [{"id": "toshiba-chromebook", "quantity": 1}],
                    "delivery_area": "Cocody",
                    "whatsapp_opt_in": True,
                },
                origin=self.origin,
                cookie=cookie,
            )

        self.assertEqual(status, 201)
        result = json.loads(body)
        self.assertEqual(result["status"], "PENDING_CONFIRMATION")
        self.assertEqual(result["whatsapp_notification"]["status"], "FAILED")
        with server.database_connection() as connection:
            order = connection.execute(
                "SELECT status FROM customer_orders WHERE order_id = ?",
                (result["order_id"],),
            ).fetchone()
            message = connection.execute(
                "SELECT status, error_message FROM customer_order_messages WHERE order_id = ?",
                (result["order_id"],),
            ).fetchone()
        self.assertEqual(order["status"], "PENDING_CONFIRMATION")
        self.assertEqual(message["status"], "FAILED")
        self.assertIn("pas configurée", message["error_message"])

    def test_customer_order_requires_login_and_valid_delivery_area(self):
        payload = {
            "items": [{"id": "toshiba-chromebook", "quantity": 1}],
            "delivery_area": "Cocody",
            "whatsapp_opt_in": True,
        }
        status, _, body = self.request("POST", "/api/orders", payload, origin=self.origin)
        self.assertEqual(status, 401)
        self.assertIn("Connecte-toi", json.loads(body)["error"])

        _, headers, _ = self.register()
        cookie = self.session_cookie(headers)
        status, _, body = self.request(
            "POST",
            "/api/orders",
            {**payload, "whatsapp_opt_in": False},
            origin=self.origin,
            cookie=cookie,
        )
        self.assertEqual(status, 400)
        self.assertIn("WhatsApp", json.loads(body)["error"])
        status, _, body = self.request(
            "POST",
            "/api/orders",
            {**payload, "delivery_area": " "},
            origin=self.origin,
            cookie=cookie,
        )
        self.assertEqual(status, 400)
        self.assertIn("commune", json.loads(body)["error"])
        with server.database_connection() as connection:
            count = connection.execute("SELECT COUNT(*) FROM customer_orders").fetchone()[0]
        self.assertEqual(count, 0)

    def test_customer_order_rejects_cross_origin_request(self):
        _, headers, _ = self.register()
        cookie = self.session_cookie(headers)
        status, _, body = self.request(
            "POST",
            "/api/orders",
            {
                "items": [{"id": "toshiba-chromebook", "quantity": 1}],
                "delivery_area": "Cocody",
                "whatsapp_opt_in": True,
            },
            origin="https://attacker.example",
            cookie=cookie,
        )
        self.assertEqual(status, 403)
        self.assertIn("Origine", json.loads(body)["error"])

    def test_checkout_uses_server_prices_and_verifies_payment(self):
        with patch.dict(
            server.os.environ,
            {"CINETPAY_API_KEY": "test-api-key", "CINETPAY_SITE_ID": "123456"},
        ):
            status, headers, _ = self.register()
            self.assertEqual(status, 201)
            cookie = self.session_cookie(headers)
            with patch.object(
                server,
                "cinetpay_request",
                return_value={
                    "code": "201",
                    "data": {"payment_url": "https://checkout.cinetpay.com/pay/test"},
                },
            ) as provider_request:
                status, _, body = self.request(
                    "POST",
                    "/api/payments/cinetpay",
                    {
                        "items": [
                            {"id": "toshiba-chromebook", "quantity": 2},
                            {"id": "thinkpad-dock", "quantity": 1},
                        ],
                        "amount": 1,
                    },
                    origin=self.origin,
                    cookie=cookie,
                )
            self.assertEqual(status, 201)
            result = json.loads(body)
            self.assertEqual(result["payment_url"], "https://checkout.cinetpay.com/pay/test")
            provider_payload = provider_request.call_args.args[1]
            self.assertEqual(provider_payload["amount"], 545000)
            self.assertEqual(provider_payload["currency"], "XOF")
            self.assertEqual(provider_payload["customer_phone_number"], "2250712345678")
            self.assertIn(result["transaction_id"], provider_payload["return_url"])

            with patch.object(
                server,
                "cinetpay_request",
                return_value={
                    "code": "00",
                    "data": {"status": "ACCEPTED", "amount": "545000", "currency": "XOF"},
                },
            ):
                status, _, body = self.request(
                    "POST",
                    "/api/payments/cinetpay/verify",
                    {"transaction_id": result["transaction_id"]},
                    origin=self.origin,
                    cookie=cookie,
                )
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body)["status"], "ACCEPTED")
            with server.database_connection() as connection:
                order = connection.execute(
                    "SELECT status, user_id FROM orders WHERE transaction_id = ?",
                    (result["transaction_id"],),
                ).fetchone()
            self.assertEqual(order["status"], "ACCEPTED")
            self.assertGreater(order["user_id"], 0)

    def test_checkout_rejects_unknown_products(self):
        with patch.dict(
            server.os.environ,
            {"CINETPAY_API_KEY": "test-api-key", "CINETPAY_SITE_ID": "123456"},
        ):
            _, headers, _ = self.register()
            cookie = self.session_cookie(headers)
            with patch.object(server, "cinetpay_request") as provider_request:
                status, _, body = self.request(
                    "POST",
                    "/api/payments/cinetpay",
                    {"items": [{"id": "unknown-product", "quantity": 1}]},
                    origin=self.origin,
                    cookie=cookie,
                )
            self.assertEqual(status, 400)
            self.assertIn("n’est pas disponible", json.loads(body)["error"])
            provider_request.assert_not_called()

    def test_checkout_uses_server_prices_for_new_computers_and_mice(self):
        with patch.dict(
            server.os.environ,
            {"CINETPAY_API_KEY": "test-api-key", "CINETPAY_SITE_ID": "123456"},
        ):
            _, headers, _ = self.register()
            cookie = self.session_cookie(headers)
            with patch.object(
                server,
                "cinetpay_request",
                return_value={
                    "code": "201",
                    "data": {"payment_url": "https://checkout.cinetpay.com/pay/test"},
                },
            ) as provider_request:
                status, _, _ = self.request(
                    "POST",
                    "/api/payments/cinetpay",
                    {
                        "items": [
                            {"id": "dell-optiplex-micro", "quantity": 1},
                            {"id": "hp-prodesk-mini", "quantity": 1},
                            {"id": "soyo-m5-air", "quantity": 1},
                            {"id": "surface-laptop-4", "quantity": 1},
                            {"id": "dell-latitude-7200-2-in-1", "quantity": 1},
                            {"id": "dell-ms116-mouse", "quantity": 1},
                            {"id": "lenovo-300-usb-mouse", "quantity": 1},
                            {"id": "aoa-b1001-wireless-mouse", "quantity": 1},
                            {"id": "wireless-mouse-led", "quantity": 1},
                            {"id": "usb-c-hdmi-8-in-1", "quantity": 1},
                            {"id": "usb-c-adapter-6-in-1", "quantity": 1},
                        ]
                    },
                    origin=self.origin,
                    cookie=cookie,
                )
            self.assertEqual(status, 201)
            self.assertEqual(provider_request.call_args.args[1]["amount"], 1252000)

    def test_checkout_rejects_cross_origin_request(self):
        with patch.dict(
            server.os.environ,
            {"CINETPAY_API_KEY": "test-api-key", "CINETPAY_SITE_ID": "123456"},
        ):
            _, headers, _ = self.register()
            cookie = self.session_cookie(headers)
            status, _, body = self.request(
                "POST",
                "/api/payments/cinetpay",
                {"items": [{"id": "toshiba-chromebook", "quantity": 1}]},
                origin="https://attacker.example",
                cookie=cookie,
            )
        self.assertEqual(status, 403)
        self.assertIn("refusée", json.loads(body)["error"])

    def test_public_deployment_still_requires_https_and_secure_cookies(self):
        with self.assertRaises(RuntimeError):
            server.validate_deployment_config("0.0.0.0", "", False, False)
        server.validate_deployment_config("localhost", "https://shop.example", True, True)

    def test_render_external_url_configures_public_origin(self):
        with patch.dict(
            server.os.environ,
            {"PC_MARKET_ORIGIN": "", "RENDER_EXTERNAL_URL": "https://pc-market.onrender.com/"},
        ):
            self.assertEqual(
                server.configured_public_origin(),
                "https://pc-market.onrender.com",
            )


if __name__ == "__main__":
    unittest.main()
