import mongoose, { Schema, Types } from 'mongoose';
import { settings } from '../config.js';

const flexible = { strict: false as const, versionKey: false as const, _id: true as const };

const adminUserSchema = new Schema(
  {
    google_id: String,
    email: String,
    full_name: String,
    phone: String,
    role: String,
    avatar_url: String,
    is_active: Boolean,
    created_at: Date,
  },
  flexible
);

const sarthiSchema = new Schema(
  {
    full_name: String,
    phone: String,
    email: String,
    role: String,
    created_at: Date,
  },
  flexible
);

const vehicleSchema = new Schema(
  {
    make: String,
    vehicle_name: String,
    number_plate: String,
    vehicle_type: String,
    capacity: Number,
    assigned_driver_id: Schema.Types.Mixed,
    created_at: Date,
    updated_at: Date,
  },
  flexible
);

const bookingSchema = new Schema(
  {
    contact: {
      first_name: String,
      last_name: String,
      phone: String,
      email: String,
      mandal: String,
    },
    passengers_count: Number,
    bags_count: Number,
    transportation_requirement: String,
    stroller_required: Boolean,
    special_accommodation: String,
    passengers: [Schema.Types.Mixed],
    created_at: Date,
  },
  flexible
);

const flightDetailsSchema = new Schema(
  {
    booking_id: Schema.Types.ObjectId,
    arrival: Schema.Types.Mixed,
    departure: Schema.Types.Mixed,
    created_at: Date,
  },
  flexible
);

const assignmentSchema = new Schema(
  {
    booking_id: Schema.Types.ObjectId,
    sarthi_id: Schema.Types.ObjectId,
    flight_type: String,
    flight_group_id: String,
    trip_status: String,
    assigned_at: Date,
    updated_at: Date,
  },
  flexible
);

const templateSchema = new Schema(
  {
    _id: String,
    channel: String,
    name: String,
    subject: String,
    body: String,
    variables: [String],
    deleted: Boolean,
    updated_at: Date,
  },
  { strict: false as const, versionKey: false as const, _id: false as const }
);

const mandalSchema = new Schema(
  {
    name: { type: String, required: true },
    name_lower: String,
    created_at: Date,
  },
  flexible
);
mandalSchema.index({ name_lower: 1 }, { unique: true });

export const AdminUser = mongoose.model('AdminUser', adminUserSchema, settings.admin_users_collection);
export const Sarthi = mongoose.model('Sarthi', sarthiSchema, settings.sarthi_collection);
export const Vehicle = mongoose.model('Vehicle', vehicleSchema, settings.vehicles_collection);
export const Booking = mongoose.model('Booking', bookingSchema, settings.bookings_collection);
export const FlightDetails = mongoose.model('FlightDetails', flightDetailsSchema, settings.flight_details_collection);
export const Assignment = mongoose.model('Assignment', assignmentSchema, settings.assignments_collection);
export const Template = mongoose.model('Template', templateSchema, settings.templates_collection);
export const Mandal = mongoose.model('Mandal', mandalSchema, settings.mandals_collection);

export { Types };
