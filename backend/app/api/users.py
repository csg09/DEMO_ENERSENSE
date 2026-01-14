"""User management API routes."""

import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import get_password_hash, validate_password
from app.models.user import User
from app.api.auth import get_current_user_from_token

router = APIRouter()

# Constants
INVITE_EXPIRATION_DAYS = 7
ADMIN_ROLES = ["admin", "facility_manager"]


# Pydantic Models
class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    name: str
    role: str
    status: str
    tenant_id: str
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Response for list users endpoint."""
    users: List[UserResponse]
    total: int


class InviteUserRequest(BaseModel):
    """Request body for inviting a user."""
    email: EmailStr
    name: str
    role: str


class InviteUserResponse(BaseModel):
    """Response after sending invite."""
    id: str
    email: str
    name: str
    role: str
    status: str
    invite_token: str
    invite_expires_at: datetime
    message: str


class AcceptInviteRequest(BaseModel):
    """Request body for accepting an invite."""
    token: str
    password: str


class AcceptInviteResponse(BaseModel):
    """Response after accepting invite."""
    id: str
    email: str
    name: str
    role: str
    status: str
    message: str


class UpdateUserRequest(BaseModel):
    """Request body for updating a user."""
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


def check_admin_permission(current_user: User) -> None:
    """Check if current user has admin permissions."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and facility managers can perform this action"
        )


def generate_invite_token() -> str:
    """Generate a secure invite token."""
    return secrets.token_urlsafe(32)


@router.get("", response_model=UserListResponse)
async def list_users(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List all users in tenant (admin/facility manager only)."""
    check_admin_permission(current_user)

    # Get all users in the same tenant
    result = await db.execute(
        select(User).where(User.tenant_id == current_user.tenant_id)
    )
    users = result.scalars().all()

    user_responses = [
        UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            status=user.status,
            tenant_id=user.tenant_id,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        for user in users
    ]

    return UserListResponse(users=user_responses, total=len(user_responses))


@router.post("/invite", response_model=InviteUserResponse)
async def invite_user(
    request: InviteUserRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Send invite email to new user."""
    check_admin_permission(current_user)

    # Validate role
    valid_roles = ["admin", "facility_manager", "technician", "executive"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # Check if email already exists in tenant
    result = await db.execute(
        select(User).where(
            User.email == request.email,
            User.tenant_id == current_user.tenant_id
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists in your organization"
        )

    # Generate invite token and expiration
    invite_token = generate_invite_token()
    invite_expires_at = datetime.utcnow() + timedelta(days=INVITE_EXPIRATION_DAYS)

    # Create new user with pending status
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=request.email,
        name=request.name,
        role=request.role,
        status="pending",
        password_hash="",  # Will be set when invite is accepted
        invite_token=invite_token,
        invite_expires_at=invite_expires_at
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return InviteUserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        status=new_user.status,
        invite_token=invite_token,
        invite_expires_at=invite_expires_at,
        message="Invite created successfully. In production, an email would be sent."
    )


@router.post("/accept-invite", response_model=AcceptInviteResponse)
async def accept_invite(
    request: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db)
):
    """Accept invite and set password."""
    # Find user by invite token
    result = await db.execute(
        select(User).where(User.invite_token == request.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite token"
        )

    # Check if token is expired
    if user.invite_expires_at and user.invite_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite token has expired. Please request a new invite."
        )

    # Check if user is still in pending status
    if user.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite has already been used"
        )

    # Validate password
    is_valid, error_message = validate_password(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    # Set password and activate user
    user.password_hash = get_password_hash(request.password)
    user.status = "active"
    user.invite_token = None
    user.invite_expires_at = None
    user.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user)

    return AcceptInviteResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        status=user.status,
        message="Account activated successfully. You can now log in."
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get user details."""
    # Users can get their own details, admins can get any user in tenant
    if user_id != current_user.id:
        check_admin_permission(current_user)

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        status=user.status,
        tenant_id=user.tenant_id,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Update user (admin only)."""
    check_admin_permission(current_user)

    # Find user in same tenant
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from demoting themselves
    if user_id == current_user.id and request.role and request.role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )

    # Validate role if provided
    if request.role:
        valid_roles = ["admin", "facility_manager", "technician", "executive"]
        if request.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        user.role = request.role

    # Validate status if provided
    if request.status:
        valid_statuses = ["active", "inactive", "pending"]
        if request.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        user.status = request.status

    # Update name if provided
    if request.name:
        user.name = request.name

    user.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        status=user.status,
        tenant_id=user.tenant_id,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.delete("/{user_id}", response_model=MessageResponse)
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate user (admin only)."""
    check_admin_permission(current_user)

    # Prevent self-deactivation
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )

    # Find user in same tenant
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Deactivate instead of delete
    user.status = "inactive"
    user.updated_at = datetime.utcnow()

    await db.commit()

    return MessageResponse(message=f"User {user.email} has been deactivated")
