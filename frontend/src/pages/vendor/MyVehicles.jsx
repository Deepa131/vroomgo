import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { vehicleApi } from "../../api/vehicle";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { getMediaUrl } from "../../api/axios";

export default function MyVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleApi.getByVendor(user._id || user.id);
      if (res.success) setVehicles(res.data);
    } catch (e) {
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this vehicle listing? This cannot be undone.")) return;
    try {
      await vehicleApi.remove(id);
      toast.success("Vehicle deleted");
      setVehicles(vehicles.filter((v) => (v.id || v._id) !== id));
    } catch (e) {
      toast.error("Could not delete vehicle");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">My Vehicles</h1>
          <p className="mt-1 text-white/50">Manage your listed fleet.</p>
        </div>
        <Link to="/vendor/vehicles/add" className="btn-primary">
          <Plus size={18} /> Add Vehicle
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-white/50">
          You haven't listed any vehicles yet.
          <div className="mt-4">
            <Link to="/vendor/vehicles/add" className="btn-primary inline-flex">Add Your First Vehicle</Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/50">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Rate/day</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id || v._id} className="border-t border-white/10">
                  <td className="flex items-center gap-3 px-4 py-3">
                    <img
                      src={
                        v.images?.[0]
                          ? getMediaUrl("vehicle_images", v.images[0])
                          : "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=100&q=60"
                      }
                      className="h-10 w-14 rounded-md object-cover"
                      alt=""
                    />
                    <span className="font-medium text-white">{v.vehicleName}</span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{v.category?.typeName}</td>
                  <td className="px-4 py-3 text-white/60">${v.dailyRate}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.approvalStatus} /></td>
                  <td className="px-4 py-3">
                    <span className={`badge ${v.isAvailable ? "bg-teal-500/15 text-teal-400" : "bg-white/10 text-white/50"}`}>
                      {v.isAvailable ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link to={`/vehicles/${v.id || v._id}`} className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10">
                        <Eye size={15} />
                      </Link>
                      <Link to={`/vendor/vehicles/edit/${v.id || v._id}`} className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10">
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => handleDelete(v.id || v._id)}
                        className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
