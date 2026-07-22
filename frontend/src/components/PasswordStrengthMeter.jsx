import { getPasswordStrength, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy";

const BAR_COLORS = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const { score, label } = getPasswordStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score ? BAR_COLORS[score] : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-white/50">
        Strength: <span className="font-medium text-white/70">{label}</span> — {PASSWORD_POLICY_MESSAGE}
      </p>
    </div>
  );
}
