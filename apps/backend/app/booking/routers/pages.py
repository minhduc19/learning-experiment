from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, FileResponse
from fastapi import HTTPException

router = APIRouter(tags=["pages"])


@router.get("/index-checkout", response_class=HTMLResponse)
async def read_index():
    with open(Path(__file__).resolve().parents[1] / "frontend/checkout.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


@router.get("/index-upload", response_class=HTMLResponse)
async def read_upload():
    with open(Path(__file__).resolve().parents[1] / "frontend/upload.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


@router.get("/index-documents", response_class=HTMLResponse)
async def read_documents():
    with open(Path(__file__).resolve().parents[1] / "frontend/documents.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


@router.get("/index-cleaner", response_class=HTMLResponse)
async def read_cleaner():
    with open(Path(__file__).resolve().parents[1] / "frontend/cleaner.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


@router.get("/index-bookings", response_class=HTMLResponse)
async def read_bookings():
    with open(Path(__file__).resolve().parents[1] / "frontend/bookings.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


@router.get("/index-listing-metadata", response_class=HTMLResponse)
async def read_listing_metadata():
    with open(Path(__file__).resolve().parents[1] / "frontend/listing_metadata.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


@router.get("/")
async def read_root():
    return {"message": "Changed to private repository"}


@router.get("/assets/{asset_path:path}", include_in_schema=False)
async def booking_asset(asset_path: str):
    root = Path(__file__).resolve().parents[1] / "frontend"
    target = (root / asset_path).resolve()
    if root not in target.parents or target.suffix not in {".css", ".js"} or not target.is_file():
        raise HTTPException(404, "Asset not found")
    return FileResponse(target)
