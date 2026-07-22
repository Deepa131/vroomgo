import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// HTTPS in development: basicSsl generates and trusts a local self-signed
// certificate automatically, so `npm run dev` is served over https:// and
// traffic between the browser and the dev server is TLS-encrypted, matching
// the backend's own dev-HTTPS setup (see backend/src/server.js).
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 5000,
    https: true,
  },
});
