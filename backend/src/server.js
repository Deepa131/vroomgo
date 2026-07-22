const fs = require("fs");
const https = require("https");
const http = require("http");
const app = require("./app");
const { connectDatabase } = require("./database/mongodb");
const { PORT, USE_HTTPS, HTTPS_KEY_PATH, HTTPS_CERT_PATH, NODE_ENV } = require("./config");

/**
 * ---------------------------------------------------------------------------
 * HTTPS / TRANSPORT ENCRYPTION
 * ---------------------------------------------------------------------------
 * WHAT:  HTTPS wraps every request/response in TLS, so credentials, JWTs,
 *        OTP codes, session cookies, etc. can't be read or tampered with by
 *        anyone on the network path (public wifi, ISP, a compromised
 *        router...). Without it, "encryption" controls elsewhere (password
 *        hashing, JWT signing) don't stop someone simply sniffing the token
 *        off the wire in plaintext.
 *
 * IN REAL PRODUCTION:  you would almost always terminate TLS at a reverse
 *        proxy / load balancer (Nginx, Cloudflare, AWS ALB/CloudFront,
 *        Render/Heroku's platform TLS) sitting in front of plain-HTTP
 *        Node, rather than handling certificates inside the Node process.
 *        That's why `USE_HTTPS` defaults to false - the app is HTTPS-ready
 *        either way, because it never assumes plaintext (see the `secure`
 *        cookie flags and HSTS header set elsewhere).
 *
 * FOR THIS ASSIGNMENT (local demo of HTTPS end-to-end): set USE_HTTPS=true
 *        and generate a self-signed certificate once with:
 *
 *          mkdir -p certs
 *          openssl req -x509 -nodes -newkey rsa:2048 \
 *            -keyout certs/key.pem -out certs/cert.pem -days 365 \
 *            -subj "/CN=localhost"
 *
 *        Then visit https://localhost:5080 - your browser will warn about
 *        the self-signed cert (expected; a real deployment uses a CA-issued
 *        cert e.g. via Let's Encrypt), but the connection is genuinely
 *        TLS-encrypted.
 */
async function startServer() {
  await connectDatabase();

  if (USE_HTTPS) {
    if (!fs.existsSync(HTTPS_KEY_PATH) || !fs.existsSync(HTTPS_CERT_PATH)) {
      console.error(
        `USE_HTTPS=true but certificate files were not found at ${HTTPS_KEY_PATH} / ${HTTPS_CERT_PATH}.\n` +
          "Generate a local dev certificate first, see the comment at the top of server.js."
      );
      process.exit(1);
    }

    const options = {
      key: fs.readFileSync(HTTPS_KEY_PATH),
      cert: fs.readFileSync(HTTPS_CERT_PATH),
    };

    https.createServer(options, app).listen(PORT, "0.0.0.0", () => {
      console.log(`VroomGo API server running (HTTPS) at https://0.0.0.0:${PORT}`);
    });

    // Optional: also listen on a plain HTTP port purely to redirect to HTTPS.
    const redirectApp = require("express")();
    redirectApp.use((req, res) => {
      res.redirect(301, `https://${req.hostname}:${PORT}${req.url}`);
    });
    http.createServer(redirectApp).listen(PORT + 1, "0.0.0.0", () => {
      console.log(`HTTP->HTTPS redirect listener on port ${PORT + 1}`);
    });
  } else {
    if (NODE_ENV === "production") {
      console.warn(
        "USE_HTTPS=false in production: make sure TLS is being terminated by a reverse proxy in front of this app."
      );
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`VroomGo API server running at http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();