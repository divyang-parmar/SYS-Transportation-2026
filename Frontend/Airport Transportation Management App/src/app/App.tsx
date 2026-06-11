import { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { LoginScreen } from "./components/LoginScreen";
import { SuperAdminScreen } from "./components/SuperAdminScreen";
import { TransportScreen } from "./components/TransportScreen";
import { DriverScreen } from "./components/DriverScreen";
import type { Role } from "./data/mockData";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

type Screen = "login" | "super_admin" | "transport_admin" | "driver";

interface AuthUser {
  name: string;
  role: Role;
  id?: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleLogin = (role: Role, name: string, id?: string) => {
    setAuthUser({ role, name, id });
    if (role === "super_admin") setScreen("super_admin");
    else if (role === "transportation_admin") setScreen("transport_admin");
    else if (role === "driver") setScreen("driver");
  };

  const handleLogout = () => {
    setAuthUser(null);
    setScreen("login");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <div className="size-full overflow-auto">
      {screen === "login" && (
        <LoginScreen onLogin={handleLogin} />
      )}
      {screen === "super_admin" && authUser && (
        <SuperAdminScreen onBack={handleLogout} />
      )}
      {screen === "transport_admin" && authUser && (
        <TransportScreen onBack={handleLogout} adminName={authUser.name} />
      )}
      {screen === "driver" && authUser && (
        <DriverScreen onBack={handleLogout} driverName={authUser.name} driverId={authUser.id} />
      )}
    </div>
    </GoogleOAuthProvider>
  );
}
