import { useEffect, useState } from "react";
import { ShieldOff, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import LoadingSpinner from "../../components/LoadingSpinner";

const TYPE_STYLES = {
  block: "bg-rose-500/15 text-rose-400",
  allow: "bg-emerald-500/15 text-emerald-400",
};

export default function ManageIpAccess() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ip: "", type: "block", reason: "" });

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getIpAccessList();
      if (res.success) setEntries(res.data);
    } catch (e) {
      toast.error("Failed to load IP access rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ip.trim()) {
      toast.error("Please enter an IP address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminApi.upsertIpAccess(form);
      if (res.success) {
        toast.success(res.message || "IP access rule saved");
        setForm({ ip: "", type: "block", reason: "" });
        fetchEntries();
      } else {
        toast.error(res.message || "Could not save rule");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this IP access rule?")) return;
    try {
      const res = await adminApi.deleteIpAccess(id);
      if (res.success) {
        toast.success("Rule removed");
        setEntries((prev) => prev.filter((e) => e._id !== id));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not remove rule");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <ShieldOff size={22} className="text-ember-500" />
        <h1 className="font-display text-2xl font-bold text-white">IP Access Control</h1>
      </div>
      <p className="mt-1 text-white/50">
        Manually block or allow-list specific IP addresses. Allow-listed IPs always bypass
        blocking and automatic brute-force lockouts. IPs that fail authentication repeatedly are
        also auto-blocked temporarily without any action needed here.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="label">IP address</label>
          <input
            className="input"
            placeholder="203.0.113.4"
            value={form.ip}
            onChange={(e) => setForm({ ...form, ip: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Rule</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="block">Block</option>
            <option value="allow">Allow</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Reason (optional)</label>
          <input
            className="input"
            placeholder="e.g. Repeated credential stuffing attempts"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>
        <div className="md:col-span-4">
          <button type="submit" disabled={submitting} className="btn-primary">
            <Plus size={16} />
            {submitting ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card mt-6 overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                    No manual IP rules yet.
                  </td>
                </tr>
              )}
              {entries.map((entry) => (
                <tr key={entry._id} className="border-b border-white/5">
                  <td className="px-4 py-3 font-mono text-white/80">{entry.ip}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${TYPE_STYLES[entry.type]}`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-white/60" title={entry.reason}>
                    {entry.reason || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/40">{entry.source}</td>
                  <td className="px-4 py-3 text-white/50">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(entry._id)}
                      className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                      title="Remove rule"
                    >
                      <Trash2 size={16} />
                    </button>
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
