import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Heart, Search, Clock } from "lucide-react";
import { bookingApi, favoriteApi } from "../../api/booking";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { getMediaUrl } from "../../api/axios";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [bookingRes, favRes] = await Promise.all([
          bookingApi.getCustomerBookings(user._id || user.id),
          favoriteApi.getMine(),
        ]);
        if (bookingRes.success) setBookings(bookingRes.data);
        if (favRes.success) setFavoritesCount(favRes.data.length);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  const activeCount = bookings.filter((b) => ["pending", "confirmed", "active"].includes(b.status)).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Welcome back, {user.fullName?.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-white/50">Here's what's happening with your rentals.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ember-500/15 text-ember-500">
            <CalendarCheck size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{bookings.length}</p>
            <p className="text-sm text-white/50">Total Bookings</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-sm text-white/50">Active / Pending</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
            <Heart size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{favoritesCount}</p>
            <p className="text-sm text-white/50">Saved Favorites</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/vehicles" className="btn-primary">
          <Search size={18} /> Browse Vehicles
        </Link>
        <Link to="/customer/bookings" className="btn-secondary">
          View All Bookings
        </Link>
      </div>

      <div className="card mt-8 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Recent Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-white/50">You haven't made any bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 5).map((b) => (
              <div key={b._id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      b.vehicle?.images?.[0]
                        ? getMediaUrl("vehicle_images", b.vehicle.images[0])
                        : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=100&q=60"
                    }
                    className="h-12 w-16 rounded-md object-cover"
                    alt=""
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{b.vehicle?.vehicleName || "Vehicle"}</p>
                    <p className="text-xs text-white/50">
                      {new Date(b.pickupDate).toLocaleDateString()} → {new Date(b.returnDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
