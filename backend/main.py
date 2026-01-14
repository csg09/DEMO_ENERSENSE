"""
SmartSense Backend API
Intelligent Energy Management and Building Operations Platform
# Reload trigger: cascade delete support added
"""

import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables
from app.core.websocket import manager
from app.api import auth, users, portfolios, sites, systems, assets, alerts, work_orders, dashboards, reports
from app.core.security import decode_token


def log(msg):
    """Log with flush to ensure output is visible."""
    print(msg, flush=True)
    sys.stdout.flush()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup
    await create_tables()
    yield
    # Shutdown


app = FastAPI(
    title="SmartSense API",
    description="Intelligent Energy Management and Building Operations Platform",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log HTTP requests (not WebSocket)."""
    print(f"!!! REQUEST: {request.method} {request.url.path} !!!")
    response = await call_next(request)
    print(f"!!! RESPONSE: {response.status_code} for {request.method} {request.url.path} !!!")
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["Portfolios"])
app.include_router(sites.router, prefix="/api/sites", tags=["Sites"])
app.include_router(systems.router, prefix="/api/systems", tags=["Systems"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(work_orders.router, prefix="/api/work-orders", tags=["Work Orders"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["Dashboards"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "name": "SmartSense API",
        "version": "1.0.0",
        "status": "healthy",
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications."""
    log("!!! WEBSOCKET CONNECTION ATTEMPT !!!")

    # Get token from query params
    token = websocket.query_params.get("token")
    if not token:
        log("!!! WEBSOCKET: No token provided !!!")
        await websocket.close(code=4001, reason="No token provided")
        return

    # Verify token and get user info
    try:
        payload = decode_token(token)
        if not payload:
            log("!!! WEBSOCKET: Invalid token !!!")
            await websocket.close(code=4001, reason="Invalid token")
            return

        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            log("!!! WEBSOCKET: No tenant ID !!!")
            await websocket.close(code=4002, reason="No tenant ID")
            return

        log(f"!!! WEBSOCKET: Connecting tenant {tenant_id} !!!")
        # Connect and handle messages
        await manager.connect(websocket, tenant_id)
        log("!!! WEBSOCKET: Connected successfully !!!")

        try:
            while True:
                # Keep connection alive, handle incoming messages
                data = await websocket.receive_text()
                # Echo back for ping/pong
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            log("!!! WEBSOCKET: Client disconnected !!!")
            manager.disconnect(websocket, tenant_id)
    except Exception as e:
        log(f"!!! WEBSOCKET ERROR: {e} !!!")
        try:
            await websocket.close(code=4003, reason="Server error")
        except Exception:
            pass
