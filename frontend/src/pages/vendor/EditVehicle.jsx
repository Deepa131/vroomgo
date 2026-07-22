import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { vehicleApi } from "../../api/vehicle";
import VehicleForm from "./VehicleForm";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function EditVehicle() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await vehicleApi.getById(id);
        if (res.success) {
          setInitialData({
            ...res.data,
            category: res.data.category?.id || res.data.category?._id || res.data.category,
          });
        }
      } catch (e) {
        toast.error("Vehicle not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!initialData) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/vendor/vehicles" className="mb-4 flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ArrowLeft size={16} /> Back to My Vehicles
      </Link>
      <h1 className="mb-6 font-display text-2xl font-bold text-white">Edit Vehicle</h1>
      <VehicleForm initialData={initialData} vehicleId={id} />
    </div>
  );
}
