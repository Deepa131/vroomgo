import { createPortal } from "react-dom";

export default function LocationPermissionModal({ isOpen, loading, onJustThisTime, onAlways, onCancel }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-800 shadow-card">
        <div className="space-y-3 p-6">
          <h2 className="font-display text-lg font-semibold text-white">Allow VroomGo to access your location?</h2>
          <p className="text-sm text-white/60">
            We use your location to help pin pickup points and show nearby vehicles more accurately.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 p-4">
          <button onClick={onAlways} disabled={loading} className="btn-primary w-full text-sm disabled:opacity-60">
            Allow always
          </button>
          <button onClick={onJustThisTime} disabled={loading} className="btn-secondary w-full text-sm disabled:opacity-60">
            Just this time
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}