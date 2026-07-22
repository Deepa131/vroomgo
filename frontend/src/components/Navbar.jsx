import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Car, LayoutDashboard, LogOut, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMediaUrl } from "../api/axios";

const dashboardPathByRole = {
  customer: "/customer/dashboard",
  vendor: "/vendor/dashboard",
  admin: "/admin/dashboard",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ember-500 to-ember-700">
            <Car size={20} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white">
            Vroom<span className="text-ember-500">Go</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-white/70 transition hover:text-white">
            Home
          </Link>
          <Link to="/vehicles" className="text-sm font-medium text-white/70 transition hover:text-white">
            Browse Fleet
          </Link>
          <Link to="/#how-it-works" className="text-sm font-medium text-white/70 transition hover:text-white">
            How it Works
          </Link>
          <Link to="/#become-vendor" className="text-sm font-medium text-white/70 transition hover:text-white">
            List Your Vehicle
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="group relative">
              <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4 transition hover:bg-white/10">
                <img
                  src={
                    user.profilePicture && user.profilePicture !== "default-avatar.png"
                      ? getMediaUrl("profile_pictures", user.profilePicture)
                      : `https://ui-avatars.com/api/?background=ff7a1a&color=fff&name=${encodeURIComponent(user.fullName || "U")}`
                  }
                  alt={user.fullName}
                  className="h-7 w-7 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-white">{user.fullName?.split(" ")[0]}</span>
              </button>
              <div className="invisible absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-ink-800 p-2 opacity-0 shadow-card transition group-hover:visible group-hover:opacity-100">
                <Link
                  to={dashboardPathByRole[user.role] || "/"}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Link
                  to={`/${user.role}/profile`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  <User size={16} /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-white/10"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log In
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button className="text-white md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink-950 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/" onClick={() => setOpen(false)} className="text-white/80">
              Home
            </Link>
            <Link to="/vehicles" onClick={() => setOpen(false)} className="text-white/80">
              Browse Fleet
            </Link>
            {user ? (
              <>
                <Link to={dashboardPathByRole[user.role] || "/"} onClick={() => setOpen(false)} className="text-white/80">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="text-left text-rose-400">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="text-white/80">
                  Log In
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary w-fit">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
