import http.client
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

    def test_authentication_is_classic_and_social_buttons_are_absent(self):
        status, headers, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b'id="auth-form"', body)
        self.assertIn(b"Se connecter", body)
        self.assertNotIn(b"Continuer avec Google", body)
        self.assertNotIn(b"Continuer avec Facebook", body)
        self.assertNotIn(b"Continuer avec GitHub", body)
        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertIn("frame-ancestors 'none'", headers.get("Content-Security-Policy"))

        status, _, body = self.request("GET", "/auth.js")
        self.assertEqual(status, 200)
        self.assertIn(b"/api/auth/", body)
        status, headers, body = self.request("GET", "/lenovo.js")
        self.assertEqual(status, 302)
        self.assertEqual(headers.get("Location"), "/")
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
        self.assertIn(b'id="auth-form"', body)

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
                        ]
                    },
                    origin=self.origin,
                    cookie=cookie,
                )
            self.assertEqual(status, 201)
            self.assertEqual(provider_request.call_args.args[1]["amount"], 1220000)

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
