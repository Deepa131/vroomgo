import { Link, Outlet } from "react-router-dom";
import { Car } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
          alt="Vehicle rental"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/10" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="font-display text-3xl font-bold">Your next journey starts here.</h2>
          <p className="mt-2 text-white/70">
            Thousands of cars, bikes, and vans ready to hit the road — book in minutes.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-ink-950 px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ember-500 to-ember-700">
              <Car size={20} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">
              Vroom<span className="text-ember-500">Go</span>
            </span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
