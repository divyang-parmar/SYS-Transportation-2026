import { useState } from "react";
import { Plane, Moon, Sun, Lock } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { lookupRoles } from "../lib/lookupRoles";
import type { AvailableRole } from "../App";

interface Props {
  onLogin: (available: AvailableRole[], initial: AvailableRole) => void;
}

const BG_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(60% 50% at 85% 8%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 60%), radial-gradient(55% 45% at 8% 92%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 55%), var(--background)",
};

const TOP_BAR_STYLE: React.CSSProperties = {
  height: 4,
  background: "linear-gradient(90deg, var(--accent), var(--primary))",
};

const EMBLEM_STYLE: React.CSSProperties = {
  width: 76,
  height: 76,
  borderRadius: 24,
  background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-strong) 100%)",
  boxShadow: "0 10px 28px color-mix(in srgb, var(--accent) 38%, transparent)",
};

export function DevLoginScreen({ onLogin }: Props) {
  const { isDark, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState<AvailableRole[] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const found = await lookupRoles(email);
      if (found.length === 0) {
        setError(`No role found for ${email.trim().toLowerCase()}.`);
        return;
      }
      if (found.length === 1) {
        onLogin(found, found[0]);
      } else {
        setAvailable(found);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={BG_STYLE}>
      <div style={TOP_BAR_STYLE} />

      <button
        onClick={toggle}
        className="iconbtn fixed top-5 right-5"
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div
          className="w-full max-w-[392px] bg-surface border border-line"
          style={{ padding: "40px 34px 30px", borderRadius: "var(--r-xl)", boxShadow: "0 12px 40px rgba(40,25,10,0.16)" }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center" style={EMBLEM_STYLE}>
              <Plane className="text-white" style={{ width: 38, height: 38 }} strokeWidth={1.6} />
            </div>
            <h1
              className="mt-[18px]"
              style={{ fontSize: 24, fontWeight: 600, color: "var(--head)", letterSpacing: "-0.01em" }}
            >
              Suhradam Parivar Shibir
            </h1>
            <p
              className="mt-2 text-muted-foreground"
              style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}
            >
              Airport Transportation
            </p>
          </div>

          {available ? (
            <RoleChooser available={available} onPick={(r) => onLogin(available, r)} onCancel={() => setAvailable(null)} />
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
              <div
                className="text-xs font-semibold"
                style={{ background: "var(--warn-tint)", color: "var(--warn)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}
              >
                Dev mode — set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> to enable Google OAuth.
              </div>
              <label htmlFor="email" className="mt-1">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-warm"
              />
              <button type="submit" disabled={busy || !email} className="btn btn--accent w-full mt-1 justify-center">
                {busy ? "Signing in…" : "Continue"}
              </button>
              {error && (
                <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>
              )}
            </form>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 text-muted-foreground" style={{ fontSize: 12 }}>
            <Lock className="w-3.5 h-3.5" />
            Access is granted based on your assigned role
          </div>
        </div>

        <p className="mt-6 text-center text-muted-foreground" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          By signing in, you agree to our{" "}
          <a
            href="https://docs.google.com/document/d/1FvaXQblgTKI6oMFf9ciQ-mbHMAAHGALbzd4kueXtZ5A/edit?tab=t.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            SMS Terms &amp; Conditions
          </a>
          {" "}and{" "}
          <a
            href="https://docs.google.com/document/d/1FvaXQblgTKI6oMFf9ciQ-mbHMAAHGALbzd4kueXtZ5A/edit?tab=t.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  transportation_admin: "Transportation Admin",
  driver: "Sarthi (Driver)",
};

const ROLE_DESC: Record<string, string> = {
  super_admin: "Manage users, roles, templates, vehicles",
  transportation_admin: "Coordinate flight groups and assignments",
  driver: "View today's pickups",
};

function RoleChooser({
  available, onPick, onCancel,
}: {
  available: AvailableRole[];
  onPick: (r: AvailableRole) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-7 flex flex-col gap-3">
      <p className="text-center" style={{ fontSize: 13, color: "var(--ink)" }}>
        You have multiple roles. Pick one to continue:
      </p>
      <div className="flex flex-col gap-2">
        {available.map((r) => (
          <button
            key={r.role}
            type="button"
            onClick={() => onPick(r)}
            className="text-left transition-all hover:shadow-warm-2"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r)",
              padding: "12px 14px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-line)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--head)" }}>
              {ROLE_LABEL[r.role]}
            </div>
            <div className="text-muted-foreground" style={{ fontSize: 12, marginTop: 2 }}>
              {ROLE_DESC[r.role]}
            </div>
          </button>
        ))}
      </div>
      <button type="button" className="btn btn--ghost mt-1 justify-center" onClick={onCancel}>
        Use a different email
      </button>
    </div>
  );
}
