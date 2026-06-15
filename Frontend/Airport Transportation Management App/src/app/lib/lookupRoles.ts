import { API_BASE } from "./api";
import { registeredUsers, type Role } from "../data/mockData";
import type { AvailableRole } from "../App";

const ROLE_ORDER: Role[] = ["super_admin", "transportation_admin", "driver"];

export async function lookupRoles(email: string, fallbackName = ""): Promise<AvailableRole[]> {
  const lookup = email.trim().toLowerCase();
  if (!lookup) return [];
  const encoded = encodeURIComponent(lookup);

  const [sarthiRes, taRes] = await Promise.allSettled([
    fetch(`${API_BASE}/sarthi/find-by-email?email=${encoded}`).then((r) => (r.ok ? r.json() : null)),
    fetch(`${API_BASE}/admin-users/find-by-email?email=${encoded}`).then((r) => (r.ok ? r.json() : null)),
  ]);

  const sarthi = sarthiRes.status === "fulfilled" ? sarthiRes.value : null;
  const ta = taRes.status === "fulfilled" ? taRes.value : null;

  const found: AvailableRole[] = [];
  if (ta?.id) {
    const role = (ta.role as Role) ?? "transportation_admin";
    found.push({ role, name: ta.name || fallbackName, id: ta.id });
  }
  if (sarthi?.id) {
    found.push({ role: "driver" as Role, name: sarthi.name || fallbackName, id: sarthi.id });
  }

  if (found.length === 0) {
    const mock = registeredUsers.find((u) => u.email.toLowerCase() === lookup);
    if (mock) found.push({ role: mock.role, name: mock.name || fallbackName });
  }

  found.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  return found;
}
