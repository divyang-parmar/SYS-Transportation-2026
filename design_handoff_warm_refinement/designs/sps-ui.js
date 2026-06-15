/* ============================================================
   SPS Transportation — shared UI helpers (icons, topbar, theme)
   ============================================================ */
(function () {
  const S = (p) => `<svg width="${p.s||16}" height="${p.s||16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${p.w||2}" stroke-linecap="round" stroke-linejoin="round">${p.d}</svg>`;
  const ICONS = {
    landing:   '<path d="M2 22h20"/><path d="M3.8 10.8 2 9l1.7-3.8 1 .5c.5.3.8.8.8 1.4v2.2l4 1.3 2.7-6.2 1.4.4-1.4 7 6.2 2c.6.2 1 .8 1 1.4 0 .5-.4 1-1 1H6.5"/>',
    takeoff:   '<path d="M2 22h20"/><path d="M6.5 18 2 13l1.4-.9 2.6.9 3.5-1.8L5 4.8l1.8-.4 6.2 4.4 4-1c.8-.2 1.6.3 1.8 1.1.2.8-.3 1.6-1.1 1.8L6.5 18z"/>',
    users:     '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    truck:     '<path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l3 3v5h-3"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
    grid:      '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    bell:      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    shield:    '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/>',
    search:    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    check:     '<polyline points="20 6 9 17 4 12"/>',
    checkc:    '<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>',
    xc:        '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    x:         '<path d="M18 6 6 18M6 6l12 12"/>',
    cdown:     '<polyline points="6 9 12 15 18 9"/>',
    cright:    '<polyline points="9 18 15 12 9 6"/>',
    cup:       '<polyline points="18 15 12 9 6 15"/>',
    phone:     '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail:      '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    pin:       '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    clock:     '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    alert:     '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    luggage:   '<rect x="6" y="8" width="12" height="13" rx="2"/><path d="M9 8V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3M10 12v5M14 12v5"/>',
    baby:      '<path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5S14.5 8 14 8"/>',
    access:    '<circle cx="12" cy="4" r="2"/><path d="M19 13a6 6 0 1 1-7-5.7V13h6"/><path d="m13 13 3 6"/>',
    arrows:    '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
    refresh:   '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    calendar:  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    car:       '<path d="M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0"/><path d="M3 17h-.5A1.5 1.5 0 0 1 1 15.5V12l2-5a2 2 0 0 1 2-1.3h8.5a2 2 0 0 1 1.8 1.1L19 12l2 .5a1.5 1.5 0 0 1 1 1.4v1.6a1.5 1.5 0 0 1-1.5 1.5H21M9 17h6M3 12h18"/>',
    plus:      '<path d="M12 5v14M5 12h14"/>',
    edit:      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash:     '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    logout:    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sparkle:   '<path d="m12 3 1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2L12 3z"/>',
  };
  function icon(name, opts) {
    opts = opts || {};
    return S({ d: ICONS[name] || "", s: opts.s, w: opts.w });
  }

  function initTheme() {
    let saved = "light";
    try { saved = localStorage.getItem("sps-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch (e) {}
    document.documentElement.setAttribute("data-theme", saved);
    return saved;
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("sps-theme", t); } catch (e) {}
    document.querySelectorAll("[data-theme-icon]").forEach((el) => { el.innerHTML = icon(t === "dark" ? "sun" : "moon", { s: 18 }); });
  }
  function toggleTheme() {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }

  // Top bar markup
  function topbar(title, subtitle) {
    return `
      <div class="topbar">
        <div class="container row">
          <div class="brand">
            <a href="index.html" class="brand-mark" title="All screens">${icon("sparkle", { s: 22 })}</a>
            <div class="brand-text">
              <div class="t">${title}</div>
              <div class="s">${subtitle}</div>
            </div>
          </div>
          <button class="iconbtn" data-theme-icon onclick="SPSUI.toggleTheme()" title="Toggle theme"></button>
          <a class="iconbtn" href="Login.html" title="Sign out">${icon("logout", { s: 18 })}</a>
        </div>
      </div>`;
  }

  window.SPSUI = { icon, initTheme, setTheme, toggleTheme, topbar };
})();
