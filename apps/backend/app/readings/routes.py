from uuid import UUID

from fastapi import APIRouter, HTTPException, Response
from pydantic import ValidationError

from app.readings.schemas import ReadingCreate, ReadingDocument
from app.readings.service import generate_reading, read_reading, save_reading

router = APIRouter()


@router.post("", response_model=ReadingDocument, status_code=201)
def create_reading(data: ReadingCreate, response: Response):
    document = generate_reading(data)
    try:
        save_reading(document)
    except OSError:
        raise HTTPException(status_code=503, detail="Reading storage is unavailable") from None
    response.headers["Location"] = f"/api/readings/{document.id}"
    return document


@router.get("/{reading_id}", response_model=ReadingDocument)
def get_reading(reading_id: UUID):
    try:
        return read_reading(reading_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Reading not found") from None
    except (ValueError, ValidationError):
        raise HTTPException(status_code=500, detail="Saved reading data is invalid") from None
    except OSError:
        raise HTTPException(status_code=503, detail="Reading storage is unavailable") from None
