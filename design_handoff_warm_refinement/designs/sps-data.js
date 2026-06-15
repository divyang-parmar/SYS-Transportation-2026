/* ============================================================
   SPS Transportation — shared mock data
   Mirrors the real backend shapes (sarthi, vehicles, flight
   groups, bhaktos, templates, users).
   ============================================================ */
window.SPS = (function () {
  const VEHICLES = [
    { id: "v1", make: "Toyota",   name: "Sienna",     number: "NJ ABC-1234", type: "Minivan", capacity: 7,  driverId: "s1" },
    { id: "v2", make: "Honda",    name: "Odyssey",    number: "NJ XLP-8841", type: "Minivan", capacity: 7,  driverId: "s2" },
    { id: "v3", make: "Chrysler", name: "Pacifica",   number: "NJ KRT-2093", type: "Minivan", capacity: 6,  driverId: "s3" },
    { id: "v4", make: "Ford",     name: "Transit",    number: "NJ TRN-5521", type: "Van",     capacity: 12, driverId: "s5" },
    { id: "v5", make: "Toyota",   name: "Highlander", number: "NJ HLR-3310", type: "SUV",     capacity: 5,  driverId: null },
  ];

  const SARTHIS = [
    { id: "s1", name: "Hari Patel",   phone: "+1 (732) 555-0190", email: "hari.patel@gmail.com" },
    { id: "s2", name: "Dinesh Modi",  phone: "+1 (201) 555-0144", email: "dinesh.modi@gmail.com" },
    { id: "s3", name: "Bharat Shah",  phone: "+1 (908) 555-0177", email: "bharat.shah@gmail.com" },
    { id: "s4", name: "Vijay Amin",   phone: "+1 (609) 555-0123", email: "vijay.amin@gmail.com" },
    { id: "s5", name: "Naresh Joshi", phone: "+1 (848) 555-0166", email: "naresh.joshi@gmail.com" },
  ];

  // flight groups (each has passengers; some assigned to a sarthi)
  const ARRIVALS = [
    { id: "ga1", date: "2026-06-14", flight: "UA 0892", airline: "United",          terminal: "Terminal C", type: "arrival", origin: "Chicago ORD", sched: "11:40", actual: "11:40", status: "on_time",
      pax: [
        { id: "pa1", name: "Anjali Patel",   phone: "+1 (732) 555-0188", mandal: "Parsippany",  count: 3, special: "stroller",   sarthiId: "s2" },
        { id: "pa2", name: "Ramesh Shah",    phone: "+1 (732) 555-0142", mandal: "Edison",      count: 2, special: null,         sarthiId: null },
      ] },
    { id: "ga2", date: "2026-06-14", flight: "DL 2207", airline: "Delta",           terminal: "Terminal B", type: "arrival", origin: "Atlanta ATL", sched: "13:05", actual: "13:50", status: "delayed",
      pax: [
        { id: "pa3", name: "Mahesh Desai",   phone: "+1 (908) 555-0119", mandal: "Iselin",      count: 1, special: "wheelchair", sarthiId: null },
        { id: "pa4", name: "Priya Mehta",    phone: "+1 (732) 555-0150", mandal: "Edison",      count: 2, special: null,         sarthiId: null },
      ] },
    { id: "ga3", date: "2026-06-14", flight: "BA 0185", airline: "British Airways", terminal: "Terminal A", type: "arrival", origin: "London LHR",  sched: "16:50", actual: "16:40", status: "early",
      pax: [
        { id: "pa5", name: "Kiran Joshi",    phone: "+1 (201) 555-0173", mandal: "Jersey City", count: 4, special: null,         sarthiId: "s1" },
        { id: "pa6", name: "Hetal Bhatt",    phone: "+1 (848) 555-0102", mandal: "Piscataway",  count: 3, special: null,         sarthiId: "s5" },
      ] },
    { id: "ga4", date: "2026-06-15", flight: "EK 0204", airline: "Emirates",        terminal: "Terminal B", type: "arrival", origin: "Dubai DXB",   sched: "09:20", actual: "09:20", status: "on_time",
      pax: [
        { id: "pa7", name: "Sanjay Trivedi", phone: "+1 (609) 555-0166", mandal: "Robbinsville", count: 2, special: "stroller",  sarthiId: null },
      ] },
  ];

  const DEPARTURES = [
    { id: "gd1", date: "2026-06-14", flight: "AI 0144", airline: "Air India",     terminal: "Terminal 4", type: "departure", destination: "Mumbai BOM",   sched: "18:30", actual: "18:30", status: "on_time",
      pax: [
        { id: "pd1", name: "Sanjay Trivedi", phone: "+1 (609) 555-0166", mandal: "Robbinsville", count: 2, special: "stroller", sarthiId: "s3" },
        { id: "pd2", name: "Kiran Joshi",    phone: "+1 (201) 555-0173", mandal: "Jersey City",  count: 4, special: null,        sarthiId: null },
      ] },
    { id: "gd2", date: "2026-06-14", flight: "QR 0708", airline: "Qatar Airways", terminal: "Terminal 1", type: "departure", destination: "Ahmedabad AMD", sched: "21:10", actual: "21:55", status: "delayed",
      pax: [
        { id: "pd3", name: "Hetal Bhatt",    phone: "+1 (848) 555-0102", mandal: "Piscataway",  count: 3, special: null, sarthiId: null },
      ] },
  ];

  // Bhaktos overview (registrations)
  const BHAKTOS = [
    { id: "b1", first: "Ramesh", last: "Shah",     mandal: "Edison",      phone: "+1 (732) 555-0142", email: "ramesh.shah@gmail.com",  count: 2, bags: 3, stroller: false, req: "Arrival and Departure Both", arrF: "UA 0892", arrA: "Chicago ORD",  arrT: "14 Jun · 11:40", depF: "AI 0144", depA: "Mumbai BOM",   depT: "20 Jun · 18:30",
      travelers: [ { first: "Ramesh", last: "Shah", phone: "+1 (732) 555-0142", mandal: "Edison" }, { first: "Nita", last: "Shah", phone: "+1 (732) 555-0143", mandal: "Edison" } ] },
    { id: "b2", first: "Anjali", last: "Patel",    mandal: "Parsippany",  phone: "+1 (732) 555-0188", email: "anjali.patel@gmail.com", count: 3, bags: 4, stroller: true,  req: "Arrival Only",                arrF: "UA 0892", arrA: "Chicago ORD",  arrT: "14 Jun · 11:40", depF: "", depA: "", depT: "",
      travelers: [ { first: "Anjali", last: "Patel", phone: "+1 (732) 555-0188", mandal: "Parsippany" }, { first: "Dev", last: "Patel", phone: "", mandal: "Parsippany" }, { first: "Aarav", last: "Patel", phone: "", mandal: "Parsippany" } ] },
    { id: "b3", first: "Mahesh", last: "Desai",    mandal: "Iselin",      phone: "+1 (908) 555-0119", email: "mahesh.desai@gmail.com", count: 1, bags: 1, stroller: false, req: "Arrival Only",                arrF: "DL 2207", arrA: "Atlanta ATL",  arrT: "14 Jun · 13:05", depF: "", depA: "", depT: "",
      travelers: [] },
    { id: "b4", first: "Kiran",  last: "Joshi",    mandal: "Jersey City", phone: "+1 (201) 555-0173", email: "kiran.joshi@gmail.com",  count: 4, bags: 6, stroller: false, req: "Arrival and Departure Both", arrF: "BA 0185", arrA: "London LHR",   arrT: "14 Jun · 16:50", depF: "AI 0144", depA: "Mumbai BOM",   depT: "20 Jun · 18:30",
      travelers: [ { first: "Kiran", last: "Joshi", phone: "+1 (201) 555-0173", mandal: "Jersey City" }, { first: "Mina", last: "Joshi", phone: "", mandal: "Jersey City" }, { first: "Riya", last: "Joshi", phone: "", mandal: "Jersey City" }, { first: "Arjun", last: "Joshi", phone: "", mandal: "Jersey City" } ] },
    { id: "b5", first: "Priya",  last: "Mehta",    mandal: "Edison",      phone: "+1 (732) 555-0150", email: "priya.mehta@gmail.com",  count: 2, bags: 2, stroller: false, req: "Arrival Only",                arrF: "DL 2207", arrA: "Atlanta ATL",  arrT: "14 Jun · 13:05", depF: "", depA: "", depT: "",
      travelers: [ { first: "Priya", last: "Mehta", phone: "+1 (732) 555-0150", mandal: "Edison" }, { first: "Sahil", last: "Mehta", phone: "", mandal: "Edison" } ] },
    { id: "b6", first: "Sanjay", last: "Trivedi",  mandal: "Robbinsville", phone: "+1 (609) 555-0166", email: "sanjay.t@gmail.com",    count: 2, bags: 3, stroller: true,  req: "Departure Only",              arrF: "", arrA: "", arrT: "", depF: "AI 0144", depA: "Mumbai BOM", depT: "14 Jun · 18:30",
      travelers: [ { first: "Sanjay", last: "Trivedi", phone: "+1 (609) 555-0166", mandal: "Robbinsville" }, { first: "Geeta", last: "Trivedi", phone: "", mandal: "Robbinsville" } ] },
    { id: "b7", first: "Hetal",  last: "Bhatt",    mandal: "Piscataway",  phone: "+1 (848) 555-0102", email: "hetal.bhatt@gmail.com",  count: 3, bags: 4, stroller: false, req: "Arrival and Departure Both", arrF: "BA 0185", arrA: "London LHR", arrT: "14 Jun · 16:50", depF: "QR 0708", depA: "Ahmedabad AMD", depT: "21 Jun · 21:10",
      travelers: [ { first: "Hetal", last: "Bhatt", phone: "+1 (848) 555-0102", mandal: "Piscataway" }, { first: "Jignesh", last: "Bhatt", phone: "", mandal: "Piscataway" }, { first: "Tara", last: "Bhatt", phone: "", mandal: "Piscataway" } ] },
  ];

  const USERS = [
    { id: "u1", name: "Suresh Kumar",  email: "suresh.kumar@gmail.com",  phone: "+1 (732) 555-0100", role: "super_admin" },
    { id: "u2", name: "Anand Bhakta",  email: "anand.bhakta@gmail.com",  phone: "+1 (201) 555-0111", role: "transportation_admin" },
    { id: "u3", name: "Meera Shah",    email: "meera.shah@gmail.com",    phone: "+1 (908) 555-0122", role: "transportation_admin" },
    { id: "s1u", name: "Hari Patel",   email: "hari.patel@gmail.com",    phone: "+1 (732) 555-0190", role: "driver" },
    { id: "s2u", name: "Dinesh Modi",  email: "dinesh.modi@gmail.com",   phone: "+1 (201) 555-0144", role: "driver" },
    { id: "s3u", name: "Bharat Shah",  email: "bharat.shah@gmail.com",   phone: "+1 (908) 555-0177", role: "driver" },
  ];

  const TEMPLATES = [
    { id: "email-invite",        channel: "email", name: "User Invitation",    subject: "You're invited to SPS Transportation",   body: "Jai Swaminarayan {{name}},\n\nYou have been added as a {{role}} for the Suhradam Parivar Shibir transportation seva. Sign in with your Google account to access your dashboard.\n\n— SPS Transportation Team" },
    { id: "email-flight-assignment", channel: "email", name: "Flight Assignment", subject: "Your pickup assignment — {{flight}}", body: "Jai Swaminarayan {{name}},\n\nYou have been assigned to pick up {{passenger}} arriving on {{flight}} at {{time}}, {{terminal}}.\n\nContact: {{phone}}\n\n— SPS Transportation Team" },
    { id: "email-sarthi-assigned", channel: "email", name: "Sarthi Assigned",  subject: "Your Sarthi for {{flight}}",            body: "Jai Swaminarayan {{name}},\n\nYour Sarthi {{sarthi}} ({{sarthi_phone}}) will receive you for flight {{flight}} at {{time}}.\n\n— SPS Transportation Team" },
    { id: "sms-invite",          channel: "sms",   name: "User Invitation",    subject: "", body: "Jai Swaminarayan {{name}}, you've been added as {{role}} for SPS Transportation. Sign in: {{link}}" },
    { id: "sms-pickup-reminder", channel: "sms",   name: "Pickup Reminder",    subject: "", body: "Reminder: pickup for {{passenger}} on {{flight}} at {{time}}, {{terminal}}. — SPS" },
    { id: "sms-sarthi-assigned", channel: "sms",   name: "Sarthi Assigned",    subject: "", body: "Jai Swaminarayan {{name}}, your Sarthi {{sarthi}} ({{sarthi_phone}}) will receive you for {{flight}} at {{time}}. — SPS" },
  ];

  return { VEHICLES, SARTHIS, ARRIVALS, DEPARTURES, BHAKTOS, USERS, TEMPLATES };
})();
