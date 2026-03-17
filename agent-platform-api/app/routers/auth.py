from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> dict:
    """Login and receive JWT token."""
    raise NotImplementedError("Auth service implemented in Phase B3")


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Get current user from token."""
    return user
