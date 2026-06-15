import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Plane, Moon, Sun, Lock } from "lucide-react";
import { GoogleAuthModal } from "./GoogleAuthModal";
import type { Role } from "../data/mockData";
import { useTheme } from "../hooks/useTheme";
import { lookupRoles } from "../lib/lookupRoles";
import type { AvailableRole } from "../App";

interface Props {
  onLogin: (available: AvailableRole[], initial: AvailableRole) => void;
}

export type AuthStep = "idle" | "checking" | "denied" | "success";

export function LoginScreen({ onLogin }: Props) {
  const { isDark, toggle } = useTheme();
  const [step, setStep]                 = useState<AuthStep>("idle");
  const [email, setEmail]               = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [matchedUser, setMatchedUser]   = useState<{ name: string; role: Role } | null>(null);

  const handleGoogleToken = async (accessToken: string) => {
    setStep("checking");
    try {
      const profile = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json());

      const googleEmail = (profile.email ?? "").trim().toLowerCase();
      const googleName  = profile.name ?? "";
      setEmail(googleEmail);

      const available = await lookupRoles(googleEmail, googleName);

      if (available.length === 0) {
        setDenialReason(
          `The Google account ${googleEmail} has not been assigned a role. Please contact your Super Admin.`
        );
        setStep("denied");
        return;
      }

      const initial = available[0];
      const displayName = initial.name || googleName;
      setMatchedUser({ name: displayName, role: initial.role });
      setStep("success");
      setTimeout(() => onLogin(available, { ...initial, name: displayName }), 1200);
    } catch {
      setDenialReason("Something went wrong during sign-in. Please try again.");
      setStep("denied");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => handleGoogleToken(tokenResponse.access_token),
    onError: () => {
      setDenialReason("Google sign-in was cancelled or failed. Please try again.");
      setStep("denied");
    },
  });

  const handleClose = () => { setStep("idle"); setEmail(""); };
  const handleRetry = () => { setStep("idle"); setEmail(""); googleLogin(); };

  const bgStyle: React.CSSProperties = {
    background:
      "radial-gradient(60% 50% at 85% 8%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 60%), radial-gradient(55% 45% at 8% 92%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 55%), var(--background)",
  };
  const emblemStyle: React.CSSProperties = {
    width: 76, height: 76, borderRadius: 24,
    background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-strong) 100%)",
    boxShadow: "0 10px 28px color-mix(in srgb, var(--accent) 38%, transparent)",
  };

  return (
    <div className="min-h-screen flex flex-col" style={bgStyle}>
      <div style={{ height: 4, background: "linear-gradient(90deg, var(--accent), var(--primary))" }} />

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
            <div className="flex items-center justify-center" style={emblemStyle}>
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

          <button
            onClick={() => googleLogin()}
            className="w-full flex items-center justify-center gap-3 mt-7 transition-all hover:shadow-warm-2"
            style={{
              background: "var(--surface)",
              color: "var(--head)",
              border: "1.5px solid var(--line)",
              borderRadius: "var(--r-sm)",
              padding: 13,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-line)";
              e.currentTarget.style.background = "var(--surface-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.background = "var(--surface)";
            }}
          >
            <GoogleColorIcon />
            Sign in with Google
          </button>

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

      {step !== "idle" && (
        <GoogleAuthModal
          step={step}
          email={email}
          denialReason={denialReason}
          matchedUser={matchedUser}
          onClose={handleClose}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}

function GoogleColorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
