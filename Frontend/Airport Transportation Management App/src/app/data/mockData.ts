export type Role = "super_admin" | "transportation_admin" | "driver";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  vehicleNumber: string;
  capacity: number;
  available: boolean;
}

export interface Vehicle {
  id: string;
  make: string;
  name: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
  assignedDriverId?: string;
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  mandal: string;
  passengerCount: number;
  destination: string;
  wheelchairRequired: boolean;
  carSeatRequired: boolean;
  flightGroup: string;
  assignedDriverId?: string;
}

export type FlightStatus = "on_time" | "delayed" | "early" | "cancelled" | "landed" | "departed";

export interface FlightGroup {
  id: string;
  flightNumber: string;
  airline: string;
  scheduledTime: string;
  actualTime: string;
  date: string;           // ISO date string e.g. "2026-06-08"
  terminal: string;
  type: "arrival" | "departure";
  status: FlightStatus;
  origin?: string;        // for arrivals
  destination?: string;  // for departures
  passengerIds: string[];
}

export const registeredUsers: User[] = [
  { id: "u1", name: "Ramesh Patel", email: "ramesh.patel@gmail.com", role: "super_admin" },
  { id: "u2", name: "Sunita Sharma", email: "sunita.sharma@gmail.com", role: "transportation_admin" },
  { id: "u3", name: "Vijay Desai", email: "vijay.desai@gmail.com", role: "transportation_admin" },
  { id: "u4", name: "Mahesh Kumar", email: "mahesh.kumar@gmail.com", role: "driver" },
  { id: "u5", name: "Rajesh Mehta", email: "rajesh.mehta@gmail.com", role: "driver" },
  { id: "u6", name: "Suresh Joshi", email: "suresh.joshi@gmail.com", role: "driver" },
];

export const drivers: Driver[] = [
  { id: "d1", name: "Mahesh Kumar", phone: "+91 98765 43210", vehicle: "Toyota Innova", vehicleNumber: "GJ 01 AB 1234", capacity: 7, available: true },
  { id: "d2", name: "Rajesh Mehta", phone: "+91 87654 32109", vehicle: "Maruti Ertiga", vehicleNumber: "GJ 05 CD 5678", capacity: 7, available: true },
  { id: "d3", name: "Suresh Joshi", phone: "+91 76543 21098", vehicle: "Tata Tempo Traveller", vehicleNumber: "GJ 07 EF 9012", capacity: 12, available: false },
  { id: "d4", name: "Dinesh Thakkar", phone: "+91 65432 10987", vehicle: "Toyota Innova Crysta", vehicleNumber: "GJ 01 GH 3456", capacity: 7, available: true },
  { id: "d5", name: "Kamlesh Prajapati", phone: "+91 54321 09876", vehicle: "Maruti Suzuki Ertiga", vehicleNumber: "GJ 09 IJ 7890", capacity: 7, available: true },
  { id: "d6", name: "Nilesh Solanki", phone: "+91 43210 98765", vehicle: "Tata Winger", vehicleNumber: "GJ 11 KL 1234", capacity: 10, available: true },
];

export const vehicles: Vehicle[] = [
  { id: "v1", make: "Toyota",        name: "Innova",          vehicleNumber: "GJ 01 AB 1234", type: "MUV",             capacity: 7,  assignedDriverId: "d1" },
  { id: "v2", make: "Maruti",        name: "Ertiga",          vehicleNumber: "GJ 05 CD 5678", type: "MUV",             capacity: 7,  assignedDriverId: "d2" },
  { id: "v3", make: "Tata",          name: "Tempo Traveller", vehicleNumber: "GJ 07 EF 9012", type: "Tempo Traveller", capacity: 12, assignedDriverId: "d3" },
  { id: "v4", make: "Toyota",        name: "Innova Crysta",   vehicleNumber: "GJ 01 GH 3456", type: "MUV",             capacity: 7,  assignedDriverId: "d4" },
  { id: "v5", make: "Maruti Suzuki", name: "Ertiga",          vehicleNumber: "GJ 09 IJ 7890", type: "MUV",             capacity: 7,  assignedDriverId: "d5" },
  { id: "v6", make: "Tata",          name: "Winger",          vehicleNumber: "GJ 11 KL 1234", type: "Van",             capacity: 10, assignedDriverId: "d6" },
];

export const arrivalPassengers: Passenger[] = [
  { id: "p1", name: "Haresh Patel", phone: "+91 99887 76655", mandal: "Ahmedabad Central", passengerCount: 4, destination: "Sarangpur Ashram", wheelchairRequired: false, carSeatRequired: true, flightGroup: "fg1" },
  { id: "p2", name: "Bhavna Shah", phone: "+91 88776 65544", mandal: "Surat North", passengerCount: 2, destination: "Sarangpur Ashram", wheelchairRequired: true, carSeatRequired: false, flightGroup: "fg1" },
  { id: "p3", name: "Kiran Modi", phone: "+91 77665 54433", mandal: "Vadodara West", passengerCount: 6, destination: "Sarangpur Ashram", wheelchairRequired: false, carSeatRequired: false, flightGroup: "fg1" },
  { id: "p4", name: "Jyoti Trivedi", phone: "+91 66554 43322", mandal: "Rajkot East", passengerCount: 3, destination: "Sarangpur Ashram", wheelchairRequired: false, carSeatRequired: true, flightGroup: "fg2" },
  { id: "p5", name: "Manish Panchal", phone: "+91 55443 32211", mandal: "Gandhinagar", passengerCount: 5, destination: "Sarangpur Ashram", wheelchairRequired: false, carSeatRequired: false, flightGroup: "fg2" },
  { id: "p6", name: "Priya Nair", phone: "+91 44332 21100", mandal: "Mumbai Mahim", passengerCount: 2, destination: "Sarangpur Ashram", wheelchairRequired: true, carSeatRequired: false, flightGroup: "fg2" },
  { id: "p7", name: "Ashwin Raval", phone: "+91 33221 10099", mandal: "Anand", passengerCount: 7, destination: "Sarangpur Ashram", wheelchairRequired: false, carSeatRequired: false, flightGroup: "fg3" },
  { id: "p8", name: "Rekha Bhatt", phone: "+91 22110 09988", mandal: "Nadiad", passengerCount: 1, destination: "Sarangpur Ashram", wheelchairRequired: false, carSeatRequired: false, flightGroup: "fg3" },
  { id: "p9", name: "Dipak Vyas", phone: "+91 11009 98877", mandal: "Bharuch", passengerCount: 4, destination: "Sarangpur Ashram", wheelchairRequired: false, carSeatRequired: true, flightGroup: "fg3" },
];

export const departurePassengers: Passenger[] = [
  { id: "dp1", name: "Naresh Doshi", phone: "+91 98760 01122", mandal: "Ahmedabad South", passengerCount: 3, destination: "Ahmedabad Airport", wheelchairRequired: false, carSeatRequired: false, flightGroup: "dfg1" },
  { id: "dp2", name: "Varsha Kulkarni", phone: "+91 87650 12233", mandal: "Surat South", passengerCount: 5, destination: "Ahmedabad Airport", wheelchairRequired: true, carSeatRequired: false, flightGroup: "dfg1" },
  { id: "dp3", name: "Prakash Barot", phone: "+91 76540 23344", mandal: "Vadodara East", passengerCount: 2, destination: "Ahmedabad Airport", wheelchairRequired: false, carSeatRequired: true, flightGroup: "dfg1" },
  { id: "dp4", name: "Savita Gajjar", phone: "+91 65430 34455", mandal: "Junagadh", passengerCount: 4, destination: "Ahmedabad Airport", wheelchairRequired: false, carSeatRequired: false, flightGroup: "dfg2" },
  { id: "dp5", name: "Hemant Parikh", phone: "+91 54320 45566", mandal: "Surendranagar", passengerCount: 6, destination: "Ahmedabad Airport", wheelchairRequired: false, carSeatRequired: false, flightGroup: "dfg2" },
  { id: "dp6", name: "Usha Vora", phone: "+91 43210 56677", mandal: "Bhavnagar", passengerCount: 2, destination: "Ahmedabad Airport", wheelchairRequired: true, carSeatRequired: true, flightGroup: "dfg2" },
  { id: "dp7", name: "Chirag Vaid", phone: "+91 32100 67788", mandal: "Mehsana", passengerCount: 3, destination: "Ahmedabad Airport", wheelchairRequired: false, carSeatRequired: false, flightGroup: "dfg3" },
  { id: "dp8", name: "Lata Desai", phone: "+91 21000 78899", mandal: "Patan", passengerCount: 5, destination: "Ahmedabad Airport", wheelchairRequired: false, carSeatRequired: true, flightGroup: "dfg3" },
];

export const arrivalFlightGroups: FlightGroup[] = [
  {
    id: "fg1", flightNumber: "AI 482", airline: "Air India",
    scheduledTime: "06:45", actualTime: "06:45",
    date: "2026-06-08", terminal: "T1", type: "arrival",
    status: "on_time", origin: "Mumbai (BOM)",
    passengerIds: ["p1", "p2", "p3"],
  },
  {
    id: "fg2", flightNumber: "6E 741", airline: "IndiGo",
    scheduledTime: "09:20", actualTime: "10:05",
    date: "2026-06-08", terminal: "T2", type: "arrival",
    status: "delayed", origin: "Delhi (DEL)",
    passengerIds: ["p4", "p5", "p6"],
  },
  {
    id: "fg3", flightNumber: "SG 312", airline: "SpiceJet",
    scheduledTime: "13:55", actualTime: "13:55",
    date: "2026-06-08", terminal: "T1", type: "arrival",
    status: "on_time", origin: "Pune (PNQ)",
    passengerIds: ["p7", "p8", "p9"],
  },
  {
    id: "fg4", flightNumber: "UK 214", airline: "Vistara",
    scheduledTime: "08:30", actualTime: "08:30",
    date: "2026-06-09", terminal: "T2", type: "arrival",
    status: "on_time", origin: "Bengaluru (BLR)",
    passengerIds: ["p1", "p4"],
  },
  {
    id: "fg5", flightNumber: "AI 131", airline: "Air India",
    scheduledTime: "15:10", actualTime: "16:40",
    date: "2026-06-09", terminal: "T1", type: "arrival",
    status: "delayed", origin: "Chennai (MAA)",
    passengerIds: ["p7", "p2"],
  },
];

export const departureFlightGroups: FlightGroup[] = [
  {
    id: "dfg1", flightNumber: "UK 875", airline: "Vistara",
    scheduledTime: "08:15", actualTime: "08:15",
    date: "2026-06-10", terminal: "T2", type: "departure",
    status: "on_time", destination: "Mumbai (BOM)",
    passengerIds: ["dp1", "dp2", "dp3"],
  },
  {
    id: "dfg2", flightNumber: "6E 204", airline: "IndiGo",
    scheduledTime: "14:30", actualTime: "15:10",
    date: "2026-06-10", terminal: "T1", type: "departure",
    status: "delayed", destination: "Delhi (DEL)",
    passengerIds: ["dp4", "dp5", "dp6"],
  },
  {
    id: "dfg3", flightNumber: "AI 675", airline: "Air India",
    scheduledTime: "19:10", actualTime: "19:10",
    date: "2026-06-10", terminal: "T2", type: "departure",
    status: "on_time", destination: "Hyderabad (HYD)",
    passengerIds: ["dp7", "dp8"],
  },
  {
    id: "dfg4", flightNumber: "SG 441", airline: "SpiceJet",
    scheduledTime: "07:00", actualTime: "07:00",
    date: "2026-06-11", terminal: "T1", type: "departure",
    status: "on_time", destination: "Kolkata (CCU)",
    passengerIds: ["dp1", "dp4"],
  },
  {
    id: "dfg5", flightNumber: "6E 910", airline: "IndiGo",
    scheduledTime: "21:45", actualTime: "21:45",
    date: "2026-06-11", terminal: "T2", type: "departure",
    status: "cancelled", destination: "Ahmedabad (AMD)",
    passengerIds: ["dp5", "dp7"],
  },
];

export const driverPickupList: (Passenger & { flightInfo?: string })[] = [
  { ...arrivalPassengers[0], flightInfo: "AI 482 · Arr 06:45 · 08 Jun", assignedDriverId: "d1" },
  { ...arrivalPassengers[2], flightInfo: "AI 482 · Arr 06:45 · 08 Jun", assignedDriverId: "d1" },
  { ...arrivalPassengers[4], flightInfo: "6E 741 · Arr 10:05 · 08 Jun", assignedDriverId: "d1" },
];
