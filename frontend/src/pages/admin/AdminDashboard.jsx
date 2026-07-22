import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Car, CalendarCheck, Clock } from "lucide-react";
import { adminApi } from "../../api/admin";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then((res) => res.success && setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "bg-ember-500/15 text-ember-500" },
    { label: "Total Vehicles", value: stats?.totalVehicles ?? 0, icon: Car, color: "bg-sky-500/15 text-sky-400" },
    { label: "Total Bookings", value: stats?.totalBookings ?? 0, icon: CalendarCheck, color: "bg-emerald-500/15 text-emerald-400" },
    { label: "Pending Approvals", value: stats?.pendingVehicles ?? 0, icon: Clock, color: "bg-amber-500/15 text-amber-400" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Admin Dashboard</h1>
      <p className="mt-1 text-white/50">Platform-wide overview of VroomGo.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.color}`}>
              <c.icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{c.value}</p>
              <p className="text-sm text-white/50">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Link to="/admin/users" className="card p-6 transition hover:border-ember-500/40">
          <h3 className="font-semibold text-white">Manage Users</h3>
          <p className="mt-1 text-sm text-white/50">Create, edit, and remove platform users.</p>
        </Link>
        <Link to="/admin/vehicles" className="card p-6 transition hover:border-ember-500/40">
          <h3 className="font-semibold text-white">Manage Vehicles</h3>
          <p className="mt-1 text-sm text-white/50">Approve, reject, or archive listings.</p>
        </Link>
        <Link to="/admin/categories" className="card p-6 transition hover:border-ember-500/40">
          <h3 className="font-semibold text-white">Manage Categories</h3>
          <p className="mt-1 text-sm text-white/50">Configure vehicle categories.</p>
        </Link>
      </div>
    </div>
  );
}
