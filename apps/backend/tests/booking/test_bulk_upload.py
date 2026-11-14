import csv
from pathlib import Path

from app.booking import models
from .database import client, session

def test_bulk_upload_bookings_from_payload(client, session):
    payload_path = Path(__file__).with_name("BookingTestPayload.csv")

    with payload_path.open("r", encoding="utf-8", newline="") as csv_file:
        csv_rows = list(csv.DictReader(csv_file))

    expected_rows = len(csv_rows)
    expected_listing_metadata = len({row["Listing"] for row in csv_rows})

    with payload_path.open("rb") as csv_file:
        response = client.post(
            "/bookings/bulk-upload/",
            files={"files": (payload_path.name, csv_file, "text/csv")},
        )

    assert response.status_code == 200

    body = response.json()
    assert body["files_processed"] == 1
    assert body["created"] == expected_rows
    assert body["updated"] == 0
    assert body["errors"] == []
    assert len(body["created_codes"]) == expected_rows

    total_bookings = session.query(models.Booking).count()
    total_properties = session.query(models.Property).count()
    total_listing_metadata = session.query(models.ListingMetadata).count()
    unmapped_bookings = (
        session.query(models.Booking)
        .filter(models.Booking.listing_number.is_(None))
        .count()
    )

    assert total_bookings == expected_rows
    assert total_properties == 2
    assert total_listing_metadata == expected_listing_metadata
    assert unmapped_bookings == 0


def test_bulk_upload_bookings_from_transaction_history_csv(client, session):
    payload = """Date,Type,Confirmation Code,Booking date,Start date,End date,Nights,Guest,Listing,Details,Reference code,Currency,Amount,Service fee,Cleaning fee,Community fee,Gross earnings,Airbnb remitted tax,Earnings year
09/03/2026,Reservation,HM8PNJJMTA,08/03/2026,09/02/2026,09/04/2026,2,Sekar Anggraeni,"Cosy, Walking Distance to Centre, Free Parking",,,GBP,144.82,33.08,12.00,7.90,172.39,0.00,
"""

    response = client.post(
        "/bookings/bulk-upload/",
        files={"files": ("transaction-history.csv", payload, "text/csv")},
    )

    assert response.status_code == 200
    assert response.json()["created"] == 1
    assert response.json()["errors"] == []

    booking = (
        session.query(models.Booking)
        .filter_by(confirmation_code="HM8PNJJMTA")
        .one()
    )
    assert booking.status == "Reservation"
    assert booking.guest_name == "Sekar Anggraeni"
    assert booking.start_date.isoformat() == "2026-02-09"
    assert booking.end_date.isoformat() == "2026-04-09"
    assert booking.booked_date.isoformat() == "2026-03-08"
    assert booking.nights == 2
    assert booking.adults == booking.children == booking.infants == 0
    assert booking.earnings == "172.39"


def test_bulk_upload_supports_us_transaction_history_dates(client, session):
    payload = """Date,Type,Confirmation Code,Booking date,Start date,End date,Nights,Guest,Listing,Details,Reference code,Currency,Amount,Service fee,Cleaning fee,Community fee,Gross earnings,Airbnb remitted tax,Earnings year
06/29/2026,Reservation,USDATE123,06/28/2026,07/02/2026,07/04/2026,2,Jane Doe,US date listing,,,GBP,144.82,33.08,12.00,7.90,172.39,0.00,
"""

    response = client.post(
        "/bookings/bulk-upload/",
        files={"files": ("us-transaction-history.csv", payload, "text/csv")},
    )

    assert response.status_code == 200
    assert response.json()["created"] == 1
    assert response.json()["errors"] == []

    booking = session.query(models.Booking).filter_by(confirmation_code="USDATE123").one()
    assert booking.start_date.isoformat() == "2026-07-02"
    assert booking.end_date.isoformat() == "2026-07-04"
    assert booking.booked_date.isoformat() == "2026-06-28"


def test_bulk_upload_deduplicates_confirmation_codes_in_uploaded_files(client, session):
    payload = """Date,Type,Confirmation Code,Booking date,Start date,End date,Nights,Guest,Listing
09/03/2026,Reservation,HMKHMEBEHS,08/03/2026,09/02/2026,09/04/2026,2,Harry Smith,Spacious - central - historic view
09/03/2026,Co-Host payout,HMKHMEBEHS,08/03/2026,09/02/2026,09/05/2026,3,Harry Smith,Spacious - central - historic view
"""

    response = client.post(
        "/bookings/bulk-upload/",
        files={"files": ("duplicate-confirmation-codes.csv", payload, "text/csv")},
    )

    assert response.status_code == 200
    assert response.json()["created"] == 1
    assert response.json()["updated"] == 0
    assert response.json()["errors"] == []
    assert session.query(models.Booking).count() == 1

    booking = (
        session.query(models.Booking)
        .filter_by(confirmation_code="HMKHMEBEHS")
        .one()
    )
    assert booking.status == "Co-Host payout"
    assert booking.nights == 3


def payout_payload():
    return Path(__file__).with_name("AirbnbPayoutPayload.csv").read_text()


def test_bulk_upload_payout_export_and_repeat_upload(client, session):
    for expected_created, expected_updated in ((1, 0), (0, 1)):
        response = client.post(
            "/bookings/bulk-upload/",
            files={"files": ("payouts.csv", payout_payload(), "text/csv")},
        )
        assert response.status_code == 200
        assert response.json() == {
            "files_processed": 1,
            "created": expected_created,
            "updated": expected_updated,
            "errors": [],
            "created_codes": ["SAMPLE12345"] if expected_created else [],
            "updated_codes": ["SAMPLE12345"] if expected_updated else [],
        }

    booking = session.query(models.Booking).one()
    assert booking.confirmation_code == "SAMPLE12345"
    assert booking.status == "Co-Host payout"
    assert booking.guest_name == "Example Guest"
    assert (booking.adults, booking.children, booking.infants) == (2, 0, 0)
    assert booking.start_date.isoformat() == "2026-11-13"
    assert booking.end_date.isoformat() == "2026-11-15"
    assert booking.booked_date.isoformat() == "2026-09-29"
    assert booking.nights == 2
    assert booking.contact == ""
    assert booking.earnings == ""
    assert booking.listing_number == "Room 4 - 1419"
    assert booking.property.address == "2 Pilrig Street"


def test_bulk_upload_mixed_formats_with_bom_and_duplicates(client, session):
    legacy = Path(__file__).with_name("BookingTestPayload.csv").read_bytes()
    response = client.post(
        "/bookings/bulk-upload/",
        files=[
            ("files", ("bookings.csv", legacy, "text/csv")),
            ("files", ("payouts.csv", "\ufeff" + payout_payload(), "text/csv")),
            ("files", ("repeat.csv", payout_payload(), "text/csv")),
        ],
    )
    body = response.json()
    expected_legacy = len(list(csv.DictReader(legacy.decode().splitlines())))
    assert response.status_code == 200
    assert body["files_processed"] == 3
    assert body["created"] == expected_legacy + 1
    assert body["updated"] == 0
    assert body["errors"] == []
    assert session.query(models.Booking).count() == expected_legacy + 1
    # Existing guest counts, earnings, and day-first dates retain their meaning.
    booking = session.query(models.Booking).filter_by(confirmation_code="HMBDNBNBMA").one()
    assert booking.adults == 2
    assert booking.earnings == "£279.51"
    assert booking.start_date.isoformat() == "2026-08-26"
    assert booking.booked_date.isoformat() == "2026-04-29"


def test_bulk_upload_only_bank_transfers(client, session):
    payload = "\n".join(payout_payload().splitlines()[:2]) + "\n"
    response = client.post(
        "/bookings/bulk-upload/",
        files={"files": ("transfers.csv", payload, "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["created"] == response.json()["updated"] == 0
    assert response.json()["errors"] == []
    assert session.query(models.Booking).count() == 0


def test_bulk_upload_payout_counts_and_arrival_date_detection(client, session):
    payload = payout_payload().replace("11/14/2026", "11/12/2026")
    payload = payload.replace("09/29/2026,11/13/2026,11/15/2026", "09/10/2026,11/03/2026,11/05/2026")
    payload = payload.replace(
        "Guest,2,0,0,", "Guest,3,2,1,"
    ).replace("0.00,0.00,,,2026", "0.00,0.00,200.00,,2026")
    response = client.post(
        "/bookings/bulk-upload/",
        files={"files": ("payouts.csv", payload, "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["errors"] == []
    booking = session.query(models.Booking).one()
    assert (booking.adults, booking.children, booking.infants) == (3, 2, 1)
    assert booking.start_date.isoformat() == "2026-11-03"
    assert booking.end_date.isoformat() == "2026-11-05"
    assert booking.earnings == "200.00"


def test_bulk_upload_reports_invalid_bookings_and_imports_valid_rows(client, session):
    rows = payout_payload().splitlines()
    missing_code = rows[2].replace("SAMPLE12345", "")
    invalid_date = rows[2].replace("SAMPLE12345", "BADDATE").replace("11/13/2026", "invalid")
    invalid_count = rows[2].replace("SAMPLE12345", "BADCOUNT").replace("Guest,2,0,0,", "Guest,invalid,0,0,")
    payload = "\n".join([rows[0], rows[1], missing_code, invalid_date, invalid_count, rows[2]])
    response = client.post(
        "/bookings/bulk-upload/",
        files={"files": ("payouts.csv", payload, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["created_codes"] == ["SAMPLE12345"]
    assert [error["row"] for error in body["errors"]] == [3, 4, 5]
    assert body["errors"][0]["error"] == "Missing confirmation code"
    assert "Unrecognised date format" in body["errors"][1]["error"]
    assert session.query(models.Booking).count() == 1
