import { Link } from "react-router-dom";
import { Car } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <Car size={48} className="text-ember-500" />
      <h1 className="mt-4 font-display text-4xl font-bold text-white">404</h1>
      <p className="mt-2 text-white/50">Looks like this road doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to Home
      </Link>
    </div>
  );
}
