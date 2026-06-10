import { X, Loader2, ShieldX, CheckCircle2 } from "lucide-react";
import type { Role } from "../data/mockData";
import type { AuthStep } from "./LoginScreen";

const roleLabels: Record<Role, string> = {
  super_admin:          "Super Admin",
  transportation_admin: "Transportation Admin",
  driver:               "Sarthi",
};

interface Props {
  step: Exclude<AuthStep, "idle">;
  email: string;
  denialReason: string;
  matchedUser: { name: string; role: Role } | null;
  onClose: () => void;
  onRetry: () => void;
}

export function GoogleAuthModal({ step, email, denialReason, matchedUser, onClose, onRetry }: Props) {
  const canClose = step === "denied";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />

      <div
        className="relative w-full max-w-sm bg-white overflow-hidden"
        style={{ borderRadius: "4px", boxShadow: "rgba(0,0,0,0.15) 0px 4px 12px 0px" }}
      >
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Checking */}
        {step === "checking" && (
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-foreground" style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                Verifying access…
              </p>
              <p className="text-muted-foreground mt-1" style={{ fontSize: "0.78rem" }}>{email}</p>
            </div>
            <div className="w-full space-y-2.5 mt-1">
              <CheckRow label="Authenticated with Google" done />
              <CheckRow label="Looking up account in database" done />
              <CheckRow label="Fetching assigned role" loading />
            </div>
          </div>
        )}

        {/* Access Denied */}
        {step === "denied" && (
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <p className="text-foreground" style={{ fontSize: "1rem", fontWeight: 700 }}>Access Denied</p>
              <p className="text-muted-foreground mt-2 leading-relaxed" style={{ fontSize: "0.82rem" }}>
                {denialReason}
              </p>
            </div>
            {email && (
              <div className="w-full bg-destructive/5 border border-destructive/15 rounded-xl px-4 py-2.5">
                <p className="text-destructive" style={{ fontSize: "0.78rem" }}>{email}</p>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button
                onClick={onRetry}
                style={{
                  flex: 1, fontSize: "14px", fontWeight: 600,
                  padding: "12px 24px", borderRadius: "4px",
                  border: "2px solid #0C71C3", color: "#0C71C3",
                  backgroundColor: "#FFFFFF", cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, fontSize: "14px", fontWeight: 600,
                  padding: "12px 24px", borderRadius: "4px",
                  border: "none", backgroundColor: "#0C71C3",
                  color: "#FFFFFF", cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && matchedUser && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="text-foreground" style={{ fontSize: "1rem", fontWeight: 700 }}>
                Welcome, {matchedUser.name.split(" ")[0]}!
              </p>
              <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>
                Signed in as{" "}
                <span className="font-medium text-foreground">{roleLabels[matchedUser.role]}</span>
              </p>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: "100%" }} />
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              Redirecting to your dashboard…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckRow({ label, done, loading }: { label: string; done?: boolean; loading?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />
      ) : done ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-muted flex-shrink-0" />
      )}
      <span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>{label}</span>
    </div>
  );
}
