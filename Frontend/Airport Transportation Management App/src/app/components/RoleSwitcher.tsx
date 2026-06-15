import { useEffect, useRef, useState } from "react";
import { Repeat, ChevronDown, Check, ShieldCheck, Users, Truck } from "lucide-react";
import type { Role } from "../data/mockData";
import type { AvailableRole } from "../App";

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  transportation_admin: "Transportation Admin",
  driver: "Sarthi",
};

const ROLE_ICON: Record<Role, React.ReactNode> = {
  super_admin: <ShieldCheck className="w-4 h-4" />,
  transportation_admin: <Users className="w-4 h-4" />,
  driver: <Truck className="w-4 h-4" />,
};

interface Props {
  current: Role;
  available: AvailableRole[];
  onSwitch: (role: Role) => void;
}

export function RoleSwitcher({ current, available, onSwitch }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (available.length < 2) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="iconbtn"
        title={`Switch role (current: ${ROLE_LABEL[current]})`}
        aria-label="Switch role"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ width: "auto", padding: "0 10px", gap: 6 }}
      >
        <Repeat className="w-4 h-4" />
        <span className="hidden sm:inline" style={{ fontSize: 12.5, fontWeight: 600 }}>
          {ROLE_LABEL[current]}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 z-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r)",
            boxShadow: "var(--sh-3)",
            minWidth: 240,
            padding: 4,
          }}
        >
          <div
            className="px-3 py-2"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
            }}
          >
            Switch role
          </div>
          {available.map((r) => {
            const isCurrent = r.role === current;
            return (
              <button
                key={r.role}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) onSwitch(r.role);
                }}
                className="w-full flex items-center gap-3 transition-colors"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "10px 12px",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: "var(--accent)" }}>{ROLE_ICON[r.role]}</span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--head)" }}>
                    {ROLE_LABEL[r.role]}
                  </div>
                  <div className="text-muted-foreground truncate" style={{ fontSize: 12 }}>
                    {r.name}
                  </div>
                </div>
                {isCurrent && <Check className="w-4 h-4" style={{ color: "var(--ok)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
