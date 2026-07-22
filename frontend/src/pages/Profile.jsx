import { useRef, useState } from "react";
import { Camera, Save, Download, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth";
import { getMediaUrl } from "../api/axios";
import { getPhoneError } from "../utils/validators";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    phone: user.phone || "",
  });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneError = getPhoneError(form.phone);
    if (phoneError) {
      setErrors({ ...errors, phone: phoneError });
      toast.error(phoneError);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("fullName", form.fullName);
      formData.append("phone", form.phone);
      if (file) formData.append("profilePicture", file);

      const res = await authApi.updateProfile(user._id || user.id, formData);
      if (res.success) {
        updateUser(res.data);
        toast.success("Profile updated successfully");
        setFile(null);
      } else {
        toast.error(res.message || "Failed to update profile");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc =
    preview ||
    (user.profilePicture && user.profilePicture !== "default-avatar.png"
      ? getMediaUrl("profile_pictures", user.profilePicture)
      : `https://ui-avatars.com/api/?background=ff7a1a&color=fff&size=128&name=${encodeURIComponent(user.fullName || "U")}`);

  // --- Data export/import (privacy-aligned data portability) ---

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await authApi.exportProfile();
      if (res.success) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vroomgo-profile-${user._id || user.id}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success("Your profile data has been downloaded");
      } else {
        toast.error(res.message || "Could not export your data");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not export your data");
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e) => {
    const importFile = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!importFile) return;

    setImporting(true);
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const res = await authApi.importProfile(parsed);
      if (res.success) {
        updateUser(res.data);
        setForm({ fullName: res.data.fullName || "", phone: res.data.phone || "" });
        toast.success(res.message || "Profile data imported successfully");
      } else {
        toast.error(res.message || "Could not import that file");
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error("That file isn't valid JSON");
      } else {
        toast.error(err.response?.data?.message || "Could not import that file");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-white">My Profile</h1>
      <p className="mt-1 text-white/50">Manage your personal information.</p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-6 p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <img src={avatarSrc} alt="avatar" className="h-24 w-24 rounded-full border-2 border-white/10 object-cover" />
            <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ember-500 text-white hover:bg-ember-600">
              <Camera size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <div>
            <p className="font-semibold text-white">{user.fullName}</p>
            <p className="text-sm text-white/50">{user.email}</p>
            <span className="badge mt-1 bg-white/10 capitalize text-white/70">{user.role}</span>
          </div>
        </div>

        <div>
          <label className="label">Full Name</label>
          <input
            className="input"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input className="input opacity-60" value={user.email} disabled />
          <p className="mt-1 text-xs text-white/30">Email cannot be changed.</p>
        </div>

        <div>
          <label className="label">Phone</label>
          <input
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="98XXXXXXXX"
            className={`input ${errors.phone ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
            value={form.phone}
            onChange={(e) => {
              setForm({ ...form, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: "" });
            }}
            onBlur={() => setErrors({ ...errors, phone: getPhoneError(form.phone) })}
          />
          {errors.phone && <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>}
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <div className="card mt-6 space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Your Data</h2>
          <p className="mt-1 text-sm text-white/50">
            Export a copy of your profile data, or import a previously exported file to restore
            your name and phone number. Only your name and phone number can be imported - your
            email, password and role can never be changed this way.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleExport} disabled={exporting} className="btn-secondary">
            <Download size={16} /> {exporting ? "Exporting..." : "Export my data"}
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary"
          >
            <Upload size={16} /> {importing ? "Importing..." : "Import profile data"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>
    </div>
  );
}