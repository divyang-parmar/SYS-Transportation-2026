import { useState, useEffect, useRef, type ReactNode } from "react";
import { UserPlus, Trash2, ShieldCheck, Truck, Users, Loader2, X, Mail, CheckCircle, LogOut, Bell, MessageSquare, FileText, Save, RotateCcw, ChevronDown, ChevronUp, Pencil, PlusCircle, Moon, Sun, Sparkles, Search, MapPin, KeyRound, Eye, EyeOff } from "lucide-react";
import { registeredUsers, type Role, type User } from "../data/mockData";
import { useTheme } from "../hooks/useTheme";
import { MandalsTab } from "./MandalsTab";
import { EventsTab } from "./EventsTab";
import { ActiveEventBadge } from "./ActiveEventBadge";

import { API_BASE, apiFetch } from "../lib/api";
const ADMIN_USERS_API = `${API_BASE}/admin-users`;
const SARTHI_API      = `${API_BASE}/sarthi`;
const EMAIL_API       = `${API_BASE}/email`;
const TEMPLATES_API   = `${API_BASE}/templates`;
const VEHICLES_API    = `${API_BASE}/vehicles`;

import { RoleSwitcher } from "./RoleSwitcher";
import type { AvailableRole } from "../App";

interface Props {
  onBack: () => void;
  currentRole?: Role;
  availableRoles?: AvailableRole[];
  onSwitchRole?: (role: Role) => void;
  superView?: "admin" | "ops";
  onSwitchSuperView?: (v: "admin" | "ops") => void;
}

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  transportation_admin: "Transportation Admin",
  driver: "Sarthi",
};

const roleBadge: Record<Role, string> = {
  super_admin: "badge--violet",
  transportation_admin: "badge--info",
  driver: "badge--ok",
};

type AdminTab = "users" | "templates" | "vehicles" | "mandals" | "events";
type TemplateChannel = "email" | "sms";

interface NotificationTemplate {
  id: string;
  channel: TemplateChannel;
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  deleted?: boolean;
}

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: "email-invite",
    channel: "email",
    name: "User Invitation",
    subject: "You're invited to SPS Airport Transportation Management App",
    body: `Hi {{name}},\n\nYou've been invited to the SPS Airport Transportation Management App as {{role}}.\n\nLogin with your email: {{email}}\n\nOpen the app at: {{app_url}}\n\nThis invitation was sent by a Super Admin. If you weren't expecting this, you can safely ignore this email.`,
    variables: ["name", "email", "role", "app_url"],
  },
  {
    id: "email-flight-assignment",
    channel: "email",
    name: "Flight Assignment",
    subject: "New flight assignment — {{flight_number}}",
    body: `Hi {{name}},\n\nYou have been assigned to flight {{flight_number}} arriving at {{arrival_time}}.\n\nPassengers: {{passenger_count}}\nPickup Location: {{pickup_location}}\n\nPlease confirm your availability in the app.\n\n— SPS Airport Transportation Team`,
    variables: ["name", "flight_number", "arrival_time", "passenger_count", "pickup_location"],
  },
  {
    id: "sms-invite",
    channel: "sms",
    name: "User Invitation",
    body: `Hi {{name}}, you've been added to SPS Transportation Team as {{role}}. Login with {{email}}.`,
    variables: ["name", "email", "role"],
  },
  {
    id: "sms-pickup-reminder",
    channel: "sms",
    name: "Pickup Reminder",
    body: `Reminder: You have a pickup at {{pickup_time}} for flight {{flight_number}}. {{passenger_count}} passengers. — SPS Airport Transportation Team`,
    variables: ["pickup_time", "flight_number", "passenger_count"],
  },
  {
    id: "sms-sarthi-assigned",
    channel: "sms",
    name: "Sarthi Assigned",
    body: `Dear {{passenger_name}}, your Sarthi {{sarthi_name}} will pick you up for flight {{flight_number}} on {{pickup_date}} at {{pickup_time}}.\n\nVehicle: {{vehicle_make}} {{vehicle_name}} ({{vehicle_number}})\nContact: {{sarthi_phone}}\n\n— SPS Airport Transportation Team`,
    variables: ["passenger_name", "sarthi_name", "sarthi_phone", "flight_number", "pickup_date", "pickup_time", "vehicle_make", "vehicle_name", "vehicle_number"],
  },
  {
    id: "email-sarthi-assigned",
    channel: "email",
    name: "Sarthi Assigned",
    subject: "Your Sarthi is on the way — {{flight_number}}",
    body: `Dear {{passenger_name}},\n\nYour Sarthi {{sarthi_name}} has been assigned to pick you up for flight {{flight_number}} on {{pickup_date}} at {{pickup_time}}.\n\nVehicle: {{vehicle_make}} {{vehicle_name}} ({{vehicle_number}})\nContact: {{sarthi_phone}}\n\nSee you soon!\n— SPS Airport Transportation Team`,
    variables: ["passenger_name", "sarthi_name", "sarthi_phone", "flight_number", "pickup_date", "pickup_time", "vehicle_make", "vehicle_name", "vehicle_number"],
  },
];

type VehicleOwnership = "rented" | "volunteer_provided" | "sarthi_owned";

interface Vehicle {
  id: string;
  make: string;
  name: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
  assignedDriverId?: string;
  ownership?: VehicleOwnership;
  ownerName?: string;
  ownerPhone?: string;
  ownerSarthiId?: string | null;
}

const OWNERSHIP_LABEL: Record<VehicleOwnership, string> = {
  rented: "Rented",
  volunteer_provided: "Volunteer-Provided",
  sarthi_owned: "Sarthi-Owned",
};

const OWNERSHIP_STYLE: Record<VehicleOwnership, { bg: string; color: string }> = {
  rented:             { bg: "color-mix(in srgb, #d97706 14%, var(--surface))", color: "#d97706" },
  volunteer_provided: { bg: "color-mix(in srgb, #16a34a 14%, var(--surface))", color: "#16a34a" },
  sarthi_owned:       { bg: "color-mix(in srgb, #7c3aed 14%, var(--surface))", color: "#7c3aed" },
};

interface ToastData {
  name: string;
  email: string;
  role: Role;
}

interface GroupedUser {
  email: string;
  name: string;
  phone?: string;
  roles: Role[];
  idByRole: Record<Role, string>;
}

interface EmailPreviewData {
  name: string;
  email: string;
  role: Role;
}

export function SuperAdminScreen({ onBack, currentRole, availableRoles, onSwitchRole, superView, onSwitchSuperView }: Props) {
  const { isDark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<User[]>(registeredUsers.filter((u) => u.role !== "transportation_admin" && u.role !== "driver"));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("driver");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [addError, setAddError] = useState("");
  const [conflictId, setConflictId] = useState<{ id: string; apiUrl: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreviewData | null>(null);
  const [previewContent, setPreviewContent] = useState<{ subject: string; body: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [roleEditUser, setRoleEditUser] = useState<GroupedUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<GroupedUser | null>(null);

  const groupedUsers: GroupedUser[] = (() => {
    const map = new Map<string, GroupedUser>();
    for (const u of users) {
      const key = u.email.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        if (!existing.roles.includes(u.role)) existing.roles.push(u.role);
        existing.idByRole[u.role] = u.id;
        if (!existing.phone && u.phone) existing.phone = u.phone;
      } else {
        map.set(key, {
          email: u.email,
          name: u.name,
          phone: u.phone,
          roles: [u.role],
          idByRole: { [u.role]: u.id } as Record<Role, string>,
        });
      }
    }
    return Array.from(map.values());
  })();

  const filtered = groupedUsers.filter((g) => {
    const matchSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === "all" || g.roles.includes(filterRole);
    return matchSearch && matchRole;
  });

  useEffect(() => {
    Promise.allSettled([
      apiFetch(`${ADMIN_USERS_API}/`).then((r) => r.json()),
      apiFetch(`${SARTHI_API}/`).then((r) => r.json()),
    ]).then(([taResult, sarthiResult]) => {
      const ta: User[]     = taResult.status     === "fulfilled" ? taResult.value     : [];
      const sarthi: User[] = sarthiResult.status === "fulfilled" ? sarthiResult.value : [];
      setUsers((prev) => [...prev, ...ta, ...sarthi]);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    setToastVisible(true);
    const timer = setTimeout(() => dismissToast(), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const dismissToast = () => {
    setToastVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  useEffect(() => {
    if (!emailPreview) { setPreviewContent(null); return; }

    const DEFAULT_SUBJECT = "You're invited to SPS Transportation App";
    const DEFAULT_BODY =
      "Hi {{name}},\n\nYou've been invited to the SPS Transportation App as {{role}}.\n\nLogin with your email: {{email}}\n\nOpen the app at: {{app_url}}\n\nThis invitation was sent by a Super Admin. If you weren't expecting this, you can safely ignore this email.";

    const vars: Record<string, string> = {
      name:    emailPreview.name,
      email:   emailPreview.email,
      role:    roleLabels[emailPreview.role] ?? emailPreview.role,
      app_url: "https://sps-transportation-2026.vercel.app/",
    };
    const sub = (t: string) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), t);

    setPreviewLoading(true);
    apiFetch(`${TEMPLATES_API}/`)
      .then((r) => r.json())
      .then((saved: NotificationTemplate[]) => {
        const tmpl = saved.find((t) => t.id === "email-invite" && !t.deleted);
        setPreviewContent({
          subject: sub(tmpl?.subject || DEFAULT_SUBJECT),
          body:    sub(tmpl?.body    || DEFAULT_BODY),
        });
      })
      .catch(() => {
        setPreviewContent({ subject: sub(DEFAULT_SUBJECT), body: sub(DEFAULT_BODY) });
      })
      .finally(() => setPreviewLoading(false));
  }, [emailPreview]);

  const handleAdd = async () => {
    if (!newEmail || !newName || isSending) return;
    if ((newRole === "driver" || newRole === "transportation_admin") && !newPhone) return;
    setIsSending(true);
    setAddError("");
    setConflictId(null);

    const finish = (newUser: User) => {
      setUsers((prev) => [...prev, newUser]);
      setToast({ name: newName, email: newEmail, role: newRole });
      setNewEmail("");
      setNewName("");
      setNewPhone("");
      setNewPassword("");
      setNewRole("driver");
      setRequirePhoto(false);
      setShowAddForm(false);
      setIsSending(false);
      setAddError("");
    };

    if (newRole === "transportation_admin" || newRole === "driver") {
      const apiUrl = newRole === "transportation_admin" ? ADMIN_USERS_API : SARTHI_API;
      try {
        const res = await apiFetch(`${apiUrl}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, email: newEmail, role: newRole, phone: newPhone, must_upload_photo: requirePhoto, ...(newPassword ? { password: newPassword } : {}) }),
        });
        if (res.ok) {
          const newUser = await res.json();
          apiFetch(`${EMAIL_API}/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, email: newEmail, role: newRole }),
          }).catch(() => {});
          finish(newUser);
        } else if (res.status === 409) {
          const body = await res.json().catch(() => ({}));
          setAddError(body.detail ?? `${newEmail} is already registered.`);
          if (body.existing_id) setConflictId({ id: body.existing_id, apiUrl });
          setIsSending(false);
        } else {
          setAddError("Something went wrong. Please try again.");
          setIsSending(false);
        }
      } catch {
        setAddError("Could not reach the server. Please try again.");
        setIsSending(false);
      }
    } else {
      setTimeout(() => {
        finish({ id: `u${Date.now()}`, name: newName, email: newEmail, role: newRole });
      }, 1500);
    }
  };

  const handleDelete = async (userId: string) => {
    const target = users.find((u) => u.id === userId);

    if (/^[0-9a-f]{24}$/.test(userId)) {
      let deleteUrl: string | null = null;
      if (target?.role === "transportation_admin") deleteUrl = `${ADMIN_USERS_API}/${userId}`;
      else if (target?.role === "driver")          deleteUrl = `${SARTHI_API}/${userId}`;

      if (deleteUrl) {
        try {
          const res = await apiFetch(deleteUrl, { method: "DELETE" });
          if (!res.ok) {
            setDeleteError(`Could not delete ${target?.name ?? "user"}. Please try again.`);
            setTimeout(() => setDeleteError(""), 4000);
            return;
          }
        } catch {
          setDeleteError("Could not reach the server. Please try again.");
          setTimeout(() => setDeleteError(""), 4000);
          return;
        }
      }
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleRename = async (user: User, patch: { name?: string; phone?: string }): Promise<{ ok: boolean; error?: string }> => {
    if (!/^[0-9a-f]{24}$/.test(user.id)) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...patch } : u)));
      return { ok: true };
    }
    const url =
      user.role === "driver" ? `${SARTHI_API}/${user.id}` :
      `${ADMIN_USERS_API}/${user.id}`;
    try {
      const res = await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.detail || "Already in use" };
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.error || `HTTP ${res.status}` };
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...(updated.name ? { name: updated.name } : {}), ...(updated.phone !== undefined ? { phone: updated.phone } : {}) } : u)));
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  };

  const handleSaveRoles = async (group: GroupedUser, nextRoles: Set<Role>): Promise<{ ok: boolean; error?: string }> => {
    const currentRoles = new Set(group.roles);
    const toAdd: Role[] = Array.from(nextRoles).filter((r) => !currentRoles.has(r));
    const toRemove: Role[] = Array.from(currentRoles).filter((r) => !nextRoles.has(r));

    for (const r of toAdd) {
      if (r === "super_admin") continue; // managed in code today
      if (r === "transportation_admin" && currentRoles.has("super_admin")) continue; // shared collection
      const apiUrl = r === "transportation_admin" ? ADMIN_USERS_API : SARTHI_API;
      try {
        const res = await apiFetch(`${apiUrl}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: group.name, email: group.email, role: r, phone: group.phone ?? "" }),
        });
        if (res.status === 409) {
          // already exists for this role — treat as success
          continue;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: body.detail || body.error || `Add ${roleLabels[r]} failed` };
        }
        const created = await res.json();
        setUsers((prev) => [...prev, { id: created.id ?? created._id ?? `tmp-${Date.now()}`, name: group.name, email: group.email, role: r, phone: group.phone }]);
      } catch {
        return { ok: false, error: "Network error" };
      }
    }

    for (const r of toRemove) {
      if (r === "super_admin") continue;
      const id = group.idByRole[r];
      if (!id) continue;
      const apiUrl = r === "transportation_admin" ? ADMIN_USERS_API : SARTHI_API;
      try {
        const res = await apiFetch(`${apiUrl}/${id}`, { method: "DELETE" });
        if (!res.ok) {
          return { ok: false, error: `Remove ${roleLabels[r]} failed` };
        }
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } catch {
        return { ok: false, error: "Network error" };
      }
    }
    return { ok: true };
  };

  const handleResetPassword = async (group: GroupedUser, password: string): Promise<{ ok: boolean; error?: string }> => {
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    const targets: { url: string; role: Role }[] = [];
    for (const r of group.roles) {
      const id = group.idByRole[r];
      if (!id || !/^[0-9a-f]{24}$/.test(id)) continue;
      if (r === "driver") targets.push({ url: `${SARTHI_API}/${id}`, role: r });
      else if (r === "transportation_admin" || r === "super_admin") targets.push({ url: `${ADMIN_USERS_API}/${id}`, role: r });
    }
    if (targets.length === 0) return { ok: false, error: "No backend record to update." };
    for (const t of targets) {
      try {
        const res = await apiFetch(t.url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: body.detail || body.error || `Reset ${roleLabels[t.role]} failed` };
        }
      } catch {
        return { ok: false, error: "Network error" };
      }
    }
    return { ok: true };
  };

  const counts = {
    total: groupedUsers.length,
    super_admin: groupedUsers.filter((g) => g.roles.includes("super_admin")).length,
    transportation_admin: groupedUsers.filter((g) => g.roles.includes("transportation_admin")).length,
    driver: groupedUsers.filter((g) => g.roles.includes("driver")).length,
  };

  const showPreviewNote = newName.trim() && newEmail.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="topbar">
        <div className="max-w-[1240px] w-full mx-auto px-7 flex items-center gap-3.5">
          <div className="brand-mark">
            <Sparkles className="w-[22px] h-[22px]" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold text-[var(--head)] leading-tight">Super Admin Panel</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.08em]">Manage roles and access</p>
          </div>
          <ActiveEventBadge />
          <div className="iconbtn" title="Super Admin">
            <ShieldCheck className="w-[18px] h-[18px] text-[var(--violet)]" />
          </div>
          {currentRole && availableRoles && onSwitchRole && (
            <RoleSwitcher current={currentRole} available={availableRoles} onSwitch={onSwitchRole} />
          )}
          {currentRole === "super_admin" && onSwitchSuperView && (
            <button
              onClick={() => onSwitchSuperView(superView === "ops" ? "admin" : "ops")}
              className="btn btn--ghost btn--sm"
              title="Switch view"
            >
              {superView === "ops" ? "Admin View" : "Operations View"}
            </button>
          )}
          <button onClick={toggle} className="iconbtn" title="Toggle theme">
            {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button onClick={onBack} className="iconbtn" title="Sign out">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tabbar">
        <div className="max-w-[1240px] w-full mx-auto px-7 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {([
            { id: "users" as AdminTab, label: "Users", icon: <Users className="w-4 h-4" /> },
            { id: "events" as AdminTab, label: "Events", icon: <Sparkles className="w-4 h-4" /> },
            { id: "templates" as AdminTab, label: "Notification Templates", icon: <Bell className="w-4 h-4" /> },
            { id: "vehicles" as AdminTab, label: "Vehicles", icon: <Truck className="w-4 h-4" /> },
            { id: "mandals" as AdminTab, label: "Mandals", icon: <MapPin className="w-4 h-4" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-7 py-7 space-y-6">
        {activeTab === "users" && (
          <>
            {/* Stats — 4 cards */}
            <div className="stats grid">
              <StatCard
                tone="accent"
                icon={<Users className="w-[18px] h-[18px]" />}
                label="Total Users"
                value={String(counts.total)}
                sub="across all roles"
              />
              <StatCard
                tone="violet"
                icon={<ShieldCheck className="w-[18px] h-[18px]" />}
                label="Super Admins"
                value={String(counts.super_admin)}
                sub="full access"
              />
              <StatCard
                tone="info"
                icon={<Users className="w-[18px] h-[18px]" />}
                label="Transport Admins"
                value={String(counts.transportation_admin)}
                sub="coordinators"
              />
              <StatCard
                tone="ok"
                icon={<Truck className="w-[18px] h-[18px]" />}
                label="Sarthis"
                value={String(counts.driver)}
                sub="field drivers"
              />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-warm"
                  style={{ paddingLeft: 36 }}
                />
              </div>
              {/* Segmented role filter */}
              <div
                className="flex items-center gap-0.5 p-1 rounded-[var(--r-sm)]"
                style={{ background: "var(--surface-3)", border: "1px solid var(--line)" }}
              >
                {(["all", "super_admin", "transportation_admin", "driver"] as (Role | "all")[]).map((r) => {
                  const labels: Record<Role | "all", string> = {
                    all: "All",
                    super_admin: "Super",
                    transportation_admin: "Transport",
                    driver: "Sarthi",
                  };
                  const active = filterRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setFilterRole(r)}
                      className="transition-all"
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "6px 11px",
                        borderRadius: 6,
                        background: active ? "var(--surface)" : "transparent",
                        color: active ? "var(--head)" : "var(--muted-foreground)",
                        boxShadow: active ? "var(--sh-1)" : "none",
                      }}
                    >
                      {labels[r]}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn--accent"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>

            {/* Add user form */}
            {showAddForm && (
              <div
                className="space-y-4"
                style={{
                  border: "1px dashed var(--accent)",
                  background: "var(--accent-tint)",
                  padding: 20,
                  borderRadius: "var(--r)",
                }}
              >
                <h3 className="text-[15px] font-semibold text-[var(--head)]">Add New User</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1.5">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="input-warm"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      placeholder="name@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="input-warm"
                    />
                  </div>
                  {(newRole === "driver" || newRole === "transportation_admin") && (
                    <div className="sm:col-span-2">
                      <label className="block mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+1 555 555 5555"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="input-warm"
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5">Password <span className="text-muted-foreground" style={{ fontWeight: 400 }}>(optional — enables email/password sign-in)</span></label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-warm"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5">Assign Role</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["transportation_admin", "driver"] as Role[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setNewRole(r)}
                        className="transition-colors"
                        style={{
                          padding: "8px 14px",
                          borderRadius: "var(--r-sm)",
                          fontSize: 13,
                          fontWeight: 600,
                          border: `1.5px solid ${newRole === r ? "var(--accent)" : "var(--line)"}`,
                          background: newRole === r ? "var(--accent)" : "var(--surface)",
                          color: newRole === r ? "#fff" : "var(--head)",
                        }}
                      >
                        {roleLabels[r]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer" style={{ marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={requirePhoto}
                    onChange={(e) => setRequirePhoto(e.target.checked)}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--head)" }}>
                    Require a profile photo on first login
                  </span>
                </label>

                {showPreviewNote && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--r-sm)]" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                    <Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--primary)]" />
                    <p className="text-[13px] text-[var(--head)]">
                      An invitation email will be sent to{" "}
                      <span className="font-semibold">{newEmail}</span>{" "}
                      granting them access as{" "}
                      <span className="font-semibold">{roleLabels[newRole]}</span>.
                    </p>
                  </div>
                )}

                {addError && (
                  <div className="px-3 py-2.5 space-y-2 rounded-[var(--r-sm)]" style={{ background: "var(--danger-tint)", border: "1px solid var(--danger)" }}>
                    <p className="text-sm text-[var(--danger)]">{addError}</p>
                    {conflictId && (
                      <button
                        onClick={async () => {
                          await apiFetch(`${conflictId.apiUrl}/${conflictId.id}`, { method: "DELETE" });
                          setAddError("");
                          setConflictId(null);
                          setUsers((prev) => prev.filter((u) => u.id !== conflictId.id));
                          handleAdd();
                        }}
                        className="btn btn--danger btn--sm"
                      >
                        Remove existing record &amp; re-add
                      </button>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddForm(false); setNewEmail(""); setNewName(""); setNewPhone(""); setNewPassword(""); setNewRole("driver"); setRequirePhoto(false); setAddError(""); setConflictId(null); }}
                    className="btn btn--ghost"
                    disabled={isSending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newEmail || !newName || isSending || ((newRole === "driver" || newRole === "transportation_admin") && !newPhone)}
                    className="btn btn--accent"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Add &amp; send invite
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {deleteError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--r-sm)]" style={{ background: "var(--danger-tint)", border: "1px solid var(--danger)" }}>
                <p className="text-sm text-[var(--danger)]">{deleteError}</p>
              </div>
            )}

            {/* User list */}
            <div className="card-warm overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--head)]">
                  {filtered.length} user{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No users found
                </div>
              ) : (
                <ul className="divide-y divide-[var(--line-soft)]">
                  {filtered.map((group) => (
                    <GroupedUserRow
                      key={group.email.toLowerCase()}
                      group={group}
                      onRename={(patch) => {
                        const primaryRole = group.roles[0];
                        const u = users.find((x) => x.id === group.idByRole[primaryRole]);
                        if (!u) return Promise.resolve({ ok: false, error: "Not found" });
                        return handleRename(u, patch);
                      }}
                      onEditRoles={() => setRoleEditUser(group)}
                      onResetPassword={() => setPasswordResetUser(group)}
                      onDeleteAll={async () => {
                        for (const r of group.roles) {
                          const id = group.idByRole[r];
                          if (id) await handleDelete(id);
                        }
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {activeTab === "templates" && <TemplatesTab />}

        {activeTab === "vehicles" && <VehiclesTab />}

        {activeTab === "mandals" && <MandalsTab />}

        {activeTab === "events" && <EventsTab />}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-80 card-warm shadow-warm-3 transition-all duration-300 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="stat-ic flex-shrink-0" style={{ background: "var(--ok-tint)", color: "var(--ok)", margin: 0, width: 32, height: 32 }}>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--head)]">Invitation sent!</p>
                <p className="text-muted-foreground truncate mt-0.5 text-xs">{toast.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge-pill ${roleBadge[toast.role]}`}>
                    {roleLabels[toast.role]}
                  </span>
                  <button
                    onClick={() => setEmailPreview({ name: toast.name, email: toast.email, role: toast.role })}
                    className="text-[var(--primary)] hover:underline text-xs"
                  >
                    Preview email →
                  </button>
                </div>
              </div>
              <button onClick={dismissToast} className="iconbtn" style={{ width: 28, height: 28 }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {emailPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(20,12,6,0.42)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEmailPreview(null); }}
        >
          <div className="card-warm shadow-warm-3 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-[15px] font-semibold text-[var(--head)]">Email Preview</span>
              </div>
              <button onClick={() => setEmailPreview(null)} className="iconbtn" style={{ width: 32, height: 32 }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-[var(--line)] space-y-1" style={{ background: "var(--surface-2)" }}>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground w-14 flex-shrink-0">From:</span>
                <span className="text-[var(--head)] font-medium">SPS Airport Transport App &lt;noreply@spsairporttransport.app&gt;</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground w-14 flex-shrink-0">To:</span>
                <span className="text-[var(--head)]">{emailPreview.email}</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground w-14 flex-shrink-0">Subject:</span>
                <span className="text-[var(--head)] font-medium">
                  {previewContent?.subject ?? "You're invited to SPS Transportation App"}
                </span>
              </div>
            </div>

            <div className="px-6 py-6 max-h-96 overflow-y-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  <span className={`badge-pill ${roleBadge[emailPreview.role]}`}>
                    {roleLabels[emailPreview.role]}
                  </span>
                  {(previewContent?.body ?? "").split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-[var(--ink)] m-0">
                      {para.split("\n").map((line, j, arr) => (
                        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                      ))}
                    </p>
                  ))}
                  <div className="pt-2">
                    <div className="btn btn--primary">
                      Open App →
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {roleEditUser && (
        <RoleEditModal
          group={roleEditUser}
          onClose={() => setRoleEditUser(null)}
          onSave={async (nextRoles) => {
            const res = await handleSaveRoles(roleEditUser, nextRoles);
            if (res.ok) setRoleEditUser(null);
            return res;
          }}
        />
      )}

      {passwordResetUser && (
        <PasswordResetModal
          group={passwordResetUser}
          onClose={() => setPasswordResetUser(null)}
          onSave={async (password) => {
            const res = await handleResetPassword(passwordResetUser, password);
            if (res.ok) setPasswordResetUser(null);
            return res;
          }}
        />
      )}
    </div>
  );
}

type Tone = "info" | "accent" | "ok" | "violet" | "warn";
const toneStyles: Record<Tone, { bg: string; color: string }> = {
  info:   { bg: "var(--info-tint)",   color: "var(--info)" },
  accent: { bg: "var(--accent-tint)", color: "var(--accent)" },
  ok:     { bg: "var(--ok-tint)",     color: "var(--ok)" },
  violet: { bg: "var(--violet-tint)", color: "var(--violet)" },
  warn:   { bg: "var(--warn-tint)",   color: "var(--warn)" },
};

function StatCard({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub: string; tone: Tone }) {
  const t = toneStyles[tone];
  return (
    <div className="stat">
      <div className="stat-ic" style={{ background: t.bg, color: t.color }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

const VEHICLE_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  SUV:     { bg: "color-mix(in srgb, #0C71C3 14%, var(--surface))", color: "#0C71C3" },
  Minivan: { bg: "color-mix(in srgb, #0C71C3 14%, var(--surface))", color: "#0C71C3" },
  Van:     { bg: "color-mix(in srgb, #16a34a 14%, var(--surface))", color: "#16a34a" },
  Sedan:   { bg: "color-mix(in srgb, #7c3aed 14%, var(--surface))", color: "#7c3aed" },
  Bus:     { bg: "color-mix(in srgb, #d97706 14%, var(--surface))", color: "#d97706" },
  Truck:   { bg: "color-mix(in srgb, #d97706 14%, var(--surface))", color: "#d97706" },
};

function VehiclesTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sarthiMap, setSarthiMap] = useState<Map<string, string>>(new Map());
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ make: "", name: "", vehicleNumber: "", type: "SUV", capacity: "7", ownership: "rented" as VehicleOwnership, ownerName: "", ownerPhone: "" });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState<{ make: string; name: string; vehicleNumber: string; type: string; capacity: number; ownership: VehicleOwnership; ownerName: string; ownerPhone: string }>({ make: "", name: "", vehicleNumber: "", type: "SUV", capacity: 7, ownership: "rented", ownerName: "", ownerPhone: "" });

  useEffect(() => {
    setVehiclesLoading(true);
    Promise.all([
      apiFetch(`${VEHICLES_API}/`).then((r) => r.json()),
      apiFetch(`${SARTHI_API}/`).then((r) => r.json()).catch(() => []),
    ])
      .then(([vehicleData, sarthiData]: [Vehicle[], { id: string; name: string }[]]) => {
        setVehicles(vehicleData);
        setSarthiMap(new Map((sarthiData ?? []).map((s) => [s.id, s.name])));
      })
      .catch(() => {})
      .finally(() => setVehiclesLoading(false));
  }, []);

  const handleAddVehicle = async () => {
    if (!vehicleForm.make || !vehicleForm.name || !vehicleForm.vehicleNumber) return;
    const res = await apiFetch(`${VEHICLES_API}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: vehicleForm.make,
        name: vehicleForm.name,
        vehicleNumber: vehicleForm.vehicleNumber,
        type: vehicleForm.type,
        capacity: parseInt(vehicleForm.capacity) || 7,
        ownership: vehicleForm.ownership,
        ownerName: vehicleForm.ownership === "volunteer_provided" ? vehicleForm.ownerName : "",
        ownerPhone: vehicleForm.ownership === "volunteer_provided" ? vehicleForm.ownerPhone : "",
      }),
    });
    if (res.ok) {
      const created: Vehicle = await res.json();
      setVehicles((prev) => [...prev, created]);
    }
    setVehicleForm({ make: "", name: "", vehicleNumber: "", type: "SUV", capacity: "7", ownership: "rented", ownerName: "", ownerPhone: "" });
    setShowAddVehicle(false);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const res = await apiFetch(`${VEHICLES_API}/${vehicleId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setEditVehicleForm({
      make: vehicle.make,
      name: vehicle.name,
      vehicleNumber: vehicle.vehicleNumber,
      type: vehicle.type,
      capacity: vehicle.capacity,
      ownership: vehicle.ownership ?? "rented",
      ownerName: vehicle.ownerName ?? "",
      ownerPhone: vehicle.ownerPhone ?? "",
    });
  };

  const handleSaveVehicle = async (vehicleId: string) => {
    const payload = {
      ...editVehicleForm,
      ownerName: editVehicleForm.ownership === "volunteer_provided" ? editVehicleForm.ownerName : "",
      ownerPhone: editVehicleForm.ownership === "volunteer_provided" ? editVehicleForm.ownerPhone : "",
    };
    const res = await apiFetch(`${VEHICLES_API}/${vehicleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated: Vehicle = await res.json();
      setVehicles((prev) => prev.map((v) => v.id === vehicleId ? updated : v));
    }
    setEditingVehicleId(null);
  };

  const fields: { key: "make" | "name" | "vehicleNumber"; label: string; placeholder: string }[] = [
    { key: "make", label: "Make", placeholder: "Toyota" },
    { key: "name", label: "Model / Name", placeholder: "Sienna" },
    { key: "vehicleNumber", label: "License Plate", placeholder: "ABC 1234" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[18px] font-semibold text-[var(--head)]">Fleet Vehicles</h2>
          {vehicles.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--primary-tint)] text-[var(--primary)]">
              {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowAddVehicle(!showAddVehicle); setEditingVehicleId(null); }}
          className="btn btn--accent"
        >
          <PlusCircle className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {showAddVehicle && (
        <div
          className="space-y-3"
          style={{
            border: "1px dashed var(--accent)",
            background: "var(--accent-tint)",
            padding: 20,
            borderRadius: "var(--r)",
          }}
        >
          <h3 className="text-[15px] font-semibold text-[var(--head)]">New Vehicle</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block mb-1.5">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={vehicleForm[key]}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, [key]: e.target.value })}
                  className="input-warm"
                />
              </div>
            ))}
            <div>
              <label className="block mb-1.5">Vehicle Type</label>
              <select
                value={vehicleForm.type}
                onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                className="input-warm"
              >
                {["SUV", "Minivan", "Van", "Bus", "Sedan", "Truck"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5">Seating Capacity</label>
              <select
                value={vehicleForm.capacity}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                className="input-warm"
              >
                {[4, 5, 6, 7, 8, 10, 12, 14, 20, 30].map((n) => <option key={n} value={n}>{n} seats</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5">Ownership</label>
              <select
                value={vehicleForm.ownership}
                onChange={(e) => setVehicleForm({ ...vehicleForm, ownership: e.target.value as VehicleOwnership })}
                className="input-warm"
              >
                <option value="rented">Rented for event</option>
                <option value="volunteer_provided">Volunteer-provided</option>
                <option value="sarthi_owned">Sarthi-owned</option>
              </select>
            </div>
            {vehicleForm.ownership === "volunteer_provided" && (
              <>
                <div>
                  <label className="block mb-1.5">Volunteer Name</label>
                  <input
                    type="text"
                    placeholder="Volunteer's full name"
                    value={vehicleForm.ownerName}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, ownerName: e.target.value })}
                    className="input-warm"
                  />
                </div>
                <div>
                  <label className="block mb-1.5">Volunteer Phone</label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={vehicleForm.ownerPhone}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, ownerPhone: e.target.value })}
                    className="input-warm"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddVehicle(false)} className="btn btn--ghost">Cancel</button>
            <button
              onClick={handleAddVehicle}
              disabled={!vehicleForm.make || !vehicleForm.name || !vehicleForm.vehicleNumber}
              className="btn btn--accent"
            >
              Add Vehicle
            </button>
          </div>
        </div>
      )}

      <div className="card-warm overflow-hidden">
        {vehiclesLoading ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading vehicles…</div>
        ) : vehicles.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">No vehicles added yet</div>
        ) : (
          <ul className="divide-y divide-[var(--line-soft)]">
            {vehicles.map((vehicle) => {
              const isEditing = editingVehicleId === vehicle.id;
              return (
                <li key={vehicle.id} className="px-5 py-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        {fields.map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label className="block mb-1.5">{label}</label>
                            <input
                              type="text"
                              placeholder={placeholder}
                              value={String(editVehicleForm[key])}
                              onChange={(e) => setEditVehicleForm({ ...editVehicleForm, [key]: e.target.value })}
                              className="input-warm"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block mb-1.5">Vehicle Type</label>
                          <select
                            value={editVehicleForm.type}
                            onChange={(e) => setEditVehicleForm({ ...editVehicleForm, type: e.target.value })}
                            className="input-warm"
                          >
                            {["SUV", "Minivan", "Van", "Bus", "Sedan", "Truck"].map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1.5">Seating Capacity</label>
                          <select
                            value={editVehicleForm.capacity}
                            onChange={(e) => setEditVehicleForm({ ...editVehicleForm, capacity: parseInt(e.target.value) })}
                            className="input-warm"
                          >
                            {[4, 5, 6, 7, 8, 10, 12, 14, 20, 30].map((n) => <option key={n} value={n}>{n} seats</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1.5">Ownership</label>
                          <select
                            value={editVehicleForm.ownership}
                            onChange={(e) => setEditVehicleForm({ ...editVehicleForm, ownership: e.target.value as VehicleOwnership })}
                            className="input-warm"
                          >
                            <option value="rented">Rented for event</option>
                            <option value="volunteer_provided">Volunteer-provided</option>
                            <option value="sarthi_owned">Sarthi-owned</option>
                          </select>
                        </div>
                        {editVehicleForm.ownership === "volunteer_provided" && (
                          <>
                            <div>
                              <label className="block mb-1.5">Volunteer Name</label>
                              <input
                                type="text"
                                placeholder="Volunteer's full name"
                                value={editVehicleForm.ownerName}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, ownerName: e.target.value })}
                                className="input-warm"
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5">Volunteer Phone</label>
                              <input
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={editVehicleForm.ownerPhone}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, ownerPhone: e.target.value })}
                                className="input-warm"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingVehicleId(null)} className="btn btn--ghost btn--sm">Cancel</button>
                        <button onClick={() => handleSaveVehicle(vehicle.id)} className="btn btn--primary btn--sm">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div
                        className="avatar-warm"
                        style={{
                          background: (VEHICLE_TYPE_STYLE[vehicle.type] ?? VEHICLE_TYPE_STYLE.SUV).bg,
                          color: (VEHICLE_TYPE_STYLE[vehicle.type] ?? VEHICLE_TYPE_STYLE.SUV).color,
                        }}
                      >
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[var(--head)] text-sm font-semibold">{vehicle.make} {vehicle.name}</p>
                          <span className="tag-chip">{vehicle.type}</span>
                          <span className="text-muted-foreground text-xs">{vehicle.capacity} seats</span>
                          {vehicle.ownership && (
                            <span
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                              style={{
                                background: OWNERSHIP_STYLE[vehicle.ownership].bg,
                                color: OWNERSHIP_STYLE[vehicle.ownership].color,
                              }}
                            >
                              {OWNERSHIP_LABEL[vehicle.ownership]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <p className="text-muted-foreground text-xs">{vehicle.vehicleNumber}</p>
                          {vehicle.ownership === "volunteer_provided" && vehicle.ownerName && (
                            <span className="text-xs text-muted-foreground">&#x2022; {vehicle.ownerName}{vehicle.ownerPhone ? ` (${vehicle.ownerPhone})` : ""}</span>
                          )}
                          {vehicle.assignedDriverId && sarthiMap.get(vehicle.assignedDriverId) ? (
                            <span className="text-xs text-[#16a34a] font-medium">
                              &#x2022; {sarthiMap.get(vehicle.assignedDriverId)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">&#x2022; Unassigned</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleEditVehicle(vehicle)} className="iconbtn" style={{ width: 34, height: 34 }} title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteVehicle(vehicle.id)} className="iconbtn" style={{ width: 34, height: 34 }} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [activeChannel, setActiveChannel] = useState<TemplateChannel>("email");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiFetch(`${TEMPLATES_API}/`)
      .then((r) => r.json())
      .then((saved: NotificationTemplate[]) => {
        setTemplates(
          DEFAULT_TEMPLATES.map((def) => {
            const fromDB = saved.find((s) => s.id === def.id);
            return fromDB ? { ...def, ...fromDB } : def;
          })
        );
        DEFAULT_TEMPLATES.forEach((def) => {
          if (!saved.find((s) => s.id === def.id)) {
            apiFetch(`${TEMPLATES_API}/${def.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: def.channel, name: def.name,
                subject: def.subject ?? null, body: def.body, variables: def.variables,
              }),
            }).catch(() => {});
          }
        });
      })
      .catch(() => {});
  }, []);

  const channelTemplates = templates.filter((t) => t.channel === activeChannel && !t.deleted);
  const deletedTemplates  = templates.filter((t) => t.channel === activeChannel && t.deleted);

  const startEdit = (t: NotificationTemplate) => {
    setEditingId(t.id);
    setDraftSubject(t.subject ?? "");
    setDraftBody(t.body);
    setExpandedId(t.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftSubject("");
    setDraftBody("");
  };

  const saveEdit = async (id: string) => {
    const t = templates.find((t) => t.id === id);
    if (!t || isSaving) return;
    setIsSaving(true);
    const updated: NotificationTemplate = { ...t, subject: draftSubject || undefined, body: draftBody };
    try {
      const res = await apiFetch(`${TEMPLATES_API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: updated.channel,
          name: updated.name,
          subject: updated.subject ?? null,
          body: updated.body,
          variables: updated.variables,
        }),
      });
      if (res.ok) {
        setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
        setEditingId(null);
        setSavedId(id);
        setTimeout(() => setSavedId(null), 2500);
      }
    } catch {}
    setIsSaving(false);
  };

  const resetTemplate = async (id: string) => {
    const original = DEFAULT_TEMPLATES.find((t) => t.id === id);
    if (!original) return;
    await apiFetch(`${TEMPLATES_API}/${id}`, { method: "DELETE" }).catch(() => {});
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...original } : t)));
    if (editingId === id) {
      setDraftSubject(original.subject ?? "");
      setDraftBody(original.body);
    }
  };

  const deleteTemplate = async (id: string) => {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    try {
      await apiFetch(`${TEMPLATES_API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: t.channel,
          name: t.name,
          subject: t.subject ?? null,
          body: t.body,
          variables: t.variables,
          deleted: true,
        }),
      });
    } catch {}
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, deleted: true } : t)));
    if (editingId === id) cancelEdit();
    if (expandedId === id) setExpandedId(null);
  };

  const restoreTemplate = async (id: string) => {
    const original = DEFAULT_TEMPLATES.find((t) => t.id === id);
    if (!original) return;
    await apiFetch(`${TEMPLATES_API}/${id}`, { method: "DELETE" }).catch(() => {});
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...original } : t)));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (editingId === id) cancelEdit();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-0.5 p-1 rounded-[var(--r-sm)]"
          style={{ background: "var(--surface-3)", border: "1px solid var(--line)" }}
        >
          {(["email", "sms"] as TemplateChannel[]).map((ch) => {
            const active = activeChannel === ch;
            return (
              <button
                key={ch}
                onClick={() => { setActiveChannel(ch); cancelEdit(); }}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "7px 14px",
                  borderRadius: 6,
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--head)" : "var(--muted-foreground)",
                  boxShadow: active ? "var(--sh-1)" : "none",
                }}
              >
                {ch === "email" ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                {ch === "email" ? "Email" : "SMS"}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {channelTemplates.length} template{channelTemplates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {channelTemplates.map((t) => {
        const isEditing = editingId === t.id;
        const isExpanded = expandedId === t.id;
        const isSaved = savedId === t.id;
        const isModified =
          t.body !== DEFAULT_TEMPLATES.find((d) => d.id === t.id)?.body ||
          (t.subject ?? "") !== (DEFAULT_TEMPLATES.find((d) => d.id === t.id)?.subject ?? "");

        return (
          <div key={t.id} className="card-warm overflow-hidden">
            <div
              className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              onClick={() => !isEditing && toggleExpand(t.id)}
              style={{ background: "var(--surface-2)" }}
            >
              <div
                className="stat-ic flex-shrink-0"
                style={{
                  margin: 0,
                  width: 32,
                  height: 32,
                  background: activeChannel === "email" ? "var(--info-tint)" : "var(--ok-tint)",
                  color: activeChannel === "email" ? "var(--info)" : "var(--ok)",
                }}
              >
                {activeChannel === "email"
                  ? <Mail className="w-4 h-4" />
                  : <MessageSquare className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[var(--head)]">{t.name}</p>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {activeChannel}
                  </span>
                  {isModified && (
                    <span className="badge-pill badge--warn">Modified</span>
                  )}
                  {isSaved && (
                    <span className="badge-pill badge--ok">
                      <CheckCircle className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                {t.subject && (
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    Subject: {t.subject}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                    className="btn btn--primary btn--sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {isModified && !isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); resetTemplate(t.id); }}
                    className="iconbtn"
                    style={{ width: 34, height: 34 }}
                    title="Reset to default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                    className="iconbtn"
                    style={{ width: 34, height: 34 }}
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-[var(--line)] px-5 py-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">Variables:</span>
                  {t.variables.map((v) => (
                    <span
                      key={v}
                      style={{
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: "11.5px",
                        color: "var(--primary)",
                        background: "var(--info-tint)",
                        padding: "2px 7px",
                        borderRadius: 6,
                      }}
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    {activeChannel === "email" && (
                      <div>
                        <label className="block mb-1.5">Subject</label>
                        <input
                          type="text"
                          value={draftSubject}
                          onChange={(e) => setDraftSubject(e.target.value)}
                          className="input-warm"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block mb-1.5">Body</label>
                      <textarea
                        value={draftBody}
                        onChange={(e) => setDraftBody(e.target.value)}
                        rows={8}
                        className="input-warm"
                        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, resize: "vertical" }}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="btn btn--ghost">Cancel</button>
                      <button
                        onClick={() => saveEdit(t.id)}
                        disabled={!draftBody.trim() || isSaving}
                        className="btn btn--primary"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isSaving ? "Saving…" : "Save Template"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {t.subject && (
                      <div className="mb-3 pb-3 border-b border-[var(--line)]">
                        <span className="text-xs text-muted-foreground font-medium">Subject: </span>
                        <span className="text-sm text-[var(--head)] font-semibold">{t.subject}</span>
                      </div>
                    )}
                    <pre className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed m-0" style={{ fontFamily: "inherit" }}>
                      {t.body}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {deletedTemplates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Deleted Templates
          </p>
          {deletedTemplates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 rounded-[var(--r-sm)]"
              style={{ border: "1px dashed var(--line)", background: "var(--surface-2)" }}
            >
              <div className="stat-ic" style={{ margin: 0, width: 28, height: 28, background: "var(--surface-3)", color: "var(--muted-foreground)" }}>
                {t.channel === "email"
                  ? <Mail className="w-3.5 h-3.5" />
                  : <MessageSquare className="w-3.5 h-3.5" />}
              </div>
              <p className="text-sm text-muted-foreground line-through flex-1">{t.name}</p>
              <button
                onClick={() => restoreTemplate(t.id)}
                className="btn btn--ghost btn--sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({
  user, roleLabel, roleBadgeClass, onRename, onDelete,
}: {
  user: User;
  roleLabel: string;
  roleBadgeClass: string;
  onRename: (patch: { name?: string; phone?: string }) => Promise<{ ok: boolean; error?: string }>;
  onDelete: () => void;
}) {
  const [editingField, setEditingField] = useState<"name" | "phone" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField === "name") setDraft(user.name);
    if (editingField === "phone") setDraft(user.phone ?? "");
    setRowError("");
    if (editingField) requestAnimationFrame(() => inputRef.current?.select());
  }, [editingField, user.name, user.phone]);

  const cancel = () => { setEditingField(null); setRowError(""); };

  const save = async () => {
    const next = draft.trim();
    const current = editingField === "name" ? user.name : (user.phone ?? "");
    if (editingField === "name" && !next) { cancel(); return; }
    if (next === current) { cancel(); return; }
    setSaving(true);
    const result = await onRename(editingField === "name" ? { name: next } : { phone: next });
    setSaving(false);
    if (!result.ok) {
      setRowError(result.error || "Save failed");
      return;
    }
    setEditingField(null);
  };

  return (
    <li className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--surface-2)] transition-colors group">
      <div className="avatar-warm">
        {user.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        {editingField === "name" ? (
          <InlineEditInput
            inputRef={inputRef}
            value={draft}
            saving={saving}
            error={rowError}
            placeholder="Full name"
            maxLength={160}
            onChange={(v) => { setDraft(v); setRowError(""); }}
            onSave={save}
            onCancel={cancel}
          />
        ) : (
          <button
            type="button"
            className="block w-full text-left truncate text-[var(--head)] text-sm font-semibold"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "text" }}
            onClick={() => setEditingField("name")}
            title="Click to rename"
          >
            {user.name}
          </button>
        )}
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        {editingField === "phone" ? (
          <div className="mt-1">
            <InlineEditInput
              inputRef={inputRef}
              value={draft}
              saving={saving}
              error={rowError}
              placeholder="+1 555 555 5555"
              maxLength={32}
              onChange={(v) => { setDraft(v); setRowError(""); }}
              onSave={save}
              onCancel={cancel}
            />
          </div>
        ) : (
          <button
            type="button"
            className="block text-left text-muted-foreground truncate text-xs"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "text" }}
            onClick={() => setEditingField("phone")}
            title={user.phone ? "Click to edit phone" : "Click to add phone"}
          >
            {user.phone || <span style={{ fontStyle: "italic" }}>add phone</span>}
          </button>
        )}
      </div>
      <span className={`badge-pill ${roleBadgeClass}`}>{roleLabel}</span>
      {editingField === null && (
        <button
          onClick={onDelete}
          className="iconbtn"
          style={{ width: 34, height: 34 }}
          title="Delete user"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

function GroupedUserRow({
  group, onRename, onEditRoles, onResetPassword, onDeleteAll,
}: {
  group: GroupedUser;
  onRename: (patch: { name?: string; phone?: string }) => Promise<{ ok: boolean; error?: string }>;
  onEditRoles: () => void;
  onResetPassword: () => void;
  onDeleteAll: () => void;
}) {
  const [editingField, setEditingField] = useState<"name" | "phone" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField === "name") setDraft(group.name);
    if (editingField === "phone") setDraft(group.phone ?? "");
    setRowError("");
    if (editingField) requestAnimationFrame(() => inputRef.current?.select());
  }, [editingField, group.name, group.phone]);

  const cancel = () => { setEditingField(null); setRowError(""); };

  const save = async () => {
    const next = draft.trim();
    const current = editingField === "name" ? group.name : (group.phone ?? "");
    if (editingField === "name" && !next) { cancel(); return; }
    if (next === current) { cancel(); return; }
    setSaving(true);
    const result = await onRename(editingField === "name" ? { name: next } : { phone: next });
    setSaving(false);
    if (!result.ok) {
      setRowError(result.error || "Save failed");
      return;
    }
    setEditingField(null);
  };

  return (
    <li className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--surface-2)] transition-colors group">
      <div className="avatar-warm">{group.name.charAt(0)}</div>
      <div className="flex-1 min-w-0">
        {editingField === "name" ? (
          <InlineEditInput
            inputRef={inputRef}
            value={draft}
            saving={saving}
            error={rowError}
            placeholder="Full name"
            maxLength={160}
            onChange={(v) => { setDraft(v); setRowError(""); }}
            onSave={save}
            onCancel={cancel}
          />
        ) : (
          <button
            type="button"
            className="block w-full text-left truncate text-[var(--head)] text-sm font-semibold"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "text" }}
            onClick={() => setEditingField("name")}
            title="Click to rename"
          >
            {group.name}
          </button>
        )}
        <p className="text-muted-foreground truncate text-xs">{group.email}</p>
        {editingField === "phone" ? (
          <div className="mt-1">
            <InlineEditInput
              inputRef={inputRef}
              value={draft}
              saving={saving}
              error={rowError}
              placeholder="+1 555 555 5555"
              maxLength={32}
              onChange={(v) => { setDraft(v); setRowError(""); }}
              onSave={save}
              onCancel={cancel}
            />
          </div>
        ) : (
          <button
            type="button"
            className="block text-left text-muted-foreground truncate text-xs"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "text" }}
            onClick={() => setEditingField("phone")}
            title={group.phone ? "Click to edit phone" : "Click to add phone"}
          >
            {group.phone || <span style={{ fontStyle: "italic" }}>add phone</span>}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {group.roles.map((r) => (
          <span key={r} className={`badge-pill ${roleBadge[r]}`}>{roleLabels[r]}</span>
        ))}
      </div>
      {editingField === null && (
        <>
          <button
            onClick={onEditRoles}
            className="iconbtn"
            style={{ width: 34, height: 34 }}
            title="Edit roles"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onResetPassword}
            className="iconbtn"
            style={{ width: 34, height: 34 }}
            title="Reset password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={onDeleteAll}
            className="iconbtn"
            style={{ width: 34, height: 34 }}
            title="Remove user from all roles"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </li>
  );
}

function RoleEditModal({
  group, onClose, onSave,
}: {
  group: GroupedUser;
  onClose: () => void;
  onSave: (nextRoles: Set<Role>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [selected, setSelected] = useState<Set<Role>>(new Set(group.roles));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (r: Role) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const save = async () => {
    if (selected.size === 0) {
      setErr("Pick at least one role, or use Delete to remove this user.");
      return;
    }
    setSaving(true);
    const res = await onSave(selected);
    setSaving(false);
    if (!res.ok) setErr(res.error || "Save failed");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,12,6,0.42)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card-warm shadow-warm-3 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <div>
            <p className="text-[15px] font-semibold text-[var(--head)]">{group.name}</p>
            <p className="text-xs text-muted-foreground">{group.email}</p>
          </div>
          <button onClick={onClose} className="iconbtn" style={{ width: 32, height: 32 }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">Roles</p>
          {(["super_admin", "transportation_admin", "driver"] as Role[]).map((r) => {
            const isSuper = r === "super_admin";
            const hasSuper = selected.has("super_admin");
            const disabled = isSuper || (r === "transportation_admin" && hasSuper);
            return (
              <label
                key={r}
                className="flex items-center gap-3 px-3 py-2 rounded-[var(--r-sm)]"
                style={{
                  background: selected.has(r) ? "var(--accent-tint)" : "var(--surface-2)",
                  border: `1px solid ${selected.has(r) ? "var(--accent-line)" : "var(--line)"}`,
                  opacity: disabled ? 0.55 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(r)}
                  disabled={disabled}
                  onChange={() => toggle(r)}
                />
                <span className="text-sm font-medium text-[var(--head)]">{roleLabels[r]}</span>
                {isSuper && (
                  <span className="ml-auto text-[11px] text-muted-foreground">configured in code</span>
                )}
                {r === "transportation_admin" && hasSuper && (
                  <span className="ml-auto text-[11px] text-muted-foreground">covered by Super Admin</span>
                )}
              </label>
            );
          })}
          <p className="text-[11px] text-muted-foreground mt-3" style={{ lineHeight: 1.5 }}>
            A user can be either Super Admin or Transportation Admin, plus Sarthi.
          </p>
          {err && (
            <p className="text-sm text-[var(--danger)] mt-2">{err}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--line)]">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn--accent" onClick={save} disabled={saving}>
            {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : (<><Save className="w-4 h-4" /> Save</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordResetModal({
  group, onClose, onSave,
}: {
  group: GroupedUser;
  onClose: () => void;
  onSave: (password: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const valid = pw.length >= 6 && pw === confirm;
  const mismatch = confirm.length > 0 && pw !== confirm;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setErr("");
    const res = await onSave(pw);
    setSaving(false);
    if (!res.ok) {
      setErr(res.error || "Reset failed");
      return;
    }
    setDone(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,12,6,0.42)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card-warm shadow-warm-3 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-[15px] font-semibold text-[var(--head)]">Reset password</p>
              <p className="text-xs text-muted-foreground">{group.name} · {group.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="iconbtn" style={{ width: 32, height: 32 }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {done ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--ok-tint)" }}>
              <CheckCircle className="w-6 h-6" style={{ color: "var(--ok)" }} />
            </div>
            <p className="text-sm font-semibold text-[var(--head)]">Password updated</p>
            <p className="text-xs text-muted-foreground mt-1">Share the new password with the user securely.</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              <p className="text-[12.5px] text-muted-foreground" style={{ lineHeight: 1.5 }}>
                The user will use this password the next time they sign in with email and password. They will not be notified automatically — share it securely.
              </p>
              <div>
                <label className="block mb-1.5">New password</label>
                <div className="flex items-stretch">
                  <input
                    type={show ? "text" : "password"}
                    className="input-warm flex-1"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setErr(""); }}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="iconbtn"
                    style={{ width: 38, marginLeft: 4 }}
                    title={show ? "Hide" : "Show"}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-1.5">Confirm</label>
                <input
                  type={show ? "text" : "password"}
                  className="input-warm"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErr(""); }}
                  placeholder="Re-enter the password"
                  autoComplete="new-password"
                />
                {mismatch && (
                  <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>Passwords don't match.</p>
                )}
              </div>
              {err && (
                <p className="text-sm text-[var(--danger)]">{err}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--line)]">
              <button className="btn btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn btn--accent" onClick={save} disabled={!valid || saving}>
                {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>) : (<><KeyRound className="w-4 h-4" /> Reset password</>)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InlineEditInput({
  inputRef, value, saving, error, placeholder, maxLength, onChange, onSave, onCancel,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  saving: boolean;
  error: string;
  placeholder: string;
  maxLength: number;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          className="input-warm flex-1"
          style={{ padding: "6px 10px", fontSize: 13 }}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onSave(); }
            if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          }}
          disabled={saving}
        />
        <button
          type="button"
          className="iconbtn"
          onClick={onSave}
          disabled={saving}
          style={{ width: 28, height: 28 }}
          title="Save"
          aria-label="Save"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--ok)" }} />}
        </button>
        <button
          type="button"
          className="iconbtn"
          onClick={onCancel}
          disabled={saving}
          style={{ width: 28, height: 28 }}
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
