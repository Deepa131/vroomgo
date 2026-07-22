const STYLES = {
  pending: "bg-amber-500/15 text-amber-400",
  approved: "bg-teal-500/15 text-teal-400",
  confirmed: "bg-teal-500/15 text-teal-400",
  active: "bg-sky-500/15 text-sky-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-rose-500/15 text-rose-400",
  cancelled: "bg-rose-500/15 text-rose-400",
  archived: "bg-white/10 text-white/50",
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || "bg-white/10 text-white/60";
  return <span className={`badge capitalize ${style}`}>{status}</span>;
}
