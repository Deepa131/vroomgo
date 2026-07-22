import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import LoadingSpinner from "../../components/LoadingSpinner";
import Modal from "../../components/Modal";
import { getMediaUrl } from "../../api/axios";
import { getPhoneError } from "../../utils/validators";

const emptyForm = { fullName: "", email: "", password: "", phone: "", role: "customer" };

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllUsers({ limit: 100 });
      if (res.success) setUsers(res.data);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ fullName: user.fullName, email: user.email, phone: user.phone || "", role: user.role, password: "" });
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
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
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value !== undefined) formData.append(key, value);
      });

      const res = editingUser
        ? await adminApi.updateUser(editingUser._id, formData)
        : await adminApi.createUser(formData);

      if (res.success) {
        toast.success(editingUser ? "User updated" : "User created");
        setModalOpen(false);
        fetchUsers();
      } else {
        toast.error(res.message || "Failed to save user");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await adminApi.deleteUser(id);
      toast.success("User deleted");
      setUsers(users.filter((u) => u._id !== id));
    } catch (e) {
      toast.error("Could not delete user");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Manage Users</h1>
          <p className="mt-1 text-white/50">{users.length} registered users.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-white/10">
                <td className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={
                      u.profilePicture && u.profilePicture !== "default-avatar.png"
                        ? getMediaUrl("profile_pictures", u.profilePicture)
                        : `https://ui-avatars.com/api/?background=ff7a1a&color=fff&name=${encodeURIComponent(u.fullName)}`
                    }
                    className="h-8 w-8 rounded-full object-cover"
                    alt=""
                  />
                  <span className="font-medium text-white">{u.fullName}</span>
                </td>
                <td className="px-4 py-3 text-white/60">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-white/10 capitalize text-white/70">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-white/60">{u.phone || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(u._id)} className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title={editingUser ? "Edit User" : "Add User"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                disabled={!!editingUser}
                className="input disabled:opacity-50"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{editingUser ? "New Password (optional)" : "Password"}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={!editingUser}
                  className="input pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}