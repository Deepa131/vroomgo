import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { categoryApi } from "../../api/vehicle";
import LoadingSpinner from "../../components/LoadingSpinner";
import Modal from "../../components/Modal";

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ typeName: "", status: "active" });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.getAll();
      if (res.success) setCategories(res.data);
    } catch (e) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditingCategory(null);
    setForm({ typeName: "", status: "active" });
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setForm({ typeName: cat.typeName, status: cat.status });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = editingCategory
        ? await categoryApi.update(editingCategory.id, form)
        : await categoryApi.create(form);

      if (res.success) {
        toast.success(editingCategory ? "Category updated" : "Category created");
        setModalOpen(false);
        fetchCategories();
      } else {
        toast.error(res.message || "Failed to save category");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      await categoryApi.remove(id);
      toast.success("Category deleted");
      setCategories(categories.filter((c) => c.id !== id));
    } catch (e) {
      toast.error("Could not delete category. It may still be in use.");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Manage Categories</h1>
          <p className="mt-1 text-white/50">Configure vehicle categories shown to customers.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-white">{c.typeName}</p>
              <span className={`badge mt-1 ${c.status === "active" ? "bg-teal-500/15 text-teal-400" : "bg-white/10 text-white/50"}`}>
                {c.status}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(c.id)} className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <Modal title={editingCategory ? "Edit Category" : "Add Category"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Category Name</label>
              <input
                required
                className="input"
                value={form.typeName}
                onChange={(e) => setForm({ ...form, typeName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
