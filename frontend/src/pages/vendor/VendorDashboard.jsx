import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Car, CalendarClock, DollarSign, Plus } from "lucide-react";
import { vehicleApi } from "../../api/vehicle";
import { bookingApi } from "../../api/booking";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { getMediaUrl } from "../../api/axios";

export default function VendorDashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [vRes, bRes] = await Promise.all([
          vehicleApi.getByVendor(user._id || user.id),
          bookingApi.getVendorBookings(user._id || user.id),
        ]);
        if (vRes.success) setVehicles(vRes.data);
        if (bRes.success) setBookings(bRes.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  const pendingRequests = bookings.filter((b) => b.status === "pending").length;
  const earnings = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Vendor Dashboard</h1>
          <p className="mt-1 text-white/50">Manage your fleet and booking requests.</p>
        </div>
        <Link to="/vendor/vehicles/add" className="btn-primary">
          <Plus size={18} /> Add Vehicle
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ember-500/15 text-ember-500">
            <Car size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{vehicles.length}</p>
            <p className="text-sm text-white/50">Listed Vehicles</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <CalendarClock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{pendingRequests}</p>
            <p className="text-sm text-white/50">Pending Requests</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">${earnings}</p>
            <p className="text-sm text-white/50">Total Earnings</p>
          </div>
        </div>
      </div>

      <div className="card mt-8 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Recent Booking Requests</h2>
          <Link to="/vendor/bookings" className="text-sm text-ember-500 hover:underline">View all</Link>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-white/50">No booking requests yet.</p>
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
                    <p className="text-sm font-medium text-white">{b.customerName}</p>
                    <p className="text-xs text-white/50">{b.vehicle?.vehicleName || "Vehicle"}</p>
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
