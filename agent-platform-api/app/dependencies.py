import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.schemas.auth import UserResponse


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Mock current user for Phase B1. Will be replaced with real JWT validation in B3.
_MOCK_USER = UserResponse(
    id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
    email="kevin@sanguinebio.com",
    display_name="Kevin Phillips",
    role="revops",
    is_active=True,
    created_at="2026-01-01T00:00:00Z",
)


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> UserResponse:
    """Mock auth dependency. Returns hardcoded admin user.
    Will be replaced with real JWT validation in Phase B3."""
    return _MOCK_USER


def require_role(*roles: str):
    """Dependency factory that checks user role."""

    async def _check_role(
        user: UserResponse = Depends(get_current_user),
    ) -> UserResponse:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not authorized. Required: {', '.join(roles)}",
            )
        return user

    return _check_role


async def verify_api_key(
    x_api_key: Annotated[str | None, Header()] = None,
) -> str:
    """Verify API key for service-to-service calls.
    Mock implementation for Phase B1 — accepts any non-empty key."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
        )
    return x_api_key
