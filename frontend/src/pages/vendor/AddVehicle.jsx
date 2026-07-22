import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import VehicleForm from "./VehicleForm";

export default function AddVehicle() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/vendor/vehicles" className="mb-4 flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ArrowLeft size={16} /> Back to My Vehicles
      </Link>
      <h1 className="mb-6 font-display text-2xl font-bold text-white">List a New Vehicle</h1>
      <VehicleForm />
    </div>
  );
}
