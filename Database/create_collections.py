#!/usr/bin/env python3
"""
MongoDB Collection Creation Script for SPS-Transportation-Admin
This script creates all required collections with schema validation and indexes.
"""

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, OperationFailure
import sys

def create_collections(connection_string):
    """Create all collections for the SPS-Transportation-Admin database"""
    
    try:
        # Connect to MongoDB
        client = MongoClient(connection_string)
        db = client['SPS-Transportation-Admin']
        
        print("Connected to MongoDB successfully!")
        print(f"Database: {db.name}")
        
        # 1. Create admin_users collection
        print("\n[1/6] Creating admin_users collection...")
        try:
            db.create_collection(
                "admin_users",
                validator={
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["google_id", "email", "full_name", "role"],
                        "properties": {
                            "google_id": {"bsonType": "string"},
                            "email": {"bsonType": "string"},
                            "full_name": {"bsonType": "string"},
                            "role": {"enum": ["transport-admin", "transport-super"]},
                            "avatar_url": {"bsonType": "string"},
                            "is_active": {"bsonType": "bool"},
                            "created_at": {"bsonType": "date"}
                        }
                    }
                }
            )
            db.admin_users.create_index([("email", 1)], unique=True)
            db.admin_users.create_index([("google_id", 1)], unique=True)
            print("✓ admin_users collection created with indexes")
        except OperationFailure as e:
            if "already exists" in str(e):
                print("✓ admin_users collection already exists")
            else:
                raise
        
        # 2. Create sarthi collection
        print("[2/6] Creating sarthi collection...")
        try:
            db.create_collection(
                "sarthi",
                validator={
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["full_name", "phone", "email"],
                        "properties": {
                            "full_name": {"bsonType": "string"},
                            "phone": {"bsonType": "string"},
                            "email": {"bsonType": "string"},
                            "created_at": {"bsonType": "date"}
                        }
                    }
                }
            )
            db.sarthi.create_index([("email", 1)], unique=True)
            print("✓ sarthi collection created with indexes")
        except OperationFailure as e:
            if "already exists" in str(e):
                print("✓ sarthi collection already exists")
            else:
                raise
        
        # 3. Create vehicles collection
        print("[3/6] Creating vehicles collection...")
        try:
            db.create_collection(
                "vehicles",
                validator={
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["vehicle_name", "vehicle_type", "capacity", "number_plate"],
                        "properties": {
                            "vehicle_name": {"bsonType": "string"},
                            "vehicle_type": {"bsonType": "string"},
                            "capacity": {"bsonType": "int"},
                            "number_plate": {"bsonType": "string"},
                            "created_at": {"bsonType": "date"}
                        }
                    }
                }
            )
            db.vehicles.create_index([("number_plate", 1)], unique=True)
            print("✓ vehicles collection created with indexes")
        except OperationFailure as e:
            if "already exists" in str(e):
                print("✓ vehicles collection already exists")
            else:
                raise
        
        # 4. Create bookings collection
        print("[4/6] Creating bookings collection...")
        try:
            db.create_collection(
                "bookings",
                validator={
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
                                    "required": ["first_name", "last_name", "mandal"],
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
                },
                validationLevel='strict',
                validationAction='error'
            )
            print("✓ bookings collection created")
        except OperationFailure as e:
            if "already exists" in str(e):
                print("✓ bookings collection already exists")
            else:
                raise
        
        # 5. Create flight_details collection
        print("[5/6] Creating flight_details collection...")
        try:
            db.create_collection(
                "flight_details",
                validator={
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
                },
                validationLevel='strict',
                validationAction='error'
            )
            db.flight_details.create_index([("booking_id", 1)])
            print("✓ flight_details collection created with indexes")
        except OperationFailure as e:
            if "already exists" in str(e):
                print("✓ flight_details collection already exists")
            else:
                raise
        
        # 6. Create assignments collection
        print("[6/6] Creating assignments collection...")
        try:
            db.create_collection(
                "assignments",
                validator={
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["booking_id", "sarthi_id", "trip_status"],
                        "properties": {
                            "booking_id": {"bsonType": "objectId"},
                            "sarthi_id": {"bsonType": "objectId"},
                            "trip_status": {"enum": ["pending", "complete"]},
                            "assigned_at": {"bsonType": "date"}
                        }
                    }
                }
            )
            db.assignments.create_index([("booking_id", 1)])
            db.assignments.create_index([("sarthi_id", 1)])
            print("✓ assignments collection created with indexes")
        except OperationFailure as e:
            if "already exists" in str(e):
                print("✓ assignments collection already exists")
            else:
                raise
        
        print("\n✅ All collections created successfully!")
        
        # List all collections
        print("\nCollections in database:")
        for collection in db.list_collection_names():
            print(f"  - {collection}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 create_collections.py '<mongodb_connection_string>'")
        print("\nExample:")
        print("  python3 create_collections.py 'mongodb+srv://user:password@cluster.mongodb.net'")
        sys.exit(1)
    
    connection_string = sys.argv[1]
    success = create_collections(connection_string)
    sys.exit(0 if success else 1)
