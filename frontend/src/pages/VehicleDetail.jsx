import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Users,
  Fuel,
  Gauge,
  Phone,
  Heart,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { vehicleApi } from "../api/vehicle";
import { favoriteApi } from "../api/booking";
import { getMediaUrl } from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await vehicleApi.getById(id);
        if (res.success) setVehicle(res.data);
      } catch (e) {
        toast.error("Vehicle not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (user?.role === "customer") {
      favoriteApi.getMine().then((res) => {
        if (res.success) {
          setIsFavorite(res.data.some((v) => (v.id || v._id) === id));
        }
      }).catch(() => {});
    }
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please log in to save favorites");
      return;
    }
    try {
      if (isFavorite) {
        await favoriteApi.remove(id);
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        await favoriteApi.add(id);
        setIsFavorite(true);
        toast.success("Added to favorites");
      }
    } catch (e) {
      toast.error("Could not update favorites");
    }
  };

  const handleBookNow = () => {
    if (!user) {
      toast.error("Please log in to book this vehicle");
      navigate("/login");
      return;
    }
    if (user.role !== "customer") {
      toast.error("Only customer accounts can book vehicles");
      return;
    }
    navigate(`/vehicles/${id}/book`);
  };

  if (loading) return <LoadingSpinner label="Loading vehicle details..." />;
  if (!vehicle) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center text-white/60">
        Vehicle not found.
        <div className="mt-4">
          <Link to="/vehicles" className="btn-primary inline-flex">Back to Fleet</Link>
        </div>
      </div>
    );
  }

  const images = vehicle.images?.length ? vehicle.images : [null];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link to="/vehicles" className="mb-6 flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ArrowLeft size={16} /> Back to Fleet
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="relative h-96 overflow-hidden rounded-2xl">
            <img
              src={
                images[activeImage]
                  ? getMediaUrl("vehicle_images", images[activeImage])
                  : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
              }
              alt={vehicle.vehicleName}
              className="h-full w-full object-cover"
            />
            <button
              onClick={toggleFavorite}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur hover:bg-black/80"
            >
              <Heart size={20} className={isFavorite ? "fill-ember-500 text-ember-500" : "text-white"} />
            </button>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    idx === activeImage ? "border-ember-500" : "border-transparent opacity-60"
                  }`}
                >
                  <img src={getMediaUrl("vehicle_images", img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="card mt-8 p-6">
            <h2 className="font-display text-lg font-semibold text-white">About this vehicle</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/60">
              {vehicle.description || "No description provided by the vendor yet."}
            </p>

            {vehicle.features?.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-white">Features</h3>
                <div className="flex flex-wrap gap-2">
                  {vehicle.features.map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70">
                      <CheckCircle2 size={13} className="text-teal-400" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card sticky top-24 p-6">
            <span className="badge bg-ember-500/15 text-ember-400">{vehicle.category?.typeName}</span>
            <h1 className="mt-3 font-display text-2xl font-bold text-white">{vehicle.vehicleName}</h1>
            <p className="mt-1 text-sm text-white/50">
              {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" · ")}
            </p>

            <div className="mt-4 flex items-center gap-1.5 text-sm text-white/60">
              <MapPin size={15} className="text-ember-500" /> {vehicle.location}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-5 text-center">
              <div>
                <Users className="mx-auto mb-1 text-white/40" size={18} />
                <p className="text-xs text-white/50">{vehicle.seatingCapacity} Seats</p>
              </div>
              <div>
                <Fuel className="mx-auto mb-1 text-white/40" size={18} />
                <p className="text-xs capitalize text-white/50">{vehicle.fuelType}</p>
              </div>
              <div>
                <Gauge className="mx-auto mb-1 text-white/40" size={18} />
                <p className="text-xs capitalize text-white/50">{vehicle.transmission}</p>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between">
              <div>
                <span className="font-display text-3xl font-bold text-ember-500">${vehicle.dailyRate}</span>
                <span className="text-sm text-white/50"> /day</span>
              </div>
              {!vehicle.isAvailable && <span className="badge bg-rose-500/15 text-rose-400">Unavailable</span>}
            </div>

            <button
              onClick={handleBookNow}
              disabled={!vehicle.isAvailable}
              className="btn-primary mt-6 w-full"
            >
              <CalendarCheck size={18} /> Book This Vehicle
            </button>

            {vehicle.vendorContactNumber && (
              <a
                href={`tel:${vehicle.vendorContactNumber}`}
                className="btn-secondary mt-3 w-full"
              >
                <Phone size={16} /> Call Vendor: {vehicle.vendorContactNumber}
              </a>
            )}

            {vehicle.vendorId?.fullName && (
              <p className="mt-4 text-center text-xs text-white/40">
                Listed by <span className="text-white/70">{vehicle.vendorId.fullName}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
