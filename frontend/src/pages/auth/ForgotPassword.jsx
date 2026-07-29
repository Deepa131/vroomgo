import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import CaptchaField from "../../components/CaptchaField";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captcha, setCaptcha] = useState({ captchaId: "", captchaText: "" });
  const captchaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email, ...captcha });
      setSent(true);
      toast.success(res.message || "Reset link sent if the email exists");
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
      <h1 className="font-display text-2xl font-bold text-white">Forgot password?</h1>
      <p className="mt-1 text-sm text-white/50">
        Enter your email and we'll send you a link to reset your password.
      </p>

      {sent ? (
        <div className="mt-8 rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-300">
          If an account exists for <strong>{email}</strong>, a reset link has been sent.
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
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <div className="mt-4 text-center">
        <Link to="/login/magic-link" className="text-sm text-white/50 hover:text-white">
          Or sign in without a password
        </Link>
      </div>
    </div>
  );
}