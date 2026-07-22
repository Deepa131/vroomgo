import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { favoriteApi } from "../../api/booking";
import VehicleCard from "../../components/VehicleCard";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function Favorites() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await favoriteApi.getMine();
      if (res.success) setVehicles(res.data);
    } catch (e) {
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemove = async (vehicle) => {
    const id = vehicle.id || vehicle._id;
    try {
      await favoriteApi.remove(id);
      setVehicles(vehicles.filter((v) => (v.id || v._id) !== id));
      toast.success("Removed from favorites");
    } catch (e) {
      toast.error("Could not remove favorite");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">My Favorites</h1>
      <p className="mt-1 text-white/50">Vehicles you've saved for later.</p>

      {loading ? (
        <LoadingSpinner />
      ) : vehicles.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-white/50">
          You haven't saved any vehicles yet.
          <div className="mt-4">
            <Link to="/vehicles" className="btn-primary inline-flex">Browse Vehicles</Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleCard key={v.id || v._id} vehicle={v} isFavorite onToggleFavorite={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
