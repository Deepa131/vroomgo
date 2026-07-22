import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Archive, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { getMediaUrl } from "../../api/axios";

export default function ManageVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllVehicles({ limit: 100, ...(filter && { approvalStatus: filter }) });
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
  }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await adminApi.updateVehicleStatus(id, status);
      toast.success(`Vehicle ${status}`);
      fetchVehicles();
    } catch (e) {
      toast.error("Could not update vehicle status");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this vehicle permanently?")) return;
    try {
      await adminApi.deleteVehicle(id);
      toast.success("Vehicle deleted");
      setVehicles(vehicles.filter((v) => v._id !== id));
    } catch (e) {
      toast.error("Could not delete vehicle");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Manage Vehicles</h1>
          <p className="mt-1 text-white/50">{vehicles.length} listings on the platform.</p>
        </div>
        <select className="input w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Rate/day</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v._id} className="border-t border-white/10">
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
                <td className="px-4 py-3 text-white/60">{v.vendorId?.fullName || "-"}</td>
                <td className="px-4 py-3 text-white/60">${v.dailyRate}</td>
                <td className="px-4 py-3"><StatusBadge status={v.approvalStatus} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link to={`/vehicles/${v._id}`} className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10">
                      <Eye size={15} />
                    </Link>
                    {v.approvalStatus !== "approved" && (
                      <button onClick={() => updateStatus(v._id, "approved")} className="rounded-lg bg-teal-500/15 p-2 text-teal-400 hover:bg-teal-500/25" title="Approve">
                        <Check size={15} />
                      </button>
                    )}
                    {v.approvalStatus !== "rejected" && (
                      <button onClick={() => updateStatus(v._id, "rejected")} className="rounded-lg bg-amber-500/15 p-2 text-amber-400 hover:bg-amber-500/25" title="Reject">
                        <X size={15} />
                      </button>
                    )}
                    {v.approvalStatus !== "archived" && (
                      <button onClick={() => updateStatus(v._id, "archived")} className="rounded-lg bg-white/10 p-2 text-white/50 hover:bg-white/20" title="Archive">
                        <Archive size={15} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(v._id)} className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
