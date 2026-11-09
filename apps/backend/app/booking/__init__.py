"""Port of minhduc19/booking-management, isolated from existing app storage."""
from fastapi import APIRouter
from app.booking.database import initialize_database
from app.booking.routers import bookings, cleaners, cleaning_sessions, database, documents, listing_metadata, pages, users

initialize_database()
router = APIRouter()
for module in (database, documents, pages, cleaners, bookings, cleaning_sessions, listing_metadata, users):
    router.include_router(module.router)
