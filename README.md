# VroomGo — Vehicle Rental Platform

A full-stack vehicle rental marketplace built with **React (Vite) + Node.js/Express + MongoDB**.

VroomGo lets customers browse and book cars, bikes, vans and more from independent vendors,
while vendors manage their own fleet and booking requests, and admins oversee the whole
platform (users, listings, categories).

This project was built as a vehicle-rental reimagining of a room-rental system, with a brand
new name, visual identity (dark theme with an amber/teal accent palette), and a JavaScript
MERN stack instead of TypeScript. Some features were adapted for the vehicle domain:

- **Bookings instead of viewing appointments** — customers reserve a vehicle for a pickup/return
  date range (not just a single viewing slot), with automatic price calculation and
  double-booking prevention for overlapping dates.
- **Favorites** — customers can save vehicles they like (fully implemented, backed by MongoDB).
- **Vehicle specs** — brand, model, year, transmission, fuel type, seating capacity, license
  plate, and feature tags (AC, GPS, Bluetooth, etc.) replace room-specific fields.
- Roles are **customer**, **vendor** (vehicle owner/agency), and **admin**.

## Project structure

```
vroomgo/
├── backend/     # Node.js + Express + MongoDB REST API
└── frontend/    # React (Vite) single-page application
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env     # edit MONGODB_URI, JWT_SECRET, etc.
npm install
npm run dev               # starts on http://localhost:5080
```

Requires a running MongoDB instance (local or Atlas). On first boot, the API automatically
seeds a default set of vehicle categories (Sedan, SUV, Hatchback, Van, Pickup Truck,
Motorbike, Luxury, Electric).

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # set VITE_API_BASE_URL if backend isn't on localhost:5080
npm install
npm run dev                # starts on http://localhost:5000
```

### 3. Try it out

1. Register an account choosing **"List My Fleet"** (vendor) and add a vehicle.
2. Register a second account choosing **"Rent Vehicles"** (customer), browse the fleet,
   and submit a booking request.
3. To access the admin panel, manually set a user's `role` field to `admin` in MongoDB
   (e.g. via `mongosh` or Compass), then log in with that account to approve vehicles,
   manage users, and configure categories.

## Security features

Beyond the core password hashing, JWT sessions and RBAC, VroomGo implements:

- **CAPTCHA** — a self-hosted SVG image captcha (no third-party service/API key required)
  guards registration, login, forgot-password and the magic-link request endpoint.
- **System-wide IP-based brute-force protection** — an automatic sliding-window lockout blocks
  an IP after repeated failed logins/OTP attempts, independent of per-account lockout. Admins can
  also permanently block or allow-list specific IPs via the `/api/admin/ip-access` endpoints
  (no dedicated admin UI page currently — manage rules directly through the API).
- **Session/device binding** — each session's JWT is bound to a hash of the User-Agent that
  created it; replaying a stolen cookie from a different browser/device is rejected.
- **Passwordless "magic link" login** — an alternative to password + OTP: a one-time,
  short-lived sign-in link emailed to the user (`/login/magic-link`).
- **Profile data export/import** — users can download their own profile data as JSON from
  **Profile → Export my data**, and re-import it later. Import is restricted to an explicit
  allow-list of fields (name, phone) so it can never be used to change email, password or role.
- **Real-time security monitoring** — high-severity events (account lockouts, IP auto-blocks,
  session/device mismatches, manual IP rule changes) trigger an email alert and appear live on
  **Admin → Audit Trail** via Server-Sent Events, without needing to refresh the page.

## Tech stack

- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Axios, React Leaflet (map
  location picker), react-hot-toast, lucide-react icons.
- **Backend:** Node.js, Express, Mongoose/MongoDB, JWT auth, bcrypt password hashing,
  Multer file uploads, Nodemailer (transactional emails), svg-captcha, express-rate-limit.

## Notes

- Uploaded images/videos are stored on disk under `backend/public/` and served statically
  at `/public/...`. For production, swap this for a cloud storage bucket (S3, Cloudinary, etc.).
- Password reset emails require `EMAIL_USER`/`EMAIL_PASS` (Gmail app password) in the backend
  `.env`; without them, reset links are simply logged to the server console instead of emailed.