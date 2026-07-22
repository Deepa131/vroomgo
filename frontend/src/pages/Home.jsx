import { Link, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Car,
  ShieldCheck,
  Clock,
  Wallet,
  Search,
  CalendarCheck,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { vehicleApi, categoryApi } from "../api/vehicle";
import VehicleCard from "../components/VehicleCard";
import { useAuth } from "../context/AuthContext";

const CATEGORY_ICONS = {
  Sedan: "🚗",
  SUV: "🚙",
  Hatchback: "🚕",
  Van: "🚐",
  "Pickup Truck": "🛻",
  Motorbike: "🏍️",
  Luxury: "🏎️",
  Electric: "⚡",
};

const dashboardPathByRole = {
  customer: "/customer/dashboard",
  vendor: "/vendor/dashboard",
  admin: "/admin/dashboard",
};

export default function Home() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [vehicleRes, categoryRes] = await Promise.all([
          vehicleApi.getAll({ limit: 6 }),
          categoryApi.getAll(),
        ]);
        if (vehicleRes.success) setFeatured(vehicleRes.data);
        if (categoryRes.success) setCategories(categoryRes.data);
      } catch (e) {
        // fail silently on landing page
      } finally {
        setLoadingVehicles(false);
      }
    })();
  }, []);

  // Scroll to the section referenced by the URL hash (e.g. from Navbar's
  // "How it Works" / "List Your Vehicle" links) once the page has rendered.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      // Wait a tick so the DOM (and any redirect check above) has settled.
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [location.hash, loading, user]);

  // Logged-in users should land on their own dashboard, not the marketing page.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-ember-500 border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={dashboardPathByRole[user.role] || "/"} replace />;
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=80"
            alt="Fleet of rental vehicles"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-24 md:py-36">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-6xl">
              Hit the road with <span className="text-ember-500">VroomGo</span>
            </h1>
            <p className="mt-5 text-lg text-white/70">
              Compare and book cars, bikes, vans and more from trusted local vendors — or list your own
              vehicles and start earning today.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/vehicles" className="btn-primary text-base">
                <Search size={18} /> Find a Vehicle
              </Link>
              <Link to="/register" className="btn-secondary text-base">
                <Car size={18} /> Become a Vendor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Browse by category</h2>
        <p className="mt-2 text-white/50">Find exactly the ride you need for the trip ahead.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(categories.length ? categories : Object.keys(CATEGORY_ICONS).map((k) => ({ typeName: k, id: k }))).map(
            (cat) => (
              <Link
                key={cat.id}
                to={`/vehicles?category=${cat.id}`}
                className="card flex flex-col items-center gap-2 p-6 text-center transition hover:border-ember-500/50"
              >
                <span className="text-3xl">{CATEGORY_ICONS[cat.typeName] || "🚘"}</span>
                <span className="text-sm font-medium text-white">{cat.typeName}</span>
              </Link>
            )
          )}
        </div>
      </section>

      {/* FEATURED VEHICLES */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Popular right now</h2>
            <p className="mt-2 text-white/50">Hand-picked vehicles our renters love.</p>
          </div>
          <Link to="/vehicles" className="hidden items-center gap-1 text-ember-500 hover:underline md:flex">
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {loadingVehicles ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-80 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : featured.length ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((v) => (
              <VehicleCard key={v.id || v._id} vehicle={v} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-white/50">
            No vehicles listed yet — be the first vendor to add one!
          </p>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-y border-white/10 bg-ink-900/50 py-16">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="text-center font-display text-2xl font-bold text-white md:text-3xl">
            Renting made simple
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { icon: Search, title: "Search & Compare", desc: "Filter by category, price, and location to find your ideal ride." },
              { icon: CalendarCheck, title: "Book Instantly", desc: "Pick your pickup and return dates, and send a booking request." },
              { icon: KeyRound, title: "Pick Up & Go", desc: "Meet your vendor, grab the keys, and hit the road worry-free." },
            ].map((step, idx) => (
              <div key={idx} className="card p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/15 text-ember-500">
                  <step.icon size={26} />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex items-center gap-4">
            <ShieldCheck className="text-teal-400" size={32} />
            <div>
              <p className="font-semibold text-white">Verified Vendors</p>
              <p className="text-sm text-white/50">Every listing is reviewed by our team.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Clock className="text-teal-400" size={32} />
            <div>
              <p className="font-semibold text-white">24/7 Support</p>
              <p className="text-sm text-white/50">We're here whenever the road gets bumpy.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Wallet className="text-teal-400" size={32} />
            <div>
              <p className="font-semibold text-white">Transparent Pricing</p>
              <p className="text-sm text-white/50">No hidden fees — what you see is what you pay.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BECOME VENDOR CTA */}
      <section id="become-vendor" className="mx-auto max-w-7xl px-5 pb-20">
        <div className="card flex flex-col items-center justify-between gap-6 overflow-hidden p-10 text-center md:flex-row md:text-left">
          <div>
            <h3 className="font-display text-2xl font-bold text-white">Own a vehicle? Start earning today.</h3>
            <p className="mt-2 text-white/60">
              List your car, bike, or van on VroomGo and reach thousands of renters in your area.
            </p>
          </div>
          <Link to="/register" className="btn-primary shrink-0 text-base">
            List Your Vehicle <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}