import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, X, Save } from "lucide-react";
import toast from "react-hot-toast";
import { vehicleApi, categoryApi } from "../../api/vehicle";
import { getMediaUrl } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import LocationPicker from "../../components/LocationPicker";
import { getPhoneError } from "../../utils/validators";

const FEATURE_OPTIONS = [
  "Air Conditioning",
  "Bluetooth",
  "GPS Navigation",
  "Backup Camera",
  "Sunroof",
  "Child Seat",
  "USB Charging",
  "Cruise Control",
];

export default function VehicleForm({ initialData, vehicleId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    vehicleName: "",
    brand: "",
    model: "",
    year: "",
    dailyRate: "",
    location: "",
    category: "",
    transmission: "automatic",
    fuelType: "petrol",
    seatingCapacity: 4,
    licensePlate: "",
    vendorContactNumber: user?.phone || "",
    description: "",
    features: [],
    images: [],
    locationCoords: null,
    ...initialData,
  });

  useEffect(() => {
    categoryApi.getAll().then((res) => {
      if (res.success) setCategories(res.data);
    });
  }, []);

  const toggleFeature = (feature) => {
    setForm((f) => ({
      ...f,
      features: f.features.includes(feature)
        ? f.features.filter((x) => x !== feature)
        : [...f.features, feature],
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImage(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const res = await vehicleApi.uploadImage(file);
        if (res.success) uploaded.push(res.data);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
      toast.success("Image(s) uploaded");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (img) => {
    setForm((f) => ({ ...f, images: f.images.filter((i) => i !== img) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleName || !form.dailyRate || !form.location || !form.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const phoneError = getPhoneError(form.vendorContactNumber);
    if (phoneError) {
      setErrors({ ...errors, vendorContactNumber: phoneError });
      toast.error(phoneError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        dailyRate: Number(form.dailyRate),
        seatingCapacity: Number(form.seatingCapacity),
        vendorId: user._id || user.id,
      };

      const res = vehicleId ? await vehicleApi.update(vehicleId, payload) : await vehicleApi.create(payload);

      if (res.success) {
        toast.success(vehicleId ? "Vehicle updated successfully" : "Vehicle submitted for approval");
        navigate("/vendor/vehicles");
      } else {
        toast.error(res.message || "Failed to save vehicle");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Basic Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Vehicle Name *</label>
            <input
              required
              className="input"
              placeholder="e.g. Toyota Corolla 2022"
              value={form.vehicleName}
              onChange={(e) => setForm({ ...form, vehicleName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Category *</label>
            <select
              required
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.typeName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Brand</label>
            <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <label className="label">Model</label>
            <input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <label className="label">Year</label>
            <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <div>
            <label className="label">License Plate</label>
            <input className="input" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Specifications</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Daily Rate ($) *</label>
            <input
              required
              type="number"
              min="0"
              className="input"
              value={form.dailyRate}
              onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Seating Capacity</label>
            <input
              type="number"
              min="1"
              className="input"
              value={form.seatingCapacity}
              onChange={(e) => setForm({ ...form, seatingCapacity: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Vendor Contact Number *</label>
            <input
              required
              inputMode="numeric"
              maxLength={10}
              placeholder="98XXXXXXXX"
              className={`input ${errors.vendorContactNumber ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
              value={form.vendorContactNumber}
              onChange={(e) => {
                setForm({ ...form, vendorContactNumber: e.target.value });
                if (errors.vendorContactNumber) setErrors({ ...errors, vendorContactNumber: "" });
              }}
              onBlur={() => setErrors({ ...errors, vendorContactNumber: getPhoneError(form.vendorContactNumber) })}
            />
            {errors.vendorContactNumber && (
              <p className="mt-1 text-xs text-rose-400">{errors.vendorContactNumber}</p>
            )}
          </div>
          <div>
            <label className="label">Transmission</label>
            <select className="input" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="label">Fuel Type</label>
            <select className="input" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Features</label>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((feature) => (
              <button
                type="button"
                key={feature}
                onClick={() => toggleFeature(feature)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  form.features.includes(feature)
                    ? "border-ember-500 bg-ember-500/15 text-ember-400"
                    : "border-white/15 text-white/50 hover:border-white/30"
                }`}
              >
                {feature}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Location</h2>
        <label className="label">Address / Location *</label>
        <LocationPicker
          onLocationSelect={(location, address) =>
            setForm({ ...form, location: address, locationCoords: location })
          }
          title="Select Vehicle Pickup Location"
          userId={user?._id || user?.id}
          defaultLocation={form.locationCoords ? { ...form.locationCoords, address: form.location } : undefined}
        />
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Photos</h2>
        <div className="flex flex-wrap gap-3">
          {form.images.map((img) => (
            <div key={img} className="relative h-24 w-32 overflow-hidden rounded-lg">
              <img src={getMediaUrl("vehicle_images", img)} className="h-full w-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => removeImage(img)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white/20 text-white/40 hover:border-ember-500 hover:text-ember-500">
            <ImagePlus size={20} />
            <span className="text-xs">{uploadingImage ? "Uploading..." : "Add Photo"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Description</h2>
        <textarea
          rows={4}
          className="input"
          placeholder="Describe the vehicle's condition, rules, mileage limits, etc."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
        <Save size={18} /> {saving ? "Saving..." : vehicleId ? "Update Vehicle" : "Submit for Approval"}
      </button>
    </form>
  );
}