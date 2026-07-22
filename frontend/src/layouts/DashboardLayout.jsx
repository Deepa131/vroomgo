import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Car, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMediaUrl } from "../api/axios";

export default function DashboardLayout({ navItems, roleLabel }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ember-500 to-ember-700">
          <Car size={20} className="text-white" />
        </div>
        <span className="font-display text-xl font-bold text-white">
          Vroom<span className="text-ember-500">Go</span>
        </span>
      </Link>

      <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <img
            src={
              user?.profilePicture && user.profilePicture !== "default-avatar.png"
                ? getMediaUrl("profile_pictures", user.profilePicture)
                : `https://ui-avatars.com/api/?background=ff7a1a&color=fff&name=${encodeURIComponent(user?.fullName || "U")}`
            }
            alt={user?.fullName}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="text-xs capitalize text-ember-500">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-ember-500 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink-950">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-ink-900 lg:block">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-ink-900">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-ink-950/80 px-5 py-4 backdrop-blur lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-white">
            <Menu />
          </button>
          <span className="font-display font-bold text-white">
            Vroom<span className="text-ember-500">Go</span>
          </span>
          <div className="w-6" />
        </header>

        <main className="flex-1 p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
