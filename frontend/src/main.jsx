import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

// OAuth login (Google) - Client ID from Google Cloud Console, exposed to the
// browser via Vite env (see frontend/.env: VITE_GOOGLE_CLIENT_ID). This is
// the OAuth *client* ID, which is public by design; the backend independently
// verifies every ID token against Google before trusting it (see
// backend/src/controllers/auth.controller.js googleLogin).
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);