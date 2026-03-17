from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.auth import TokenResponse, UserResponse


def create_access_token(user: User) -> str:
    """Create JWT access token for a user."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token. Raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> TokenResponse:
    """Authenticate user by email/password. In dev mode, accepts any password for existing users."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("Account is disabled")

    # Dev mode: accept any password for seeded users
    # Production would use passlib to verify hashed passwords
    if settings.ENVIRONMENT != "development":
        raise ValueError("Production auth not yet implemented")

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)

    access_token = create_access_token(user)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response,
    )


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """Look up a user by their UUID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
