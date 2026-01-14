"""Authentication API routes."""

from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.config import settings
from app.models.user import User
from app.models.session import Session
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
    UserResponse
)

router = APIRouter()
security = HTTPBearer(auto_error=False)


async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Extract and validate user from JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is not active",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password, returns access and refresh tokens."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is not active",
        )

    # Create tokens
    token_data = {
        "sub": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data, request.remember_me)

    # Calculate refresh token expiry
    if request.remember_me:
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days_remember)
    else:
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    # Store session
    session = Session(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )
    db.add(session)

    # Update last login
    user.last_login_at = datetime.utcnow()

    await db.commit()

    return LoginResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            tenantId=user.tenant_id,
        ),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Logout and revoke refresh token."""
    if not credentials:
        return {"message": "Logged out successfully"}

    token = credentials.credentials
    payload = decode_token(token)

    if payload:
        user_id = payload.get("sub")
        if user_id:
            # Delete all sessions for this user
            result = await db.execute(select(Session).where(Session.user_id == user_id))
            sessions = result.scalars().all()
            for session in sessions:
                await db.delete(session)
            await db.commit()

    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    # Verify refresh token
    payload = decode_token(request.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    # Check if session exists
    result = await db.execute(
        select(Session).where(Session.refresh_token == request.refresh_token)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or already revoked",
        )

    if session.expires_at < datetime.utcnow():
        await db.delete(session)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    # Get user
    result = await db.execute(select(User).where(User.id == session.user_id))
    user = result.scalar_one_or_none()

    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new access token
    token_data = {
        "sub": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
    }

    access_token = create_access_token(token_data)

    return RefreshResponse(access_token=access_token)


@router.post("/forgot-password")
async def forgot_password(db: AsyncSession = Depends(get_db)):
    """Request password reset email."""
    # TODO: Implement forgot password
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/reset-password")
async def reset_password(db: AsyncSession = Depends(get_db)):
    """Reset password using token."""
    # TODO: Implement password reset
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user_from_token)):
    """Get current user profile."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        tenantId=current_user.tenant_id,
    )


@router.put("/me")
async def update_current_user(db: AsyncSession = Depends(get_db)):
    """Update current user profile."""
    # TODO: Implement update current user
    raise HTTPException(status_code=501, detail="Not implemented yet")
