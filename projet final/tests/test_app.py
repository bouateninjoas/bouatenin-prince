import re
import tempfile
import unittest
from pathlib import Path

from app import create_app


class MarketCITestCase(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temporary_directory.name) / "test.sqlite3"
        self.app = create_app(
            {
                "TESTING": True,
                "DATABASE": str(self.database_path),
                "SECRET_KEY": "test-secret-key",
                "ADMIN_USERNAME": "test-admin",
                "ADMIN_PASSWORD": "a-strong-test-password",
            }
        )
        self.client = self.app.test_client()

    def tearDown(self):
        self.temporary_directory.cleanup()

    def csrf_token(self, path="/admin/login"):
        response = self.client.get(path)
        match = re.search(rb'name="_csrf_token" value="([^"]+)"', response.data)
        self.assertIsNotNone(match, "Le formulaire d’administration doit inclure un jeton CSRF.")
        return match.group(1).decode()

    def login(self):
        response = self.client.post(
            "/admin/login",
            data={
                "_csrf_token": self.csrf_token(),
                "username": "test-admin",
                "password": "a-strong-test-password",
            },
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Gérer MarketCI".encode(), response.data)
        return response

    def create_admin(self, username="my-admin", password="my-very-strong-admin-password"):
        response = self.client.get("/admin/login")
        match = re.search(rb'name="_csrf_token" value="([^"]+)"', response.data)
        self.assertIsNotNone(match, "La configuration initiale doit inclure un jeton CSRF.")
        return self.client.post(
            "/admin/setup",
            data={
                "_csrf_token": match.group(1).decode(),
                "username": username,
                "password": password,
                "password_confirmation": password,
            },
        )

    def test_storefront_and_whitelisted_pages_are_served(self):
        with self.client.get("/") as response:
            self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.client.get("/api/health").get_json(),
            {"status": "ok", "products": 20},
        )
        for page in ("vendeurs", "paiements", "livraison", "inscription", "contact"):
            with self.subTest(page=page):
                with self.client.get(f"/{page}.html") as response:
                    self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/app.py").status_code, 404)
        self.assertIn(
            "nosniff",
            self.client.get("/api/health").headers["X-Content-Type-Options"],
        )

    def test_seeded_catalog_and_filtered_search(self):
        categories = self.client.get("/api/categories").get_json()["items"]
        products = self.client.get("/api/products").get_json()
        self.assertEqual(len(categories), 20)
        self.assertEqual(products["total"], 20)

        filtered = self.client.get("/api/products?q=sac").get_json()
        self.assertEqual(filtered["total"], 2)
        self.assertEqual(
            [item["name"] for item in filtered["items"]],
            ["Sac à main Naya", "Sac de sport tout-terrain"],
        )

        category = self.client.get(
            "/api/products?category=Animaux%20et%20accessoires"
        ).get_json()
        self.assertEqual(category["total"], 1)
        self.assertEqual(category["items"][0]["price"], 17500)

        literal_wildcard = self.client.get("/api/products?q=%25").get_json()
        self.assertEqual(literal_wildcard["total"], 0)
        bad_sort = self.client.get("/api/products?sort=name")
        self.assertEqual(bad_sort.status_code, 400)
        self.assertIn("tri", bad_sort.get_json()["error"])

    def test_feature_pages_offer_contact_and_contact_page_has_no_self_cta(self):
        for page in ("index", "vendeurs", "paiements", "livraison", "inscription"):
            with self.subTest(page=page):
                with self.client.get("/" if page == "index" else f"/{page}.html") as response:
                    self.assertIn(b'href="contact.html"', response.data)

        with self.client.get("/contact.html") as response:
            self.assertNotIn(b'class="contact-cta"', response.data)
            self.assertIn(b'href="index.html">Retour', response.data)

    def test_inquiry_validation_storage_and_honeypot(self):
        response = self.client.post(
            "/api/inquiries",
            json={
                "kind": "information",
                "name": "  Awa Kouassi  ",
                "email": "AWA@example.ci",
                "subject": "Catégories",
                "message": "Je veux en savoir plus.",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.get_json())

        self.login()
        dashboard = self.client.get("/admin")
        self.assertIn(b"Awa Kouassi", dashboard.data)
        self.assertIn(b"awa@example.ci", dashboard.data)

        spam = self.client.post(
            "/api/inquiries",
            json={
                "kind": "contact",
                "name": "Bot",
                "email": "bot@example.ci",
                "subject": "Spam",
                "website": "filled-in-by-a-bot",
            },
        )
        self.assertEqual(spam.status_code, 201)
        self.assertEqual(self.client.get("/admin").data.count(b"Bot"), 0)

        invalid_email = self.client.post(
            "/api/inquiries",
            json={
                "kind": "contact",
                "name": "Client",
                "email": "not-an-email",
                "subject": "Question",
            },
        )
        self.assertEqual(invalid_email.status_code, 400)

        no_json = self.client.post("/api/inquiries", data="name=Client")
        self.assertEqual(no_json.status_code, 415)

    def test_public_submission_rate_limit(self):
        payload = {
            "kind": "contact",
            "name": "Client",
            "email": "client@example.ci",
            "subject": "Question",
            "message": "Bonjour.",
        }
        for _ in range(10):
            response = self.client.post("/api/inquiries", json=payload)
            self.assertEqual(response.status_code, 201)

        limited = self.client.post("/api/inquiries", json=payload)
        self.assertEqual(limited.status_code, 429)

    def test_admin_requires_login_and_csrf(self):
        self.assertEqual(self.client.get("/admin").status_code, 302)
        response = self.client.post("/admin/login", data={"username": "test-admin"})
        self.assertEqual(response.status_code, 400)

    def test_one_time_admin_setup_and_persisted_secure_login(self):
        setup_database = Path(self.temporary_directory.name) / "setup.sqlite3"
        setup_app = create_app(
            {
                "TESTING": True,
                "DATABASE": str(setup_database),
                "SECRET_KEY": "test-initial-setup-key",
                "ADMIN_USERNAME": "admin",
                "ADMIN_PASSWORD": None,
            }
        )
        setup_client = setup_app.test_client()
        setup = setup_client.get("/admin/login")
        self.assertIn("Crée ton compte administrateur".encode(), setup.data)
        csrf_match = re.search(
            rb'name="_csrf_token" value="([^"]+)"', setup.data
        )
        self.assertIsNotNone(csrf_match)
        csrf = csrf_match.group(1).decode()

        mismatch = setup_client.post(
            "/admin/setup",
            data={
                "_csrf_token": csrf,
                "username": "new-admin",
                "password": "first-strong-password",
                "password_confirmation": "second-strong-password",
            },
        )
        self.assertEqual(mismatch.status_code, 400)

        csrf_match = re.search(
            rb'name="_csrf_token" value="([^"]+)"', mismatch.data
        )
        self.assertIsNotNone(csrf_match)
        created = setup_client.post(
            "/admin/setup",
            data={
                "_csrf_token": csrf_match.group(1).decode(),
                "username": "my-admin",
                "password": "my-very-strong-admin-password",
                "password_confirmation": "my-very-strong-admin-password",
            },
        )
        self.assertEqual(created.status_code, 302)
        self.assertEqual(created.headers["Location"], "/admin")

        with setup_app.app_context():
            from app import get_db

            admin = get_db().execute(
                "SELECT username, password_hash FROM admin_users WHERE username = ?",
                ("my-admin",),
            ).fetchone()
            self.assertTrue(admin["password_hash"].startswith("scrypt:"))
            self.assertNotEqual(
                admin["password_hash"],
                "my-very-strong-admin-password",
            )

        setup_again = setup_client.get("/admin/login", follow_redirects=True)
        self.assertIn("Gérer MarketCI".encode(), setup_again.data)

        dashboard = setup_client.get("/admin")
        csrf_match = re.search(
            rb'name="_csrf_token" value="([^"]+)"', dashboard.data
        )
        self.assertIsNotNone(csrf_match)
        logout = setup_client.post(
            "/admin/logout",
            data={"_csrf_token": csrf_match.group(1).decode()},
        )
        self.assertEqual(logout.status_code, 302)

        login_page = setup_client.get("/admin/login")
        csrf_match = re.search(
            rb'name="_csrf_token" value="([^"]+)"', login_page.data
        )
        self.assertIsNotNone(csrf_match)
        login = setup_client.post(
            "/admin/login",
            data={
                "_csrf_token": csrf_match.group(1).decode(),
                "username": "my-admin",
                "password": "my-very-strong-admin-password",
            },
            follow_redirects=True,
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("Espace d’administration".encode(), login.data)

    def test_admin_catalog_and_inquiry_management(self):
        inquiry = self.client.post(
            "/api/inquiries",
            json={
                "kind": "seller",
                "name": "Awa",
                "email": "awa@example.ci",
                "subject": "Vendre sur MarketCI",
                "message": "Ma boutique",
            },
        )
        self.assertEqual(inquiry.status_code, 201)

        self.login()
        csrf = self.csrf_token("/admin")
        add_category = self.client.post(
            "/admin/categories",
            data={"_csrf_token": csrf, "name": "Papeterie", "icon": "✏️"},
            follow_redirects=True,
        )
        self.assertEqual(add_category.status_code, 200)
        self.assertIn("Papeterie".encode(), add_category.data)

        with self.app.app_context():
            from app import get_db

            category_id = get_db().execute(
                "SELECT id FROM categories WHERE name = ?", ("Papeterie",)
            ).fetchone()["id"]

        update_category = self.client.post(
            f"/admin/categories/{category_id}/edit",
            data={"_csrf_token": csrf, "name": "Fournitures", "icon": "✏️"},
        )
        self.assertEqual(update_category.status_code, 302)

        add_product = self.client.post(
            "/admin/products",
            data={
                "_csrf_token": csrf,
                "name": "Carnet ProduitAdminTest",
                "category": "Fournitures",
                "price": "2500",
                "image": "photo-1455390582262-044cdead277a",
                "badge": "Nouveau",
            },
        )
        self.assertEqual(add_product.status_code, 302)
        self.assertEqual(
            self.client.get("/api/products?q=Carnet%20ProduitAdminTest").get_json()["total"],
            1,
        )

        edit_product = self.client.post(
            "/admin/products/21/edit",
            data={
                "_csrf_token": csrf,
                "name": "Carnet ProduitAdminMaj",
                "category": "Fournitures",
                "price": "3000",
                "image": "photo-1455390582262-044cdead277a",
                "badge": "",
            },
        )
        self.assertEqual(edit_product.status_code, 302)
        self.assertEqual(
            self.client.get("/api/products?q=ProduitAdminMaj").get_json()["total"],
            1,
        )

        delete_product = self.client.post(
            "/admin/products/21/delete", data={"_csrf_token": csrf}
        )
        self.assertEqual(delete_product.status_code, 302)
        self.assertEqual(
            self.client.get("/api/products?q=ProduitAdminMaj").get_json()["total"],
            0,
        )

        delete_category = self.client.post(
            f"/admin/categories/{category_id}/delete", data={"_csrf_token": csrf}
        )
        self.assertEqual(delete_category.status_code, 302)

        mark_read = self.client.post(
            f"/admin/inquiries/{inquiry.get_json()['id']}/read",
            data={"_csrf_token": csrf},
            follow_redirects=True,
        )
        self.assertEqual(mark_read.status_code, 200)
        self.assertIn("Lu".encode(), mark_read.data)

    def test_login_lockout(self):
        csrf = self.csrf_token()
        for attempt in range(5):
            response = self.client.post(
                "/admin/login",
                data={
                    "_csrf_token": csrf,
                    "username": "test-admin",
                    "password": f"incorrect-{attempt}",
                },
            )
            self.assertEqual(response.status_code, 401)

        locked = self.client.post(
            "/admin/login",
            data={
                "_csrf_token": csrf,
                "username": "test-admin",
                "password": "a-strong-test-password",
            },
        )
        self.assertEqual(locked.status_code, 429)

    def test_production_requires_secret_key(self):
        with self.assertRaisesRegex(RuntimeError, "MARKETCI_SECRET_KEY"):
            create_app(
                {
                    "TESTING": True,
                    "ENVIRONMENT": "production",
                    "SECRET_KEY": None,
                    "DATABASE": str(self.database_path),
                }
            )
        with self.assertRaisesRegex(RuntimeError, "MARKETCI_ADMIN_PASSWORD"):
            create_app(
                {
                    "TESTING": True,
                    "ENVIRONMENT": "production",
                    "SECRET_KEY": "secure-test-secret-key-that-is-long-enough",
                    "ADMIN_PASSWORD": "short",
                    "DATABASE": str(self.database_path),
                }
            )


if __name__ == "__main__":
    unittest.main()
