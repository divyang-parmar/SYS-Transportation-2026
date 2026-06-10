import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Plane } from "lucide-react";
import { GoogleAuthModal } from "./GoogleAuthModal";
import { registeredUsers, type Role } from "../data/mockData";

import { API_BASE } from "../lib/api";
const ADMIN_USERS_API = `${API_BASE}/admin-users`;
const SARTHI_API      = `${API_BASE}/sarthi`;

interface Props {
  onLogin: (role: Role, name: string, id?: string) => void;
}

export type AuthStep = "idle" | "checking" | "denied" | "success";

export function LoginScreen({ onLogin }: Props) {
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

      const encoded = encodeURIComponent(googleEmail);
      const [sarthiRes, taRes] = await Promise.allSettled([
        fetch(`${SARTHI_API}/find-by-email?email=${encoded}`).then((r) => r.ok ? r.json() : null),
        fetch(`${ADMIN_USERS_API}/find-by-email?email=${encoded}`).then((r) => r.ok ? r.json() : null),
      ]);

      const sarthi = sarthiRes.status === "fulfilled" ? sarthiRes.value : null;
      const ta     = taRes.status     === "fulfilled" ? taRes.value     : null;

      let found: { name: string; role: Role; id?: string } | null = null;
      if (sarthi?.id) {
        found = { name: sarthi.name, role: "driver" as Role, id: sarthi.id };
      } else if (ta?.id) {
        found = { name: ta.name, role: ta.role as Role, id: ta.id };
      } else {
        const mock = registeredUsers.find((u) => u.email.toLowerCase() === googleEmail);
        if (mock) found = { name: mock.name, role: mock.role };
      }

      if (!found) {
        setDenialReason(
          `The Google account ${googleEmail} has not been assigned a role. Please contact your Super Admin.`
        );
        setStep("denied");
        return;
      }

      const displayName = found.name || googleName;
      setMatchedUser({ name: displayName, role: found.role });
      setStep("success");
      setTimeout(() => onLogin(found!.role, displayName, found!.id), 1200);
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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FEF2E6" }}>
      <div style={{ backgroundColor: "#0C71C3", height: "4px", width: "100%" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center mb-12">
          <div
            className="flex items-center justify-center mb-6"
            style={{ width: "96px", height: "96px", borderRadius: "50%", backgroundColor: "#FFEADE", border: "1px solid #CCCCCC" }}
          >
            <Plane className="w-10 h-10" style={{ color: "#0C71C3" }} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: "30px", fontWeight: 500, color: "#173D61", textAlign: "center", lineHeight: "30px", marginBottom: "8px" }}>
            Suhradam Parivar Shibir
          </h1>
          <p style={{ fontSize: "13px", color: "#999999", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Airport Transportation
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: "320px" }}>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CCCCCC",
              borderRadius: "4px",
              padding: "24px",
              boxShadow: "rgba(0,0,0,0.1) 0px 2px 5px 0px",
            }}
          >
            <p style={{ fontSize: "13px", color: "#999999", textAlign: "center", marginBottom: "16px" }}>
              Sign in to access your dashboard
            </p>

            <button
              onClick={() => googleLogin()}
              className="w-full flex items-center justify-center gap-3 cursor-pointer transition-colors"
              style={{
                backgroundColor: "#0C71C3",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px 24px",
                borderRadius: "4px",
                border: "none",
                lineHeight: "14px",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#067BC2"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0C71C3"; }}
            >
              <GoogleColorIcon />
              Sign in with Google
            </button>

            <p style={{ fontSize: "13px", color: "#999999", textAlign: "center", marginTop: "12px" }}>
              Access is granted based on your assigned role
            </p>
          </div>
        </div>
      </div>

      <div style={{ paddingBottom: "32px", textAlign: "center", fontSize: "13px", color: "#CCCCCC" }}>
        Suhradam Parivar Shibir · Transportation Management
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
