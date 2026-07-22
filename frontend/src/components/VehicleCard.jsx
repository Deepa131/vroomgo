import { Link } from "react-router-dom";
import { MapPin, Users, Fuel, Gauge, Heart } from "lucide-react";
import { getMediaUrl } from "../api/axios";

export default function VehicleCard({ vehicle, isFavorite, onToggleFavorite }) {
  const image = vehicle.images?.[0]
    ? getMediaUrl("vehicle_images", vehicle.images[0])
    : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=60";

  return (
    <div className="card group overflow-hidden transition hover:-translate-y-1 hover:border-ember-500/40">
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={image}
          alt={vehicle.vehicleName}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="badge bg-black/60 text-white backdrop-blur">
            {vehicle.category?.typeName || "Vehicle"}
          </span>
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(vehicle);
            }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur transition hover:bg-black/80"
          >
            <Heart
              size={18}
              className={isFavorite ? "fill-ember-500 text-ember-500" : "text-white"}
            />
          </button>
        )}
        {!vehicle.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="badge bg-rose-500/90 text-white">Not Available</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-white line-clamp-1">
            {vehicle.vehicleName}
          </h3>
        </div>
        <p className="mt-0.5 text-sm text-white/50">
          {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" · ") || "Details available on request"}
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-sm text-white/60">
          <MapPin size={14} className="text-ember-500" />
          <span className="line-clamp-1">{vehicle.location}</span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Users size={13} /> {vehicle.seatingCapacity || "-"}
          </span>
          <span className="flex items-center gap-1">
            <Fuel size={13} /> {vehicle.fuelType}
          </span>
          <span className="flex items-center gap-1">
            <Gauge size={13} /> {vehicle.transmission}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <div>
            <span className="font-display text-xl font-bold text-ember-500">
              ${vehicle.dailyRate}
            </span>
            <span className="text-xs text-white/50">/day</span>
          </div>
          <Link
            to={`/vehicles/${vehicle.id || vehicle._id}`}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember-500"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
