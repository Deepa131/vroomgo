import { X } from "lucide-react";
import { createPortal } from "react-dom";

export default function Modal({ title, onClose, children, maxWidth = "max-w-lg" }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={`card relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-6`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
