import { Link } from "react-router-dom";
import { Car, Facebook, Instagram, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink-950 py-10">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ember-500 to-ember-700">
                <Car size={18} className="text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white">
                Vroom<span className="text-ember-500">Go</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-white/50">
              A modern vehicle rental marketplace connecting drivers with trusted vendors, anywhere you need to go.
            </p>
            <div className="mt-4 flex gap-3 text-white/50">
              <Facebook size={18} className="hover:text-ember-500" />
              <Instagram size={18} className="hover:text-ember-500" />
              <Twitter size={18} className="hover:text-ember-500" />
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Explore</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/vehicles" className="hover:text-white">Browse Fleet</Link></li>
              <li><Link to="/register" className="hover:text-white">List Your Vehicle</Link></li>
              <li><Link to="/login" className="hover:text-white">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Company</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>About VroomGo</li>
              <li>Careers</li>
              <li>Trust & Safety</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Support</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Terms & Privacy</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} VroomGo. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
