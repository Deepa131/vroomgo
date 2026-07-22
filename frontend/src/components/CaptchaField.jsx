import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../api/auth";

/**
 * Renders the self-hosted SVG captcha (see backend utils/captcha.js) and
 * keeps track of the current captchaId + the text the user typed. The
 * parent form just spreads `{ captchaId, captchaText }` from this
 * component's onChange into its submit payload.
 *
 * Exposes `refresh()` via ref so a parent can force a new captcha after a
 * failed submit (the old captchaId is single-attempt in practice since a
 * wrong answer should not be retried against the same challenge).
 */
const CaptchaField = forwardRef(function CaptchaField({ onChange }, ref) {
  const [svg, setSvg] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setText("");
    try {
      const res = await authApi.getCaptcha();
      if (res.success) {
        setSvg(res.svg);
        setCaptchaId(res.captchaId);
      }
    } catch (err) {
      toast.error("Could not load captcha. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onChange?.({ captchaId, captchaText: text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaId, text]);

  useImperativeHandle(ref, () => ({ refresh: load }));

  return (
    <div>
      <label className="label">Security check</label>
      <div className="flex items-center gap-3">
        <div
          className="flex h-[60px] w-[160px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-900"
          aria-hidden={loading}
        >
          {loading ? (
            <span className="text-xs text-white/40">Loading...</span>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-white/15 p-2.5 text-white/60 hover:text-white"
          title="Get a new captcha"
          aria-label="Refresh captcha"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <input
        type="text"
        required
        autoComplete="off"
        className="input mt-2"
        placeholder="Type the characters above"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
});

export default CaptchaField;
