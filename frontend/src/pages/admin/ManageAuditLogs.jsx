import { useEffect, useState } from "react";
import { ShieldAlert, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import { API_BASE_URL } from "../../api/axios";
import LoadingSpinner from "../../components/LoadingSpinner";

const ACTION_STYLES = {
  LOGIN_SUCCESS: "bg-emerald-500/15 text-emerald-400",
  REGISTER: "bg-emerald-500/15 text-emerald-400",
  PASSWORD_RESET: "bg-emerald-500/15 text-emerald-400",
  LOGOUT: "bg-white/10 text-white/60",
  PROFILE_UPDATE: "bg-sky-500/15 text-sky-400",
  PROFILE_EXPORT: "bg-sky-500/15 text-sky-400",
  PROFILE_IMPORT: "bg-sky-500/15 text-sky-400",
  PASSWORD_RESET_REQUESTED: "bg-sky-500/15 text-sky-400",
  MAGIC_LINK_REQUESTED: "bg-sky-500/15 text-sky-400",
  IP_MANUAL_ALLOWED: "bg-sky-500/15 text-sky-400",
  LOGIN_FAILED: "bg-amber-500/15 text-amber-400",
  OTP_FAILED: "bg-amber-500/15 text-amber-400",
  LOGIN_PASSWORD_EXPIRED: "bg-amber-500/15 text-amber-400",
  IP_MANUAL_BLOCKED: "bg-amber-500/15 text-amber-400",
  IP_RULE_REMOVED: "bg-amber-500/15 text-amber-400",
  ACCOUNT_LOCKED: "bg-rose-500/15 text-rose-400",
  LOGIN_BLOCKED_LOCKED: "bg-rose-500/15 text-rose-400",
  IP_AUTO_BLOCKED: "bg-rose-500/15 text-rose-400",
  SESSION_DEVICE_MISMATCH: "bg-rose-500/15 text-rose-400",
};

export default function ManageAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [live, setLive] = useState(false);

  const fetchLogs = async (targetPage) => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({ page: targetPage, limit: 25 });
      if (res.success) {
        setLogs(res.data);
        setMeta(res.meta);
      }
    } catch (e) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Real-time security monitoring: a live Server-Sent-Events feed of
  // high-severity events (see backend utils/alerts.js). Shown as toasts and
  // used to refresh page 1 so a just-fired alert appears in the table too.
  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/api/admin/alerts/stream`, {
      withCredentials: true,
    });

    source.addEventListener("ping", () => setLive(true));

    source.addEventListener("alert", (event) => {
      try {
        const payload = JSON.parse(event.data);
        toast(payload.message || payload.subject || "New security alert", { icon: "🔔" });
        if (page === 1) fetchLogs(1);
      } catch (e) {
        // ignore malformed event
      }
    });

    source.onerror = () => setLive(false);

    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2">
        <ShieldAlert size={22} className="text-ember-500" />
        <h1 className="font-display text-2xl font-bold text-white">Audit Trail</h1>
        {live && (
          <span className="ml-2 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-400">
            <Radio size={12} className="animate-pulse" /> Live
          </span>
        )}
      </div>
      <p className="mt-1 text-white/50">
        Security-relevant events: logins, lockouts, password resets and profile changes.
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card mt-6 overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">User Agent</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    No audit events yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        ACTION_STYLES[log.action] || "bg-white/10 text-white/60"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{log.email || "—"}</td>
                  <td className="px-4 py-3 text-white/50">{log.ip || "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-white/40" title={log.userAgent}>
                    {log.userAgent || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/50">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            className="rounded-lg border border-white/15 p-2 text-white/60 disabled:opacity-30"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-white/50">
            Page {page} of {meta.totalPages}
          </span>
          <button
            className="rounded-lg border border-white/15 p-2 text-white/60 disabled:opacity-30"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
