import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

const dashboardPathByRole = {
  customer: "/customer/dashboard",
  vendor: "/vendor/dashboard",
  admin: "/admin/dashboard",
};

export default function MagicLinkVerify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | error
  const [message, setMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const ranOnce = useRef(false);

  useEffect(() => {
    // StrictMode/dev double-invoke guard - a magic-link token is one-time
    // use, so a duplicate call would fail anyway, but this avoids a
    // confusing false "invalid link" error on the very first render.
    if (ranOnce.current) return;
    ranOnce.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("This sign-in link is missing its token.");
      return;
    }

    (async () => {
      try {
        const res = await authApi.magicLinkVerify(token);
        if (res.success) {
          login(res.data);
          toast.success("Welcome back!");
          navigate(dashboardPathByRole[res.data.role] || "/", { replace: true });
        } else {
          setStatus("error");
          setMessage(res.message || "This sign-in link is invalid.");
        }
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.message || "This sign-in link is invalid or has expired.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <ShieldCheck size={32} className="animate-pulse text-ember-500" />
        <p className="mt-4 text-white/70">Verifying your sign-in link...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <XCircle size={32} className="text-rose-400" />
      <p className="mt-4 text-white/70">{message}</p>
      <Link to="/login/magic-link" className="mt-6 text-sm font-semibold text-ember-500 hover:underline">
        Request a new sign-in link
      </Link>
    </div>
  );
}
