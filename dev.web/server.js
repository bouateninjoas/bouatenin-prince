const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { createServer } = require("node:http");
const path = require("node:path");

const port = Number(process.env.PORT || 3000);
const username = process.env.SITE_USER;
const password = process.env.SITE_PASSWORD;
const secureCookie = process.env.NODE_ENV === "production";
const sessionLifetime = 12 * 60 * 60 * 1000;
const lockoutDuration = 15 * 60 * 1000;
const maxFailedAttempts = 5;
const sessions = new Map();
const failedLogins = new Map();
const baseDirectory = __dirname;
const publicFiles = new Map([
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/login.js", ["login.js", "text/javascript; charset=utf-8"]],
  ["/site.js", ["site.js", "text/javascript; charset=utf-8"]],
  ["/bus.css", ["bus.css", "text/css; charset=utf-8"]],
  ["/bus.js", ["bus.js", "text/javascript; charset=utf-8"]],
]);

if (!username || !isValidName(username)) {
  console.error("Configurez SITE_USER avec un nom d’utilisateur valide avant de démarrer.");
  process.exit(1);
}

if (!password || password.length < 12) {
  console.error("Configurez SITE_PASSWORD avec au moins 12 caractères avant de démarrer.");
  process.exit(1);
}

const sessionSalt = randomBytes(16);
const usernameHash = scryptSync(username.trim(), sessionSalt, 64);
const passwordHash = scryptSync(password, sessionSalt, 64);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT doit être un numéro compris entre 1 et 65535.");
  process.exit(1);
}

function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'",
  );
}

function respond(response, status, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, { "Content-Type": contentType });
  response.end(body);
}

function respondJson(response, status, value) {
  respond(response, status, JSON.stringify(value));
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return null;
}

function getSession(request) {
  const token = readCookie(request, "site_session");
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function removeExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
  for (const [address, attempt] of failedLogins) {
    if (attempt.expiresAt <= now) failedLogins.delete(address);
  }
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    let body = "";
    let tooLarge = false;

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      if (body.length + chunk.length > 4096) {
        tooLarge = true;
      } else if (!tooLarge) {
        body += chunk;
      }
    });
    request.on("end", () => {
      if (tooLarge) {
        resolve({ error: "Requête trop volumineuse.", status: 413 });
        return;
      }

      try {
        resolve({ value: JSON.parse(body) });
      } catch {
        resolve({ error: "Requête invalide.", status: 400 });
      }
    });
    request.on("error", () => resolve({ error: "Requête interrompue.", status: 400 }));
  });
}

function isValidName(name) {
  return typeof name === "string"
    && name.trim().length > 0
    && Array.from(name.trim()).length <= 40
    && !/[\u0000-\u001f\u007f]/u.test(name);
}

function credentialsMatch(inputName, inputPassword) {
  if (typeof inputPassword !== "string" || inputPassword.length > 1024) return false;
  const candidateName = scryptSync(inputName.trim(), sessionSalt, 64);
  const candidatePassword = scryptSync(inputPassword, sessionSalt, 64);
  return timingSafeEqual(candidateName, usernameHash)
    && timingSafeEqual(candidatePassword, passwordHash);
}

function sessionCookie(token, maxAge) {
  const parts = [`site_session=${token}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAge}`];
  if (secureCookie) parts.push("Secure");
  return parts.join("; ");
}

function serveFile(response, fileName, contentType) {
  const filePath = path.join(baseDirectory, fileName);
  respond(response, 200, readFileSync(filePath), contentType);
}

async function handleRequest(request, response) {
  setSecurityHeaders(response);
  removeExpiredSessions();

  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const session = getSession(request);

  if (request.method === "GET" && url.pathname === "/") {
    if (session) {
      serveFile(response, "bus.html", "text/html; charset=utf-8");
    } else {
      serveFile(response, "index.html", "text/html; charset=utf-8");
    }
    return;
  }

  if (request.method === "GET" && publicFiles.has(url.pathname)) {
    const [fileName, contentType] = publicFiles.get(url.pathname);
    serveFile(response, fileName, contentType);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/session") {
    if (!session) {
      respondJson(response, 401, { error: "Session expirée." });
      return;
    }
    respondJson(response, 200, { name: session.name });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    if (!isSameOrigin(request)) {
      respondJson(response, 403, { error: "Origine de la requête non autorisée." });
      return;
    }
    if (!request.headers["content-type"]?.startsWith("application/json")) {
      respondJson(response, 415, { error: "Format de requête non pris en charge." });
      return;
    }

    const parsed = await readJsonBody(request);
    if (parsed.error) {
      respondJson(response, parsed.status, { error: parsed.error });
      return;
    }

    if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
      respondJson(response, 400, { error: "Requête invalide." });
      return;
    }

    const { name, password: enteredPassword } = parsed.value;
    if (!isValidName(name) || typeof enteredPassword !== "string") {
      respondJson(response, 400, { error: "Entrez votre nom d’utilisateur et votre mot de passe." });
      return;
    }

    const address = request.socket.remoteAddress || "unknown";
    const now = Date.now();
    const attempt = failedLogins.get(address);
    if (attempt && attempt.count >= maxFailedAttempts && attempt.lockedUntil > now) {
      respondJson(response, 429, { error: "Trop de tentatives. Réessayez dans 15 minutes." });
      return;
    }

    if (!credentialsMatch(name, enteredPassword)) {
      const nextAttempt = attempt && attempt.expiresAt > now
        ? attempt
        : { count: 0, expiresAt: now + lockoutDuration, lockedUntil: 0 };
      nextAttempt.count += 1;
      if (nextAttempt.count >= maxFailedAttempts) {
        nextAttempt.lockedUntil = now + lockoutDuration;
        nextAttempt.expiresAt = nextAttempt.lockedUntil;
      }
      failedLogins.set(address, nextAttempt);
      respondJson(response, 401, { error: "Nom d’utilisateur ou mot de passe incorrect." });
      return;
    }

    failedLogins.delete(address);
    const token = randomBytes(32).toString("hex");
    sessions.set(token, {
      name: name.trim(),
      expiresAt: Date.now() + sessionLifetime,
    });
    response.setHeader("Set-Cookie", sessionCookie(token, sessionLifetime / 1000));
    respondJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/logout") {
    if (!isSameOrigin(request)) {
      respondJson(response, 403, { error: "Origine de la requête non autorisée." });
      return;
    }
    const token = readCookie(request, "site_session");
    if (token) sessions.delete(token);
    response.setHeader("Set-Cookie", sessionCookie("", 0));
    respondJson(response, 200, { ok: true });
    return;
  }

  respond(response, 404, "Page introuvable.", "text/plain; charset=utf-8");
}

createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error("Erreur lors du traitement d'une requête.", error);
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    respondJson(response, 500, { error: "Une erreur interne est survenue." });
  });
}).listen(port, () => {
  console.log(`Espace privé disponible sur http://localhost:${port}`);
});
