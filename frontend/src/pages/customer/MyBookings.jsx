import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, X, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { bookingApi } from "../../api/booking";
import { getMediaUrl } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getCustomerBookings(user._id || user.id, filter || undefined);
      if (res.success) setBookings(res.data);
    } catch (e) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleCancel = async (bookingId) => {
    if (!confirm("Cancel this booking request?")) return;
    try {
      await bookingApi.updateStatus(bookingId, "cancelled");
      toast.success("Booking cancelled");
      fetchBookings();
    } catch (e) {
      toast.error("Could not cancel booking");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">My Bookings</h1>
          <p className="mt-1 text-white/50">Track and manage your vehicle rental requests.</p>
        </div>
        <select className="input w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-white/50">
          No bookings found.
          <div className="mt-4">
            <Link to="/vehicles" className="btn-primary inline-flex">Browse Vehicles</Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b) => (
            <div key={b._id} className="card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={
                    b.vehicle?.images?.[0]
                      ? getMediaUrl("vehicle_images", b.vehicle.images[0])
                      : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=200&q=60"
                  }
                  className="h-16 w-24 rounded-lg object-cover"
                  alt=""
                />
                <div>
                  <h3 className="font-semibold text-white">{b.vehicle?.vehicleName || "Vehicle"}</h3>
                  <p className="flex items-center gap-1 text-xs text-white/50">
                    <MapPin size={12} /> {b.pickupLocation}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                    <Calendar size={12} />
                    {new Date(b.pickupDate).toLocaleDateString()} → {new Date(b.returnDate).toLocaleDateString()} · {b.pickupTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-ember-500">${b.totalPrice}</p>
                  <p className="text-xs text-white/40">{b.totalDays} day{b.totalDays > 1 ? "s" : ""}</p>
                </div>
                <StatusBadge status={b.status} />
                <Link
                  to={`/customer/bookings/${b._id}`}
                  className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10"
                  title="View booking"
                >
                  <Eye size={16} />
                </Link>
                {["pending", "confirmed"].includes(b.status) && (
                  <button
                    onClick={() => handleCancel(b._id)}
                    className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20"
                    title="Cancel booking"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}