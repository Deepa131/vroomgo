import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarCheck, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { vehicleApi } from "../api/vehicle";
import { bookingApi } from "../api/booking";
import { getMediaUrl } from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { getPhoneError } from "../utils/validators";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function BookVehicle() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    customerName: user?.fullName || "",
    customerEmail: user?.email || "",
    customerPhone: user?.phone || "",
    pickupDate: "",
    returnDate: "",
    pickupTime: "10:00",
    pickupLocation: "",
    message: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await vehicleApi.getById(id);
        if (res.success) {
          setVehicle(res.data);
          setForm((f) => ({ ...f, pickupLocation: res.data.location }));
        }
      } catch (e) {
        toast.error("Vehicle not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const { totalDays, totalPrice } = useMemo(() => {
    if (!form.pickupDate || !form.returnDate || !vehicle) return { totalDays: 0, totalPrice: 0 };
    const start = new Date(form.pickupDate);
    const end = new Date(form.returnDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const days = diff > 0 ? diff : 0;
    return { totalDays: days, totalPrice: days * vehicle.dailyRate };
  }, [form.pickupDate, form.returnDate, vehicle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalDays <= 0) {
      toast.error("Return date must be after the pickup date");
      return;
    }

    const phoneError = getPhoneError(form.customerPhone);
    if (phoneError) {
      setErrors({ ...errors, customerPhone: phoneError });
      toast.error(phoneError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleId: id,
        vendorId: vehicle.vendorId?._id || vehicle.vendorId,
        customerId: user._id || user.id,
        ...form,
      };
      const res = await bookingApi.create(payload);
      if (res.success) {
        toast.success("Booking request sent to the vendor!");
        navigate("/customer/bookings");
      } else {
        toast.error(res.message || "Failed to book vehicle");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to book vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Preparing booking form..." />;
  if (!vehicle) return null;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link to={`/vehicles/${id}`} className="mb-6 flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ArrowLeft size={16} /> Back to vehicle
      </Link>

      <div className="card mb-8 flex items-center gap-4 p-4">
        <img
          src={
            vehicle.images?.[0]
              ? getMediaUrl("vehicle_images", vehicle.images[0])
              : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=400&q=60"
          }
          alt={vehicle.vehicleName}
          className="h-20 w-28 rounded-lg object-cover"
        />
        <div>
          <h2 className="font-display text-lg font-semibold text-white">{vehicle.vehicleName}</h2>
          <p className="flex items-center gap-1 text-sm text-white/50">
            <MapPin size={14} /> {vehicle.location}
          </p>
          <p className="mt-1 text-sm text-ember-500">${vehicle.dailyRate}/day</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <h3 className="font-display text-xl font-semibold text-white">Booking Details</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Pickup Date</label>
            <input
              type="date"
              required
              min={todayStr()}
              className="input"
              value={form.pickupDate}
              onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Return Date</label>
            <input
              type="date"
              required
              min={form.pickupDate || todayStr()}
              className="input"
              value={form.returnDate}
              onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Pickup Time</label>
            <input
              type="time"
              required
              className="input"
              value={form.pickupTime}
              onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Pickup Location</label>
          <input
            className="input"
            value={form.pickupLocation}
            onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Full Name</label>
            <input
              required
              className="input"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              required
              inputMode="numeric"
              maxLength={10}
              placeholder="98XXXXXXXX"
              className={`input ${errors.customerPhone ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
              value={form.customerPhone}
              onChange={(e) => {
                setForm({ ...form, customerPhone: e.target.value });
                if (errors.customerPhone) setErrors({ ...errors, customerPhone: "" });
              }}
              onBlur={() => setErrors({ ...errors, customerPhone: getPhoneError(form.customerPhone) })}
            />
            {errors.customerPhone && <p className="mt-1 text-xs text-rose-400">{errors.customerPhone}</p>}
          </div>
        </div>

        <div>
          <label className="label">Message to vendor (optional)</label>
          <textarea
            rows={3}
            className="input"
            placeholder="Any special requests..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>

        {totalDays > 0 && (
          <div className="rounded-xl border border-ember-500/30 bg-ember-500/10 p-4">
            <div className="flex justify-between text-sm text-white/70">
              <span>${vehicle.dailyRate} × {totalDays} day{totalDays > 1 ? "s" : ""}</span>
              <span>${totalPrice}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
              <span>Estimated Total</span>
              <span className="text-ember-500">${totalPrice}</span>
            </div>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          <CalendarCheck size={18} />
          {submitting ? "Submitting..." : "Confirm Booking Request"}
        </button>
      </form>
    </div>
  );
}