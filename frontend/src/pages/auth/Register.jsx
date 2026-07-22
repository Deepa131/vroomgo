import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { getPhoneError } from "../../utils/validators";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/passwordPolicy";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";
import CaptchaField from "../../components/CaptchaField";

export default function Register() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "customer",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ captchaId: "", captchaText: "" });
  const captchaRef = useRef(null);
  const navigate = useNavigate();

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, phone: value });
    if (errors.phone) setErrors({ ...errors, phone: "" });
  };

  const handlePhoneBlur = () => {
    setErrors({ ...errors, phone: getPhoneError(form.phone) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneError = getPhoneError(form.phone);
    if (phoneError) {
      setErrors({ ...errors, phone: phoneError });
      toast.error(phoneError);
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!isStrongPassword(form.password)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({ ...form, ...captcha });
      if (res.success) {
        toast.success("Account created! Please log in.");
        navigate("/login");
      } else {
        toast.error(res.message || "Registration failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
      captchaRef.current?.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Create your account</h1>
      <p className="mt-1 text-sm text-white/50">Rent vehicles or list your own fleet in minutes.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input
            required
            className="input"
            placeholder="Enter full name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              placeholder="name@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              required
              inputMode="numeric"
              maxLength={10}
              className={`input ${errors.phone ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
              placeholder="98XXXXXXXX"
              value={form.phone}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="input pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthMeter password={form.password} />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="input pr-10"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="label">I want to</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "customer" })}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                form.role === "customer"
                  ? "border-ember-500 bg-ember-500/10 text-ember-400"
                  : "border-white/15 text-white/60 hover:border-white/30"
              }`}
            >
              Rent Vehicles
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "vendor" })}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                form.role === "vendor"
                  ? "border-ember-500 bg-ember-500/10 text-ember-400"
                  : "border-white/15 text-white/60 hover:border-white/30"
              }`}
            >
              List My Fleet
            </button>
          </div>
        </div>

        <CaptchaField ref={captchaRef} onChange={setCaptcha} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <UserPlus size={18} />
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-ember-500 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}