import { useEffect, useState } from "react";
import { Check, X, MapPin, Calendar, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { bookingApi } from "../../api/booking";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { getMediaUrl } from "../../api/axios";

export default function BookingRequests() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getVendorBookings(user._id || user.id, filter || undefined);
      if (res.success) setBookings(res.data);
    } catch (e) {
      toast.error("Failed to load booking requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateStatus = async (bookingId, status) => {
    try {
      await bookingApi.updateStatus(bookingId, status);
      toast.success(`Booking ${status}`);
      fetchBookings();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not update booking");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Booking Requests</h1>
          <p className="mt-1 text-white/50">Review and respond to customer requests.</p>
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
        <div className="card mt-8 p-12 text-center text-white/50">No booking requests found.</div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b) => (
            <div key={b._id} className="card p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <img
                    src={
                      b.vehicle?.images?.[0]
                        ? getMediaUrl("vehicle_images", b.vehicle.images[0])
                        : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=200&q=60"
                    }
                    className="h-20 w-28 rounded-lg object-cover"
                    alt=""
                  />
                  <div>
                    <h3 className="font-semibold text-white">{b.vehicle?.vehicleName || "Vehicle"}</h3>
                    <p className="mt-1 text-sm text-white/70">{b.customerName}</p>
                    <p className="flex items-center gap-1 text-xs text-white/50">
                      <Mail size={12} /> {b.customerEmail}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-white/50">
                      <Phone size={12} /> {b.customerPhone}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                      <Calendar size={12} />
                      {new Date(b.pickupDate).toLocaleDateString()} → {new Date(b.returnDate).toLocaleDateString()} · {b.pickupTime}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-white/50">
                      <MapPin size={12} /> {b.pickupLocation}
                    </p>
                    {b.message && <p className="mt-2 rounded-lg bg-white/5 p-2 text-xs italic text-white/60">"{b.message}"</p>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <StatusBadge status={b.status} />
                  <p className="font-display text-lg font-bold text-ember-500">${b.totalPrice}</p>

                  {b.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(b._id, "confirmed")} className="rounded-lg bg-teal-500/15 p-2 text-teal-400 hover:bg-teal-500/25" title="Confirm">
                        <Check size={16} />
                      </button>
                      <button onClick={() => updateStatus(b._id, "cancelled")} className="rounded-lg bg-rose-500/15 p-2 text-rose-400 hover:bg-rose-500/25" title="Reject">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {b.status === "confirmed" && (
                    <button onClick={() => updateStatus(b._id, "active")} className="btn-secondary text-xs">
                      Mark as Active
                    </button>
                  )}
                  {b.status === "active" && (
                    <button onClick={() => updateStatus(b._id, "completed")} className="btn-secondary text-xs">
                      Mark as Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
