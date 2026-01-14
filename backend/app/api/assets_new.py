"""Simple asset routes for testing."""
print("!!! ASSETS_NEW.PY LOADED !!!")

from fastapi import APIRouter

router = APIRouter()


@router.get("/test-simple")
async def test_simple():
    """Simple test route."""
    return {"test": "success from assets_new"}


@router.get("")
async def list_assets_simple():
    """Simple list assets."""
    return [{"id": "1", "name": "Test Asset"}]
