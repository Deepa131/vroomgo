import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, ShieldCheck, Mail } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import CaptchaField from "../../components/CaptchaField";

const dashboardPathByRole = {
  customer: "/customer/dashboard",
  vendor: "/vendor/dashboard",
  admin: "/admin/dashboard",
};

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ captchaId: "", captchaText: "" });
  const captchaRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1 (password) vs step 2 (OTP) of the login flow. otpToken is the
  // short-lived, single-purpose token issued by /login once the password
  // checks out - it's what /verify-otp needs, it is NOT an access token.
  // otpMethod tells us whether step 2's code comes by email or from the
  // user's authenticator app (TOTP), so the screen can prompt correctly.
  const [otpToken, setOtpToken] = useState(null);
  const [otpMethod, setOtpMethod] = useState("email");
  const [otpCode, setOtpCode] = useState("");
  const [resending, setResending] = useState(false);

  const goToDashboard = (user) => {
    const redirectTo = location.state?.from?.pathname || dashboardPathByRole[user.role] || "/";
    navigate(redirectTo, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ ...form, ...captcha });
      if (res.requiresOtp) {
        // Password was correct, but we still need the second factor (email
        // code or authenticator app code) before a session is issued.
        setOtpToken(res.otpToken);
        setOtpMethod(res.method || "email");
        toast.success(res.message || "Verification required");
      } else if (res.success) {
        login(res.data);
        toast.success("Welcome back!");
        goToDashboard(res.data);
      } else {
        toast.error(res.message || "Login failed");
      }
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 423) {
        toast.error(data?.message || "Account temporarily locked. Please try again later.");
      } else if (data?.passwordExpired) {
        toast.error(data.message || "Your password has expired. Please reset it.");
        navigate("/forgot-password");
      } else {
        toast.error(data?.message || "Invalid email or password");
      }
      captchaRef.current?.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ otpToken, code: otpCode });
      if (res.success) {
        login(res.data);
        toast.success("Welcome back!");
        goToDashboard(res.data);
      } else {
        toast.error(res.message || "Invalid code");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const res = await authApi.resendOtp({ otpToken });
      if (res.success) {
        setOtpToken(res.otpToken);
        toast.success("A new code has been sent to your email");
      } else {
        toast.error(res.message || "Could not resend code");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  // OAuth login (Google): Google Identity Services returns a signed ID token
  // (credential) directly to the browser; we send it to the backend, which
  // independently verifies it with Google before issuing a session - the
  // frontend never has to know or check anything about its contents.
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(credentialResponse.credential);
      if (res.success) {
        login(res.data);
        toast.success("Welcome back!");
        goToDashboard(res.data);
      } else {
        toast.error(res.message || "Google sign-in failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  if (otpToken) {
    const isTotp = otpMethod === "totp";
    return (
      <div>
        <div className="flex items-center gap-2 text-ember-500">
          <ShieldCheck size={22} />
          <h1 className="font-display text-2xl font-bold text-white">Verify it's you</h1>
        </div>
        <p className="mt-1 text-sm text-white/50">
          {isTotp
            ? "Enter the 6-digit code from your authenticator app."
            : `Enter the 6-digit code we just emailed to ${form.email}. It expires in a few minutes.`}
        </p>

        <form onSubmit={handleVerifyOtp} className="mt-8 space-y-4">
          <div>
            <label className="label">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              className="input tracking-[0.5em] text-center text-lg"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <button type="submit" disabled={loading || otpCode.length !== 6} className="btn-primary w-full">
            <ShieldCheck size={18} />
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setOtpToken(null);
              setOtpCode("");
            }}
            className="text-white/50 hover:text-white"
          >
            Back to login
          </button>
          {!isTotp && (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="font-semibold text-ember-500 hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-white/50">Log in to book or manage your vehicles.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label">Email address</label>
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
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-ember-500 hover:underline">
            Forgot password?
          </Link>
        </div>

        <CaptchaField ref={captchaRef} onChange={setCaptcha} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <LogIn size={18} />
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-wide text-white/30">Or continue with</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mt-4 flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => toast.error("Google sign-in failed")}
          theme="filled_black"
          shape="pill"
        />
      </div>

      <div className="mt-4 text-center">
        <Link
          to="/login/magic-link"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
        >
          <Mail size={14} /> Sign in without a password
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-white/50">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-ember-500 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}