import { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { LoginScreen } from "./components/LoginScreen";
import { DevLoginScreen } from "./components/DevLoginScreen";
import { SuperAdminScreen } from "./components/SuperAdminScreen";
import { TransportScreen } from "./components/TransportScreen";
import { DriverScreen } from "./components/DriverScreen";
import { IntakeScreen } from "./components/IntakeScreen";
import { TrackingScreen } from "./components/TrackingScreen";
import type { Role } from "./data/mockData";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

type Screen = "login" | "super_admin" | "transport_admin" | "driver";

export interface AvailableRole {
  role: Role;
  name: string;
  id?: string;
}

interface AuthUser {
  name: string;
  role: Role;
  id?: string;
  available: AvailableRole[];
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isIntake, setIsIntake] = useState(() => window.location.pathname.startsWith("/intake"));
  const [isTrack, setIsTrack] = useState(() => window.location.pathname.startsWith("/track/"));

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      setIsIntake(window.location.pathname.startsWith("/intake"));
      setIsTrack(window.location.pathname.startsWith("/track/"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const screenFor = (r: Role): Screen =>
    r === "super_admin" ? "super_admin" : r === "transportation_admin" ? "transport_admin" : "driver";

  const handleLogin = (available: AvailableRole[], initial: AvailableRole) => {
    setAuthUser({ role: initial.role, name: initial.name, id: initial.id, available });
    setScreen(screenFor(initial.role));
  };

  const handleSwitchRole = (role: Role) => {
    if (!authUser) return;
    const next = authUser.available.find((a) => a.role === role);
    if (!next) return;
    setAuthUser({ role: next.role, name: next.name, id: next.id, available: authUser.available });
    setScreen(screenFor(next.role));
  };

  const handleLogout = () => {
    setAuthUser(null);
    setScreen("login");
  };

  const hasGoogle = GOOGLE_CLIENT_ID.length > 0;
  const loginNode = hasGoogle ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginScreen onLogin={handleLogin} />
    </GoogleOAuthProvider>
  ) : (
    <DevLoginScreen onLogin={handleLogin} />
  );

  if (isTrack) {
    return (
      <div className="size-full overflow-auto">
        <TrackingScreen />
      </div>
    );
  }

  if (isIntake) {
    return (
      <div className="size-full overflow-auto">
        <IntakeScreen />
      </div>
    );
  }

  return (
    <div className="size-full overflow-auto">
      {screen === "login" && loginNode}
      {screen === "super_admin" && authUser && (
        <SuperAdminScreen
          onBack={handleLogout}
          currentRole={authUser.role}
          availableRoles={authUser.available}
          onSwitchRole={handleSwitchRole}
        />
      )}
      {screen === "transport_admin" && authUser && (
        <TransportScreen
          onBack={handleLogout}
          adminName={authUser.name}
          currentRole={authUser.role}
          availableRoles={authUser.available}
          onSwitchRole={handleSwitchRole}
        />
      )}
      {screen === "driver" && authUser && (
        <DriverScreen
          onBack={handleLogout}
          driverName={authUser.name}
          driverId={authUser.id}
          currentRole={authUser.role}
          availableRoles={authUser.available}
          onSwitchRole={handleSwitchRole}
        />
      )}
    </div>
  );
}
