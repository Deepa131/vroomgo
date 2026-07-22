import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/passwordPolicy";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStrongPassword(form.password)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword(token, form);
      if (res.success) {
        toast.success("Password reset successful. Please log in.");
        navigate("/login");
      } else {
        toast.error(res.message || "Failed to reset password");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Set a new password</h1>
      <p className="mt-1 text-sm text-white/50">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            required
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <PasswordStrengthMeter password={form.password} />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            type="password"
            required
            className="input"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          <KeyRound size={18} />
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
