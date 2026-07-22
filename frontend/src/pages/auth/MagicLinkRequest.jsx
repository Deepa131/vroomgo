import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import CaptchaField from "../../components/CaptchaField";

export default function MagicLinkRequest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captcha, setCaptcha] = useState({ captchaId: "", captchaText: "" });
  const captchaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.magicLinkRequest({ email, ...captcha });
      setSent(true);
      toast.success(res.message || "Sign-in link sent if the email exists");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
      captchaRef.current?.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/login" className="mb-6 flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ArrowLeft size={16} /> Back to login
      </Link>
      <h1 className="font-display text-2xl font-bold text-white">Sign in without a password</h1>
      <p className="mt-1 text-sm text-white/50">
        Enter your email and we'll send you a one-time link to sign in. The link expires shortly
        and can only be used once.
      </p>

      {sent ? (
        <div className="mt-8 rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-300">
          If an account exists for <strong>{email}</strong>, a sign-in link has been sent.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              required
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <CaptchaField ref={captchaRef} onChange={setCaptcha} />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            <Mail size={18} />
            {loading ? "Sending..." : "Send Sign-In Link"}
          </button>
        </form>
      )}
    </div>
  );
}
