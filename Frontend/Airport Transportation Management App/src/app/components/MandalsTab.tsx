import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Plus, Trash2, AlertCircle, X, Pencil, Check } from "lucide-react";
import { API_BASE } from "../lib/api";

interface Mandal {
  id: string;
  name: string;
}

const MANDALS_API = `${API_BASE}/mandals`;

export function MandalsTab() {
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(MANDALS_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMandals(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mandals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch(MANDALS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setAddError(body.detail || "Already exists");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAddError(body.error || `HTTP ${res.status}`);
        return;
      }
      setNewName("");
      setShowAdd(false);
      await load();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (m: Mandal) => {
    if (!confirm(`Remove ${m.name}?`)) return;
    const prev = mandals;
    setMandals(mandals.filter((x) => x.id !== m.id));
    const res = await fetch(`${MANDALS_API}/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMandals(prev);
      setError(`Failed to delete ${m.name}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2>Mandals</h2>
        {!showAdd && (
          <button className="btn btn--accent" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add mandal
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--r-sm)]"
          style={{ background: "var(--danger-tint)", color: "var(--danger)", fontSize: 13 }}>
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="p-5 rounded-[var(--r)]"
          style={{ border: "1px dashed var(--accent)", background: "var(--accent-tint)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3>Add a mandal</h3>
            <button type="button" className="iconbtn" onClick={() => { setShowAdd(false); setNewName(""); setAddError(""); }} aria-label="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              autoFocus
              className="input-warm flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Mandal name"
              maxLength={120}
            />
            <button type="submit" className="btn btn--accent justify-center" disabled={adding || !newName.trim()}>
              {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4" /> Add</>}
            </button>
          </div>
          {addError && <p className="mt-2" style={{ fontSize: 12.5, color: "var(--danger)" }}>{addError}</p>}
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
        </div>
      ) : mandals.length === 0 ? (
        <div className="card-warm flex flex-col items-center text-center text-muted-foreground" style={{ padding: 32 }}>
          <MapPin className="w-6 h-6 mb-3" />
          <p style={{ fontSize: 13.5 }}>No mandals yet. Add one above.</p>
        </div>
      ) : (
        <div className="card-warm">
          <div className="px-4 py-3 text-muted-foreground" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--line-soft)" }}>
            {mandals.length} {mandals.length === 1 ? "mandal" : "mandals"}
          </div>
          <ul>
            {mandals.map((m) => (
              <MandalRow
                key={m.id}
                mandal={m}
                onSaved={(updated) => setMandals((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                onDelete={() => handleDelete(m)}
                onError={(msg) => setError(msg)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MandalRow({
  mandal, onSaved, onDelete, onError,
}: {
  mandal: Mandal;
  onSaved: (updated: Mandal) => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(mandal.name);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(mandal.name);
      setRowError("");
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, mandal.name]);

  const cancel = () => { setEditing(false); setRowError(""); setValue(mandal.name); };

  const save = async () => {
    const next = value.trim();
    if (!next) { cancel(); return; }
    if (next === mandal.name) { setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`${MANDALS_API}/${mandal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setRowError(body.detail || "Already exists");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRowError(body.error || `HTTP ${res.status}`);
        onError(`Failed to rename ${mandal.name}`);
        return;
      }
      const updated = await res.json() as Mandal;
      onSaved(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      className="flex items-center gap-3 px-4 py-3 group"
      style={{ borderBottom: "1px solid var(--line-soft)" }}
    >
      <div className="avatar-warm" style={{ width: 32, height: 32, fontSize: 12 }}>
        <MapPin className="w-4 h-4" />
      </div>

      {editing ? (
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              className="input-warm flex-1"
              style={{ padding: "6px 10px", fontSize: 14, fontWeight: 600, color: "var(--head)" }}
              value={value}
              maxLength={120}
              onChange={(e) => { setValue(e.target.value); setRowError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); save(); }
                if (e.key === "Escape") { e.preventDefault(); cancel(); }
              }}
              disabled={saving}
            />
            <button
              type="button"
              className="iconbtn"
              onClick={save}
              disabled={saving || !value.trim()}
              title="Save"
              aria-label="Save"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" style={{ color: "var(--ok)" }} />}
            </button>
            <button
              type="button"
              className="iconbtn"
              onClick={cancel}
              disabled={saving}
              title="Cancel"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {rowError && <p style={{ fontSize: 12, color: "var(--danger)" }}>{rowError}</p>}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="flex-1 text-left truncate"
            style={{ fontSize: 14, fontWeight: 600, color: "var(--head)", background: "transparent", border: "none", cursor: "text", padding: 0 }}
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {mandal.name}
          </button>
          <button
            className="iconbtn opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setEditing(true)}
            title="Rename"
            aria-label={`Rename ${mandal.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            className="iconbtn"
            onClick={onDelete}
            title="Remove"
            aria-label={`Remove ${mandal.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
          </button>
        </>
      )}
    </li>
  );
}
