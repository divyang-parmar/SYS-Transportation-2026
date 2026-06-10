#!/usr/bin/env python3
"""
MongoDB Collection Update Script for SPS-Transportation-Admin
This script updates the existing bookings and flight_details collection validators and indexes.
"""

from pymongo import MongoClient
from pymongo.errors import OperationFailure
import sys

BOOKINGS_VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["contact", "passengers_count", "passengers"],
        "properties": {
            "contact": {
                "bsonType": "object",
                "required": ["first_name", "last_name", "phone", "email", "mandal"],
                "properties": {
                    "first_name": {"bsonType": "string"},
                    "last_name": {"bsonType": "string"},
                    "phone": {"bsonType": "string"},
                    "email": {"bsonType": "string"},
                    "mandal": {"bsonType": "string"}
                }
            },
            "passengers_count": {"bsonType": "int"},
            "bags_count": {"bsonType": "int"},
            "transportation_requirement": {"bsonType": "string"},
            "stroller_required": {"bsonType": "bool"},
            "special_accommodation": {"bsonType": "string"},
            "passengers": {
                "bsonType": "array",
                "minItems": 1,
                "items": {
                    "bsonType": "object",
                    "required": ["first_name", "last_name"],
                    "properties": {
                        "first_name": {"bsonType": "string"},
                        "last_name": {"bsonType": "string"},
                        "phone": {"bsonType": "string"},
                        "mandal": {"bsonType": "string"}
                    }
                }
            },
            "created_at": {"bsonType": "date"}
        }
    }
}

FLIGHT_DETAILS_VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["booking_id"],
        "properties": {
            "booking_id": {"bsonType": "objectId"},
            "arrival": {
                "bsonType": "object",
                "properties": {
                    "flight_name": {"bsonType": "string"},
                    "other_flight_name": {"bsonType": "string"},
                    "flight_number": {"bsonType": "string"},
                    "airport": {"bsonType": "string"},
                    "arrival_datetime": {"bsonType": "date"}
                }
            },
            "departure": {
                "bsonType": "object",
                "properties": {
                    "flight_name": {"bsonType": "string"},
                    "other_flight_name": {"bsonType": "string"},
                    "flight_number": {"bsonType": "string"},
                    "airport": {"bsonType": "string"},
                    "departure_datetime": {"bsonType": "date"}
                }
            },
            "created_at": {"bsonType": "date"}
        }
    }
}


def ensure_collection(db, name, validator):
    if name in db.list_collection_names():
        print(f"Updating existing collection '{name}'...")
        db.command(
            "collMod",
            name,
            validator=validator,
            validationLevel="strict",
            validationAction="error"
        )
        print(f"✓ Updated validator for '{name}'")
    else:
        print(f"Creating collection '{name}'...")
        db.create_collection(name, validator=validator)
        print(f"✓ Created collection '{name}'")


def update_bookings_collection(db):
    ensure_collection(db, "bookings", BOOKINGS_VALIDATOR)


def update_flight_details_collection(db):
    ensure_collection(db, "flight_details", FLIGHT_DETAILS_VALIDATOR)
    db.flight_details.create_index([("booking_id", 1)])
    print("✓ Ensured index on flight_details.booking_id")


def main(connection_string):
    try:
        client = MongoClient(connection_string)
        db = client["SPS-Transportation-Admin"]

        print("Connected to MongoDB successfully!")
        print(f"Database: {db.name}")

        update_bookings_collection(db)
        update_flight_details_collection(db)

        print("\n✅ bookings and flight_details have been updated.")
        client.close()
        return 0

    except OperationFailure as e:
        print(f"MongoDB operation failed: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 update_collections.py '<mongodb_connection_string>'")
        print("Example: python3 update_collections.py 'mongodb+srv://user:password@cluster.mongodb.net'")
        sys.exit(1)

    connection_string = sys.argv[1]
    sys.exit(main(connection_string))
