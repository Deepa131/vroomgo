import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Pencil, Trash2, Save, X as XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { bookingApi } from "../../api/booking";
import { getMediaUrl } from "../../api/axios";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

const toDateInputValue = (isoDate) => (isoDate ? new Date(isoDate).toISOString().slice(0, 10) : "");

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ pickupDate: "", returnDate: "", pickupTime: "", message: "" });

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getById(id);
      if (res.success) {
        setBooking(res.data);
        setForm({
          pickupDate: toDateInputValue(res.data.pickupDate),
          returnDate: toDateInputValue(res.data.returnDate),
          pickupTime: res.data.pickupTime || "",
          message: res.data.message || "",
        });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load this booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canModify = booking && ["pending", "confirmed"].includes(booking.status);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await bookingApi.update(id, form);
      if (res.success) {
        toast.success("Booking updated");
        setBooking(res.data);
        setEditing(false);
      } else {
        toast.error(res.message || "Could not update booking");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update booking");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this booking permanently? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await bookingApi.cancel(id);
      if (res.success) {
        toast.success("Booking deleted");
        navigate("/customer/bookings");
      } else {
        toast.error(res.message || "Could not delete booking");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete booking");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading booking..." />;

  if (!booking) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center text-white/60">
        Booking not found.
        <div className="mt-4">
          <Link to="/customer/bookings" className="btn-primary inline-flex">Back to My Bookings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/customer/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
        <ArrowLeft size={14} /> Back to My Bookings
      </Link>

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <img
            src={
              booking.vehicle?.images?.[0]
                ? getMediaUrl("vehicle_images", booking.vehicle.images[0])
                : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=200&q=60"
            }
            className="h-20 w-28 rounded-lg object-cover"
            alt=""
          />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-display text-xl font-bold text-white">{booking.vehicle?.vehicleName || "Vehicle"}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-white/50">
              <MapPin size={13} /> {booking.pickupLocation}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-ember-500">${booking.totalPrice}</p>
          </div>
        </div>

        {!editing ? (
          <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
            <p className="flex items-center gap-2 text-sm text-white/70">
              <Calendar size={14} className="text-white/40" />
              {new Date(booking.pickupDate).toLocaleDateString()} → {new Date(booking.returnDate).toLocaleDateString()} · {booking.pickupTime}
            </p>
            <p className="text-sm text-white/70">
              <span className="text-white/40">Duration: </span>
              {booking.totalDays} day{booking.totalDays > 1 ? "s" : ""}
            </p>
            {booking.message && (
              <p className="text-sm text-white/70">
                <span className="text-white/40">Note: </span>
                {booking.message}
              </p>
            )}

            {canModify && (
              <div className="flex gap-3 pt-4">
                <button onClick={() => setEditing(true)} className="btn-secondary">
                  <Pencil size={15} /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 size={15} /> {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
            {!canModify && (
              <p className="pt-4 text-xs text-white/40">
                This booking is {booking.status} and can no longer be edited or deleted.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4 border-t border-white/10 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Pickup date</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={form.pickupDate}
                  onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Return date</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={form.returnDate}
                  onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Pickup time</label>
              <input
                type="time"
                required
                className="input"
                value={form.pickupTime}
                onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Note (optional)</label>
              <textarea
                className="input"
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                <XIcon size={15} /> Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}