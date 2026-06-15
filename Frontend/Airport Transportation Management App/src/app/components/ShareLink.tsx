import { useEffect, useRef, useState } from "react";
import { Share2, Copy, Check, ExternalLink, MessageCircle, Mail, Link2 } from "lucide-react";

interface Props {
  trackingToken: string | null | undefined;
  passengerName?: string;
  phone?: string;
  email?: string;
}

function buildUrl(token: string): string {
  return `${window.location.origin}/track/${token}`;
}

function defaultMessage(name: string, url: string): string {
  const greeting = name ? `Hi ${name.split(" ")[0]}` : "Hi";
  return `${greeting}, here's your transportation tracking link for Suhradam Parivar Shibir:\n${url}\n\nYou can see your Sarthi assignment and live location anytime.`;
}

export function ShareLink({ trackingToken, passengerName = "", phone = "", email = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!trackingToken) {
    return (
      <span
        className="text-muted-foreground inline-flex items-center gap-1"
        style={{ fontSize: 11, fontStyle: "italic" }}
        title="This booking was created before tracking links existed"
      >
        —
      </span>
    );
  }

  const url = buildUrl(trackingToken);
  const msg = defaultMessage(passengerName, url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = msg;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "SPS Transportation tracking", text: msg, url });
        setOpen(false);
        return;
      } catch {
        // user cancelled — fall through to the popover
      }
    }
    setOpen((o) => !o);
  };

  const waHref = (() => {
    const text = encodeURIComponent(msg);
    if (phone) {
      const cleaned = phone.replace(/[\s\-()]/g, "").replace(/^\+/, "");
      return `https://wa.me/${cleaned}?text=${text}`;
    }
    return `https://wa.me/?text=${text}`;
  })();

  const smsHref = phone ? `sms:${phone}?body=${encodeURIComponent(msg)}` : `sms:?body=${encodeURIComponent(msg)}`;
  const mailtoHref = (() => {
    const subject = encodeURIComponent("Your SPS Transportation tracking link");
    const body = encodeURIComponent(msg);
    return email ? `mailto:${email}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
  })();

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        className="iconbtn"
        onClick={handleNativeShare}
        title="Share tracking link"
        aria-label="Share tracking link"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ width: 32, height: 32, borderRadius: 8 }}
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 z-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r)",
            boxShadow: "var(--sh-3)",
            minWidth: 280,
            padding: 6,
          }}
        >
          <div className="px-3 pt-2 pb-1 flex items-center gap-2" style={{ color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            <Link2 className="w-3 h-3" /> Share with {passengerName || "passenger"}
          </div>
          <div className="px-3 pb-1 font-mono truncate" style={{ fontSize: 11, color: "var(--head)" }}>{url}</div>

          <MenuButton onClick={handleCopy} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
            {copied ? "Link copied" : "Copy link"}
          </MenuButton>
          <MenuButton onClick={handleCopyMessage} icon={<Copy className="w-4 h-4" />}>
            Copy message
          </MenuButton>

          <a
            role="menuitem"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 transition-colors"
            style={menuItemStyle}
            onMouseEnter={onHoverEnter}
            onMouseLeave={onHoverLeave}
            onClick={() => setOpen(false)}
          >
            <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} />
            <span style={{ fontSize: 13.5, color: "var(--head)", fontWeight: 500 }}>
              Send via WhatsApp{phone ? "" : " (compose)"}
            </span>
          </a>

          <a
            role="menuitem"
            href={smsHref}
            className="w-full flex items-center gap-3 transition-colors"
            style={menuItemStyle}
            onMouseEnter={onHoverEnter}
            onMouseLeave={onHoverLeave}
            onClick={() => setOpen(false)}
          >
            <MessageCircle className="w-4 h-4" style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: 13.5, color: "var(--head)", fontWeight: 500 }}>Send via SMS</span>
          </a>

          <a
            role="menuitem"
            href={mailtoHref}
            className="w-full flex items-center gap-3 transition-colors"
            style={menuItemStyle}
            onMouseEnter={onHoverEnter}
            onMouseLeave={onHoverLeave}
            onClick={() => setOpen(false)}
          >
            <Mail className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13.5, color: "var(--head)", fontWeight: 500 }}>Email</span>
          </a>

          <a
            role="menuitem"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 transition-colors"
            style={menuItemStyle}
            onMouseEnter={onHoverEnter}
            onMouseLeave={onHoverLeave}
            onClick={() => setOpen(false)}
          >
            <ExternalLink className="w-4 h-4" />
            <span style={{ fontSize: 13.5, color: "var(--head)", fontWeight: 500 }}>Open</span>
          </a>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "9px 10px",
  borderRadius: "var(--r-sm)",
  cursor: "pointer",
  textAlign: "left",
  textDecoration: "none",
};

const onHoverEnter = (e: React.MouseEvent<HTMLElement>) => {
  (e.currentTarget as HTMLElement).style.background = "var(--surface-3)";
};
const onHoverLeave = (e: React.MouseEvent<HTMLElement>) => {
  (e.currentTarget as HTMLElement).style.background = "transparent";
};

function MenuButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 transition-colors"
      style={menuItemStyle}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <span style={{ color: "var(--muted-foreground)" }}>{icon}</span>
      <span style={{ fontSize: 13.5, color: "var(--head)", fontWeight: 500 }}>{children}</span>
    </button>
  );
}
