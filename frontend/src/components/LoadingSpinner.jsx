export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/60">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-ember-500 border-t-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
