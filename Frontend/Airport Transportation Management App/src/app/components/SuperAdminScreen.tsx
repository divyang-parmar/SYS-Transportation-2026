import { useState, useEffect, type ReactNode } from "react";
import { UserPlus, Trash2, ShieldCheck, Truck, Users, Loader2, X, Mail, CheckCircle, LogOut, Bell, MessageSquare, FileText, Save, RotateCcw, ChevronDown, ChevronUp, Pencil, PlusCircle, Moon, Sun } from "lucide-react";
import { registeredUsers, type Role, type User } from "../data/mockData";
import { useTheme } from "../hooks/useTheme";

import { API_BASE } from "../lib/api";
const ADMIN_USERS_API = `${API_BASE}/admin-users`;
const SARTHI_API      = `${API_BASE}/sarthi`;
const EMAIL_API       = `${API_BASE}/email`;
const TEMPLATES_API   = `${API_BASE}/templates`;
const VEHICLES_API    = `${API_BASE}/vehicles`;

interface Props {
  onBack: () => void;
}

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  transportation_admin: "Transportation Admin",
  driver: "Sarthi",
};

const roleColors: Record<Role, string> = {
  super_admin: "bg-purple-100 text-purple-700 border border-purple-200",
  transportation_admin: "bg-blue-100 text-blue-700 border border-blue-200",
  driver: "bg-green-100 text-green-700 border border-green-200",
};

const accessDescriptions: Record<Role, string> = {
  super_admin: "Full access to manage users, roles, and all transportation operations across the platform.",
  transportation_admin: "Access to manage flight groups, assign drivers, and coordinate passenger transport operations.",
  driver: "Access to view your assigned passenger pickups and manage your transportation tasks.",
};

type AdminTab = "users" | "templates" | "vehicles";
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
    subject: "You're invited to Airport Transportation Management App",
    body: `Hi {{name}},\n\nYou've been invited to the Airport Transportation Management App as {{role}}.\n\nLogin with your email: {{email}}\n\nOpen the app at: {{app_url}}\n\nThis invitation was sent by a Super Admin. If you weren't expecting this, you can safely ignore this email.`,
    variables: ["name", "email", "role", "app_url"],
  },
  {
    id: "email-flight-assignment",
    channel: "email",
    name: "Flight Assignment",
    subject: "New flight assignment — {{flight_number}}",
    body: `Hi {{name}},\n\nYou have been assigned to flight {{flight_number}} arriving at {{arrival_time}}.\n\nPassengers: {{passenger_count}}\nPickup Location: {{pickup_location}}\n\nPlease confirm your availability in the app.\n\n— Airport Transportation Team`,
    variables: ["name", "flight_number", "arrival_time", "passenger_count", "pickup_location"],
  },
  {
    id: "sms-invite",
    channel: "sms",
    name: "User Invitation",
    body: `Hi {{name}}, you've been added to Airport Transportation App as {{role}}. Login with {{email}}.`,
    variables: ["name", "email", "role"],
  },
  {
    id: "sms-pickup-reminder",
    channel: "sms",
    name: "Pickup Reminder",
    body: `Reminder: You have a pickup at {{pickup_time}} for flight {{flight_number}}. {{passenger_count}} passengers. — Airport Transport`,
    variables: ["pickup_time", "flight_number", "passenger_count"],
  },
  {
    id: "sms-sarthi-assigned",
    channel: "sms",
    name: "Sarthi Assigned",
    body: `Dear {{passenger_name}}, your Sarthi {{sarthi_name}} will pick you up for flight {{flight_number}} on {{pickup_date}} at {{pickup_time}}.\n\nVehicle: {{vehicle_make}} {{vehicle_name}} ({{vehicle_number}})\nContact: {{sarthi_phone}}\n\n— Airport Transportation`,
    variables: ["passenger_name", "sarthi_name", "sarthi_phone", "flight_number", "pickup_date", "pickup_time", "vehicle_make", "vehicle_name", "vehicle_number"],
  },
];

interface Vehicle {
  id: string;
  make: string;
  name: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
  assignedDriverId?: string;
}

interface ToastData {
  name: string;
  email: string;
  role: Role;
}

interface EmailPreviewData {
  name: string;
  email: string;
  role: Role;
}

export function SuperAdminScreen({ onBack }: Props) {
  const { isDark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  // Seed with super_admin mock only; TA and Sarthi users load from MongoDB.
  const [users, setUsers] = useState<User[]>(registeredUsers.filter((u) => u.role !== "transportation_admin" && u.role !== "driver"));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("driver");
  const [newPhone, setNewPhone] = useState("");
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

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Load persisted Transportation Admin and Sarthi users from MongoDB on mount.
  useEffect(() => {
    Promise.allSettled([
      fetch(`${ADMIN_USERS_API}/`).then((r) => r.json()),
      fetch(`${SARTHI_API}/`).then((r) => r.json()),
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

  // When the Email Preview modal opens, fetch the saved template and substitute variables.
  useEffect(() => {
    if (!emailPreview) { setPreviewContent(null); return; }

    const DEFAULT_SUBJECT = "You're invited to Airport Transportation Management App";
    const DEFAULT_BODY =
      "Hi {{name}},\n\nYou've been invited to the Airport Transportation Management App as {{role}}.\n\nLogin with your email: {{email}}\n\nOpen the app at: {{app_url}}\n\nThis invitation was sent by a Super Admin. If you weren't expecting this, you can safely ignore this email.";

    const vars: Record<string, string> = {
      name:    emailPreview.name,
      email:   emailPreview.email,
      role:    roleLabels[emailPreview.role] ?? emailPreview.role,
      app_url: "https://sps-transportation-2026.vercel.app/",
    };
    const sub = (t: string) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), t);

    setPreviewLoading(true);
    fetch(`${TEMPLATES_API}/`)
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
      setNewRole("driver");
      setShowAddForm(false);
      setIsSending(false);
      setAddError("");
    };

    if (newRole === "transportation_admin" || newRole === "driver") {
      const apiUrl = newRole === "transportation_admin" ? ADMIN_USERS_API : SARTHI_API;
      try {
        const res = await fetch(`${apiUrl}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, email: newEmail, role: newRole, phone: newPhone }),
        });
        if (res.ok) {
          const newUser = await res.json();
          fetch(`${EMAIL_API}/send-invite`, {
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
          const res = await fetch(deleteUrl, { method: "DELETE" });
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

  const counts = {
    super_admin: users.filter((u) => u.role === "super_admin").length,
    transportation_admin: users.filter((u) => u.role === "transportation_admin").length,
    driver: users.filter((u) => u.role === "driver").length,
  };

  const showPreviewNote = newName.trim() && newEmail.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="bg-card sticky top-0 z-10 flex items-center gap-3 px-8" style={{ height: "76px", borderBottom: "1px solid var(--border)", boxShadow: "rgba(0,0,0,0.1) 0px 1px 0px 0px" }}>
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#173D61", lineHeight: 1.2 }}>Super Admin Panel</h1>
          <p style={{ fontSize: "13px", color: "#999999" }}>Manage roles and access</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" style={{ color: "#0C71C3" }} />
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Toggle theme">
            {isDark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>
          <button onClick={onBack} className="p-2 rounded transition-colors hover:bg-secondary" style={{ color: "#494D52" }} title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
        {/* Stats row — always visible */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<ShieldCheck className="w-4 h-4 text-purple-600" />} label="Super Admins" count={counts.super_admin} color="bg-purple-50 border-purple-100" />
          <StatCard icon={<Users className="w-4 h-4 text-blue-600" />} label="Transport Admins" count={counts.transportation_admin} color="bg-blue-50 border-blue-100" />
          <StatCard icon={<Truck className="w-4 h-4 text-green-600" />} label="Sarthis" count={counts.driver} color="bg-green-50 border-green-100" />
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
          {([
            { id: "users" as AdminTab, label: "Users", icon: <Users className="w-4 h-4" /> },
            { id: "templates" as AdminTab, label: "Notification Templates", icon: <Bell className="w-4 h-4" /> },
            { id: "vehicles" as AdminTab, label: "Vehicles", icon: <Truck className="w-4 h-4" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: activeTab === tab.id ? "#0C71C3" : "#494D52",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: activeTab === tab.id ? "2px solid #0C71C3" : "2px solid transparent",
                marginBottom: "-1px",
                background: "none",
                cursor: "pointer",
                padding: "10px 16px",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "templates" && <TemplatesTab />}

        {activeTab === "vehicles" && <VehiclesTab />}

        {activeTab === "users" && <>
        {/* Search + filter + add */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ padding: "12px 16px", borderRadius: "4px", border: "1px solid #CCCCCC", fontSize: "14px", backgroundColor: "#FFFFFF" }}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as Role | "all")}
            className="text-foreground focus:outline-none"
            style={{ padding: "12px 16px", borderRadius: "4px", border: "1px solid #CCCCCC", fontSize: "14px", backgroundColor: "#FFFFFF" }}
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="transportation_admin">Transport Admin</option>
            <option value="driver">Sarthi</option>
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{ padding: "12px 24px", borderRadius: "4px", fontSize: "14px", fontWeight: 600, backgroundColor: "#0C71C3", color: "#FFFFFF", border: "none", whiteSpace: "nowrap" }}
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Add user form */}
        {showAddForm && (
          <div className="bg-card border border-border p-6 space-y-4" style={{ borderRadius: "4px", boxShadow: "rgba(0,0,0,0.1) 0px 1px 0px 0px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#173D61" }}>Add New User</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 600, color: "#494D52", lineHeight: "14px" }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-foreground placeholder:text-muted-foreground focus:outline-none"
                  style={{ padding: "12px 16px", borderRadius: "4px", border: "1px solid #CCCCCC", fontSize: "14px", backgroundColor: "#FFFFFF" }}
                />
              </div>
              <div>
                <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 600, color: "#494D52", lineHeight: "14px" }}>Email Address</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-foreground placeholder:text-muted-foreground focus:outline-none"
                  style={{ padding: "12px 16px", borderRadius: "4px", border: "1px solid #CCCCCC", fontSize: "14px", backgroundColor: "#FFFFFF" }}
                />
              </div>
            </div>
            {(newRole === "driver" || newRole === "transportation_admin") && (
              <div className="sm:col-span-2">
                <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 600, color: "#494D52", lineHeight: "14px" }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full text-foreground placeholder:text-muted-foreground focus:outline-none"
                  style={{ padding: "12px 16px", borderRadius: "4px", border: "1px solid #CCCCCC", fontSize: "14px", backgroundColor: "#FFFFFF" }}
                />
              </div>
            )}
            <div>
              <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 600, color: "#494D52", lineHeight: "14px" }}>Assign Role</label>
              <div className="flex gap-2 flex-wrap">
                {(["transportation_admin", "driver"] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setNewRole(r)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      border: newRole === r ? "2px solid #0C71C3" : "2px solid #CCCCCC",
                      backgroundColor: newRole === r ? "#0C71C3" : "#FFFFFF",
                      color: newRole === r ? "#FFFFFF" : "#494D52",
                    }}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview note */}
            {showPreviewNote && (
              <div className="flex items-start gap-2 px-3 py-2.5" style={{ backgroundColor: "#FEF2E6", border: "1px solid #CCCCCC", borderRadius: "4px" }}>
                <Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#0C71C3" }} />
                <p style={{ fontSize: "13px", color: "#494D52" }}>
                  An invitation email will be sent to{" "}
                  <span style={{ fontWeight: 600 }}>{newEmail}</span>{" "}
                  granting them access as{" "}
                  <span style={{ fontWeight: 600 }}>{roleLabels[newRole]}</span>.
                </p>
              </div>
            )}

            {addError && (
              <div className="px-3 py-2.5 space-y-2" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "4px" }}>
                <p style={{ fontSize: "13px", color: "#B91C1C" }}>{addError}</p>
                {conflictId && (
                  <button
                    onClick={async () => {
                      await fetch(`${conflictId.apiUrl}/${conflictId.id}`, { method: "DELETE" });
                      setAddError("");
                      setConflictId(null);
                      setUsers((prev) => prev.filter((u) => u.id !== conflictId.id));
                      handleAdd();
                    }}
                    style={{ fontSize: "12px", fontWeight: 600, color: "#B91C1C", background: "none", border: "1px solid #FECACA", borderRadius: "4px", padding: "4px 10px", cursor: "pointer" }}
                  >
                    Remove existing record &amp; re-add
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowAddForm(false); setNewEmail(""); setNewName(""); setNewPhone(""); setNewRole("driver"); setAddError(""); setConflictId(null); }}
                className="transition-colors hover:bg-secondary"
                style={{ padding: "12px 24px", borderRadius: "4px", border: "2px solid #0C71C3", fontSize: "14px", fontWeight: 600, color: "#0C71C3", backgroundColor: "#FFFFFF" }}
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newEmail || !newName || isSending || ((newRole === "driver" || newRole === "transportation_admin") && !newPhone)}
                className="flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ padding: "12px 24px", borderRadius: "4px", fontSize: "14px", fontWeight: 600, backgroundColor: "#0C71C3", color: "#FFFFFF", border: "none" }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Add User & Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "4px" }}>
            <p style={{ fontSize: "13px", color: "#B91C1C" }}>{deleteError}</p>
          </div>
        )}

        {/* User list */}
        <div className="bg-card border border-border overflow-hidden" style={{ borderRadius: "4px", boxShadow: "rgba(0,0,0,0.1) 0px 1px 0px 0px" }}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }} className="text-foreground">
              {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>
              No users found
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((user) => (
                <li key={user.id} className="px-4 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{user.name}</p>
                    <p className="text-muted-foreground truncate" style={{ fontSize: "0.78rem" }}>{user.email}</p>
                    {user.phone && (
                      <p className="text-muted-foreground truncate" style={{ fontSize: "0.78rem" }}>{user.phone}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-md ${roleColors[user.role]}`} style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    {roleLabels[user.role]}
                  </span>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        </>}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-80 bg-white border border-border transition-all duration-300 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ borderRadius: "4px", boxShadow: "rgba(0,0,0,0.15) 0px 4px 12px 0px" }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: "0.875rem", fontWeight: 600 }} className="text-foreground">Invitation sent!</p>
                <p className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "0.78rem" }}>{toast.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[toast.role]}`} style={{ fontSize: "0.72rem" }}>
                    {roleLabels[toast.role]}
                  </span>
                  <button
                    onClick={() => setEmailPreview({ name: toast.name, email: toast.email, role: toast.role })}
                    className="text-primary hover:underline"
                    style={{ fontSize: "0.78rem" }}
                  >
                    Preview email →
                  </button>
                </div>
              </div>
              <button onClick={dismissToast} className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {emailPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEmailPreview(null); }}
        >
          <div className="bg-white w-full max-w-lg overflow-hidden" style={{ borderRadius: "4px", boxShadow: "rgba(0,0,0,0.15) 0px 4px 12px 0px" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#173D61" }}>Email Preview</span>
              </div>
              <button onClick={() => setEmailPreview(null)} className="p-1.5 rounded transition-colors hover:bg-secondary" style={{ color: "#494D52" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email metadata bar */}
            <div className="px-6 py-3 border-b border-border space-y-1" style={{ backgroundColor: "#FDF2EA" }}>
              <div className="flex gap-2" style={{ fontSize: "13px" }}>
                <span className="text-muted-foreground w-14 flex-shrink-0">From:</span>
                <span style={{ color: "#494D52", fontWeight: 500 }}>Airport Transport App &lt;noreply@airporttransport.app&gt;</span>
              </div>
              <div className="flex gap-2" style={{ fontSize: "13px" }}>
                <span className="text-muted-foreground w-14 flex-shrink-0">To:</span>
                <span style={{ color: "#494D52" }}>{emailPreview.email}</span>
              </div>
              <div className="flex gap-2" style={{ fontSize: "13px" }}>
                <span className="text-muted-foreground w-14 flex-shrink-0">Subject:</span>
                <span style={{ color: "#494D52", fontWeight: 500 }}>
                  {previewContent?.subject ?? "You're invited to Airport Transportation Management App"}
                </span>
              </div>
            </div>

            {/* Email body */}
            <div className="px-6 py-6 max-h-96 overflow-y-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Role badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-1" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "6px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280" }}>Role:</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1D4ED8" }}>{roleLabels[emailPreview.role]}</span>
                  </div>
                  {/* Template body rendered as paragraphs */}
                  {(previewContent?.body ?? "").split("\n\n").map((para, i) => (
                    <p key={i} style={{ fontSize: "14px", lineHeight: "22px", color: "#494D52", margin: 0 }}>
                      {para.split("\n").map((line, j, arr) => (
                        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                      ))}
                    </p>
                  ))}
                  {/* Open App button */}
                  <div className="pt-2">
                    <div style={{ display: "inline-block", padding: "10px 22px", borderRadius: "4px", backgroundColor: "#0C71C3", color: "#FFFFFF", fontSize: "14px", fontWeight: 600 }}>
                      Open App →
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, count, color }: { icon: ReactNode; label: string; count: number; color: string }) {
  return (
    <div className={`border p-4 flex flex-col gap-2 ${color}`} style={{ borderRadius: "4px", boxShadow: "rgba(0,0,0,0.1) 0px 1px 0px 0px" }}>
      <div className="flex items-center gap-1.5">{icon}<span style={{ fontSize: "13px", color: "#999999" }}>{label}</span></div>
      <p style={{ fontSize: "26px", fontWeight: 500, lineHeight: 1, color: "#173D61" }}>{count}</p>
    </div>
  );
}

function VehiclesTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ make: "", name: "", vehicleNumber: "", type: "MUV", capacity: "7" });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState<Omit<Vehicle, "id" | "assignedDriverId">>({ make: "", name: "", vehicleNumber: "", type: "MUV", capacity: 7 });

  useEffect(() => {
    setVehiclesLoading(true);
    fetch(`${VEHICLES_API}/`)
      .then((r) => r.json())
      .then((data: Vehicle[]) => setVehicles(data))
      .catch(() => {})
      .finally(() => setVehiclesLoading(false));
  }, []);

  const handleAddVehicle = async () => {
    if (!vehicleForm.make || !vehicleForm.name || !vehicleForm.vehicleNumber) return;
    const res = await fetch(`${VEHICLES_API}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: vehicleForm.make,
        name: vehicleForm.name,
        vehicleNumber: vehicleForm.vehicleNumber,
        type: vehicleForm.type,
        capacity: parseInt(vehicleForm.capacity) || 7,
      }),
    });
    if (res.ok) {
      const created: Vehicle = await res.json();
      setVehicles((prev) => [...prev, created]);
    }
    setVehicleForm({ make: "", name: "", vehicleNumber: "", type: "MUV", capacity: "7" });
    setShowAddVehicle(false);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const res = await fetch(`${VEHICLES_API}/${vehicleId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setEditVehicleForm({ make: vehicle.make, name: vehicle.name, vehicleNumber: vehicle.vehicleNumber, type: vehicle.type, capacity: vehicle.capacity });
  };

  const handleSaveVehicle = async (vehicleId: string) => {
    const res = await fetch(`${VEHICLES_API}/${vehicleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editVehicleForm),
    });
    if (res.ok) {
      const updated: Vehicle = await res.json();
      setVehicles((prev) => prev.map((v) => v.id === vehicleId ? updated : v));
    }
    setEditingVehicleId(null);
  };

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: "0.95rem", fontWeight: 600 }} className="text-foreground">Fleet Vehicles</h2>
        <button
          onClick={() => { setShowAddVehicle(!showAddVehicle); setEditingVehicleId(null); }}
          className="flex items-center gap-1.5 text-accent hover:opacity-80 transition-opacity"
          style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0C71C3" }}
        >
          <PlusCircle className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Add Vehicle form */}
      {showAddVehicle && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <h3 style={{ fontSize: "0.88rem", fontWeight: 600 }} className="text-foreground">New Vehicle</h3>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {([
              { key: "make", label: "Make", placeholder: "Toyota" },
              { key: "name", label: "Model / Name", placeholder: "Innova Crysta" },
              { key: "vehicleNumber", label: "Vehicle Number", placeholder: "GJ 01 AB 1234" },
            ] as { key: keyof typeof vehicleForm; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.76rem" }}>{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={vehicleForm[key]}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, [key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.76rem" }}>Vehicle Type</label>
              <select
                value={vehicleForm.type}
                onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                style={{ fontSize: "0.85rem" }}
              >
                {["SUV", "MUV", "Van", "Tempo Traveller", "Bus", "Sedan"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.76rem" }}>Seating Capacity</label>
              <select
                value={vehicleForm.capacity}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                style={{ fontSize: "0.85rem" }}
              >
                {[4, 5, 6, 7, 8, 10, 12, 14, 20, 30].map((n) => <option key={n} value={n}>{n} seats</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddVehicle(false)} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors" style={{ fontSize: "0.82rem" }}>Cancel</button>
            <button
              onClick={handleAddVehicle}
              disabled={!vehicleForm.make || !vehicleForm.name || !vehicleForm.vehicleNumber}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ fontSize: "0.82rem", fontWeight: 500 }}
            >
              Add Vehicle
            </button>
          </div>
        </div>
      )}

      {/* Vehicle list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {vehiclesLoading ? (
          <div className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>Loading vehicles…</div>
        ) : vehicles.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>No vehicles added yet</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {vehicles.map((vehicle) => {
              const isEditing = editingVehicleId === vehicle.id;
              return (
                <li key={vehicle.id} className="px-4 py-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {([
                          { key: "make", label: "Make", placeholder: "Toyota" },
                          { key: "name", label: "Model / Name", placeholder: "Innova Crysta" },
                          { key: "vehicleNumber", label: "Vehicle Number", placeholder: "GJ 01 AB 1234" },
                        ] as { key: keyof typeof editVehicleForm; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.76rem" }}>{label}</label>
                            <input
                              type="text"
                              placeholder={placeholder}
                              value={String(editVehicleForm[key])}
                              onChange={(e) => setEditVehicleForm({ ...editVehicleForm, [key]: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                              style={{ fontSize: "0.85rem" }}
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.76rem" }}>Vehicle Type</label>
                          <select
                            value={editVehicleForm.type}
                            onChange={(e) => setEditVehicleForm({ ...editVehicleForm, type: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                            style={{ fontSize: "0.85rem" }}
                          >
                            {["SUV", "MUV", "Van", "Tempo Traveller", "Bus", "Sedan"].map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.76rem" }}>Seating Capacity</label>
                          <select
                            value={editVehicleForm.capacity}
                            onChange={(e) => setEditVehicleForm({ ...editVehicleForm, capacity: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                            style={{ fontSize: "0.85rem" }}
                          >
                            {[4, 5, 6, 7, 8, 10, 12, 14, 20, 30].map((n) => <option key={n} value={n}>{n} seats</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingVehicleId(null)} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors" style={{ fontSize: "0.82rem" }}>Cancel</button>
                        <button onClick={() => handleSaveVehicle(vehicle.id)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity" style={{ fontSize: "0.82rem", fontWeight: 500 }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-foreground" style={{ fontSize: "0.9rem", fontWeight: 600 }}>{vehicle.make} {vehicle.name}</p>
                          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>{vehicle.type}</span>
                          <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{vehicle.capacity} seats</span>
                        </div>
                        <p className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>{vehicle.vehicleNumber}</p>
                      </div>
                      <button onClick={() => handleEditVehicle(vehicle)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteVehicle(vehicle.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
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

  // On mount: fetch saved templates from MongoDB, overlay on defaults, and seed any missing ones.
  useEffect(() => {
    fetch(`${TEMPLATES_API}/`)
      .then((r) => r.json())
      .then((saved: NotificationTemplate[]) => {
        setTemplates(
          DEFAULT_TEMPLATES.map((def) => {
            const fromDB = saved.find((s) => s.id === def.id);
            return fromDB ? { ...def, ...fromDB } : def;
          })
        );
        // Seed templates that have never been saved to MongoDB so edits always persist.
        DEFAULT_TEMPLATES.forEach((def) => {
          if (!saved.find((s) => s.id === def.id)) {
            fetch(`${TEMPLATES_API}/${def.id}`, {
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
      .catch(() => {}); // network down → keep built-in defaults
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
      const res = await fetch(`${TEMPLATES_API}/${id}`, {
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
    await fetch(`${TEMPLATES_API}/${id}`, { method: "DELETE" }).catch(() => {});
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
      await fetch(`${TEMPLATES_API}/${id}`, {
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
    await fetch(`${TEMPLATES_API}/${id}`, { method: "DELETE" }).catch(() => {});
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...original } : t)));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (editingId === id) cancelEdit();
  };

  return (
    <div className="space-y-4">
      {/* Channel selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1" style={{ background: "#F3F4F6", borderRadius: "6px", width: "fit-content" }}>
          {(["email", "sms"] as TemplateChannel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => { setActiveChannel(ch); cancelEdit(); }}
              className="flex items-center gap-1.5 transition-colors"
              style={{
                padding: "6px 16px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: activeChannel === ch ? "#0C71C3" : "transparent",
                color: activeChannel === ch ? "#FFFFFF" : "#494D52",
                border: "none",
                cursor: "pointer",
              }}
            >
              {ch === "email" ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
              {ch === "email" ? "Email" : "SMS"}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: "#999999" }}>
          {channelTemplates.length} template{channelTemplates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Template cards */}
      {channelTemplates.map((t) => {
        const isEditing = editingId === t.id;
        const isExpanded = expandedId === t.id;
        const isSaved = savedId === t.id;
        const isModified =
          t.body !== DEFAULT_TEMPLATES.find((d) => d.id === t.id)?.body ||
          (t.subject ?? "") !== (DEFAULT_TEMPLATES.find((d) => d.id === t.id)?.subject ?? "");

        return (
          <div
            key={t.id}
            className="bg-card border border-border overflow-hidden"
            style={{ borderRadius: "4px", boxShadow: "rgba(0,0,0,0.1) 0px 1px 0px 0px" }}
          >
            {/* Card header */}
            <div
              className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => !isEditing && toggleExpand(t.id)}
            >
              <div
                className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: "6px", backgroundColor: activeChannel === "email" ? "#EFF6FF" : "#F0FDF4" }}
              >
                {activeChannel === "email"
                  ? <Mail className="w-4 h-4" style={{ color: "#0C71C3" }} />
                  : <MessageSquare className="w-4 h-4" style={{ color: "#16A34A" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#173D61" }}>{t.name}</p>
                  {isModified && (
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "#D97706", background: "#FEF3C7", padding: "1px 7px", borderRadius: "10px", border: "1px solid #FDE68A" }}>
                      Modified
                    </span>
                  )}
                  {isSaved && (
                    <span className="flex items-center gap-1" style={{ fontSize: "11px", fontWeight: 500, color: "#16A34A", background: "#F0FDF4", padding: "1px 7px", borderRadius: "10px", border: "1px solid #BBF7D0" }}>
                      <CheckCircle className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                {t.subject && (
                  <p className="truncate" style={{ fontSize: "12px", color: "#999999", marginTop: "1px" }}>
                    Subject: {t.subject}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                    className="flex items-center gap-1.5 transition-colors hover:opacity-80"
                    style={{ padding: "6px 14px", borderRadius: "4px", fontSize: "13px", fontWeight: 600, backgroundColor: "#0C71C3", color: "#FFFFFF", border: "none", cursor: "pointer" }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {isModified && !isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); resetTemplate(t.id); }}
                    className="flex items-center gap-1 transition-colors hover:opacity-80"
                    title="Reset to default"
                    style={{ padding: "6px 10px", borderRadius: "4px", fontSize: "13px", color: "#494D52", border: "1px solid #CCCCCC", background: "#FFFFFF", cursor: "pointer" }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                    className="p-1.5 rounded transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Delete template"
                    style={{ color: "#CCCCCC", border: "none", background: "none", cursor: "pointer" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {isExpanded
                  ? <ChevronUp className="w-4 h-4" style={{ color: "#999999" }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: "#999999" }} />}
              </div>
            </div>

            {/* Expanded: preview or editor */}
            {isExpanded && (
              <div className="border-t border-border px-5 py-4 space-y-4" style={{ background: "#FAFAFA" }}>
                {/* Variable chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: "12px", color: "#999999", fontWeight: 500 }}>Variables:</span>
                  {t.variables.map((v) => (
                    <span
                      key={v}
                      style={{ fontSize: "12px", fontFamily: "monospace", color: "#0C71C3", background: "#EFF6FF", padding: "2px 8px", borderRadius: "4px", border: "1px solid #BFDBFE" }}
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>

                {isEditing ? (
                  /* Editor */
                  <div className="space-y-3">
                    {activeChannel === "email" && (
                      <div>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#494D52", display: "block", marginBottom: "6px" }}>Subject</label>
                        <input
                          type="text"
                          value={draftSubject}
                          onChange={(e) => setDraftSubject(e.target.value)}
                          className="w-full focus:outline-none"
                          style={{ padding: "10px 14px", borderRadius: "4px", border: "1px solid #CCCCCC", fontSize: "14px", background: "#FFFFFF" }}
                        />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#494D52", display: "block", marginBottom: "6px" }}>
                        Body
                      </label>
                      <textarea
                        value={draftBody}
                        onChange={(e) => setDraftBody(e.target.value)}
                        rows={8}
                        className="w-full focus:outline-none resize-y"
                        style={{ padding: "10px 14px", borderRadius: "4px", border: "1px solid #CCCCCC", fontSize: "13px", fontFamily: "monospace", background: "#FFFFFF", lineHeight: 1.7 }}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        style={{ padding: "8px 20px", borderRadius: "4px", fontSize: "13px", fontWeight: 600, color: "#494D52", border: "1px solid #CCCCCC", background: "#FFFFFF", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(t.id)}
                        disabled={!draftBody.trim() || isSaving}
                        className="flex items-center gap-1.5 disabled:opacity-40"
                        style={{ padding: "8px 20px", borderRadius: "4px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF", background: "#0C71C3", border: "none", cursor: "pointer" }}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isSaving ? "Saving…" : "Save Template"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Preview */
                  <div>
                    {t.subject && (
                      <div className="mb-3 pb-3 border-b border-border">
                        <span style={{ fontSize: "12px", color: "#999999", fontWeight: 500 }}>Subject: </span>
                        <span style={{ fontSize: "13px", color: "#173D61", fontWeight: 600 }}>{t.subject}</span>
                      </div>
                    )}
                    <pre style={{ fontSize: "13px", color: "#494D52", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>
                      {t.body}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Deleted templates — restore section */}
      {deletedTemplates.length > 0 && (
        <div className="space-y-2">
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#999999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Deleted Templates
          </p>
          {deletedTemplates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 border border-dashed border-border"
              style={{ borderRadius: "4px", background: "#FAFAFA" }}
            >
              <div
                className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: "6px", backgroundColor: "#F3F4F6" }}
              >
                {t.channel === "email"
                  ? <Mail className="w-3.5 h-3.5" style={{ color: "#CCCCCC" }} />
                  : <MessageSquare className="w-3.5 h-3.5" style={{ color: "#CCCCCC" }} />}
              </div>
              <p style={{ fontSize: "13px", color: "#999999", textDecoration: "line-through", flex: 1 }}>{t.name}</p>
              <button
                onClick={() => restoreTemplate(t.id)}
                className="flex items-center gap-1.5 transition-colors hover:opacity-80"
                style={{ fontSize: "13px", fontWeight: 600, color: "#0C71C3", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
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
