"""Authentication schemas."""

from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Request body for login."""
    email: EmailStr
    password: str
    remember_me: bool = False


class UserResponse(BaseModel):
    """User data returned to frontend."""
    id: str
    email: str
    name: str
    role: str
    tenantId: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Response after successful login."""
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Request body for token refresh."""
    refresh_token: str


class RefreshResponse(BaseModel):
    """Response after successful token refresh."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # user_id
    tenant_id: str
    role: str
    exp: Optional[int] = None
    type: str  # "access" or "refresh"
