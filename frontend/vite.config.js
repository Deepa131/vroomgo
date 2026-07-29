import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// NOTE: HTTPS is intentionally OFF here for local dev. The backend's
// USE_HTTPS defaults to false (plain http://localhost:5080 - see
// backend/src/server.js and backend/.env), so if this dev server serves
// over https:// while the API is plain http://, the browser treats every
// XHR/fetch to the API as an insecure request from a secure page and
// blocks it - which is what showed up as "Could not load captcha." If you
// want end-to-end HTTPS instead, re-add basicSsl() here AND set
// USE_HTTPS=true (+ generate certs) in backend/.env, and make sure
// FRONTEND_URL/ALLOWED_ORIGINS there use https://localhost:5000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
  },
});