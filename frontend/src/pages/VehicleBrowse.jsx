import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { vehicleApi, categoryApi } from "../api/vehicle";
import { favoriteApi } from "../api/booking";
import VehicleCard from "../components/VehicleCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function VehicleBrowse() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [filters, setFilters] = useState({
    searchText: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    transmission: "",
    fuelType: "",
    minPrice: "",
    maxPrice: "",
  });

  useEffect(() => {
    categoryApi.getAll().then((res) => res.success && setCategories(res.data));
  }, []);

  useEffect(() => {
    if (user?.role === "customer") {
      favoriteApi.getMine().then((res) => {
        if (res.success) setFavorites(res.data.map((v) => v.id || v._id));
      }).catch(() => {});
    }
  }, [user]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const res = await vehicleApi.getAll(params);
      if (res.success) {
        setVehicles(res.data);
        setPages(res.pages || 1);
      }
    } catch (e) {
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = (e) => {
    e?.preventDefault();
    setPage(1);
    fetchVehicles();
  };

  const clearFilters = () => {
    setFilters({ searchText: "", category: "", transmission: "", fuelType: "", minPrice: "", maxPrice: "" });
    setSearchParams({});
    setPage(1);
    setTimeout(fetchVehicles, 0);
  };

  const toggleFavorite = async (vehicle) => {
    if (!user) {
      toast.error("Please log in to save favorites");
      return;
    }
    const id = vehicle.id || vehicle._id;
    try {
      if (favorites.includes(id)) {
        await favoriteApi.remove(id);
        setFavorites(favorites.filter((f) => f !== id));
        toast.success("Removed from favorites");
      } else {
        await favoriteApi.add(id);
        setFavorites([...favorites, id]);
        toast.success("Added to favorites");
      }
    } catch (e) {
      toast.error("Could not update favorites");
    }
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Browse the Fleet</h1>
        <p className="mt-1 text-white/50">Find the perfect vehicle for your next trip.</p>
      </div>

      <form onSubmit={applyFilters} className="card mb-8 flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            className="input pl-10"
            placeholder="Search by name, brand, or location..."
            value={filters.searchText}
            onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary shrink-0"
        >
          <SlidersHorizontal size={16} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {showFilters && (
        <div className="card mb-8 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.typeName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Transmission</label>
            <select
              className="input"
              value={filters.transmission}
              onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
            >
              <option value="">Any</option>
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="label">Fuel Type</label>
            <select
              className="input"
              value={filters.fuelType}
              onChange={(e) => setFilters({ ...filters, fuelType: e.target.value })}
            >
              <option value="">Any</option>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="label">Min Price / day</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Max Price / day</label>
            <input
              type="number"
              className="input"
              placeholder="1000"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
          </div>
          <div className="col-span-full flex justify-end gap-3">
            <button type="button" onClick={clearFilters} className="btn-ghost">
              <X size={16} /> Clear
            </button>
            <button type="button" onClick={applyFilters} className="btn-primary">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Finding the best rides..." />
      ) : vehicles.length ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id || v._id}
                vehicle={v}
                isFavorite={favorites.includes(v.id || v._id)}
                onToggleFavorite={user?.role === "customer" ? toggleFavorite : undefined}
              />
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                    p === page ? "bg-ember-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card p-12 text-center text-white/50">
          No vehicles match your search. Try adjusting your filters.
        </div>
      )}
    </div>
  );
}
