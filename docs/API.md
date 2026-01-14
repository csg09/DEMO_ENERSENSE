# API Documentation

## Base URL
```
Development: http://localhost:8000
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Get JWT Token
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "admin@demo.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@demo.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

---

## Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
```
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "integer",
    "email": "string",
    "name": "string",
    "role": "string"
  }
}
```

#### Register
```http
POST /api/auth/register
```
Create a new user account.

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "organization_id": "integer"
}
```

**Response:** `201 Created`
```json
{
  "id": "integer",
  "email": "string",
  "name": "string",
  "role": "string",
  "created_at": "datetime"
}
```

#### Get Current User
```http
GET /api/auth/me
```
Get currently authenticated user's information.

**Response:** `200 OK`
```json
{
  "id": "integer",
  "email": "string",
  "name": "string",
  "role": "string",
  "organization_id": "integer",
  "created_at": "datetime"
}
```

---

### Assets

#### List Assets
```http
GET /api/assets
```
Get paginated list of assets with optional filters.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum records to return (default: 100)
- `facility_id` (integer, optional): Filter by facility
- `status` (string, optional): Filter by status (active, maintenance, offline)
- `asset_type` (string, optional): Filter by type (hvac, electrical, mechanical)

**Response:** `200 OK`
```json
{
  "total": 50,
  "items": [
    {
      "id": 1,
      "name": "HVAC Unit 1",
      "asset_type": "hvac",
      "status": "active",
      "health_score": 85,
      "facility_id": 1,
      "facility_name": "Building A",
      "last_maintenance": "2025-01-01T10:00:00",
      "next_maintenance": "2025-02-01T10:00:00"
    }
  ]
}
```

#### Get Asset Details
```http
GET /api/assets/{asset_id}
```
Get detailed information about a specific asset.

**Path Parameters:**
- `asset_id` (integer, required): Asset ID

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "HVAC Unit 1",
  "asset_type": "hvac",
  "status": "active",
  "health_score": 85,
  "facility_id": 1,
  "description": "Primary cooling unit",
  "manufacturer": "Carrier",
  "model": "30RB-100",
  "serial_number": "SN123456",
  "install_date": "2020-01-15",
  "warranty_expiry": "2025-01-15",
  "specifications": {
    "capacity": "100 tons",
    "voltage": "480V",
    "refrigerant": "R-410A"
  },
  "maintenance_history": [],
  "energy_consumption": []
}
```

#### Create Asset
```http
POST /api/assets
```
Create a new asset.

**Request:**
```json
{
  "name": "string",
  "asset_type": "hvac|electrical|mechanical",
  "facility_id": "integer",
  "description": "string",
  "manufacturer": "string",
  "model": "string",
  "serial_number": "string",
  "install_date": "date",
  "specifications": {}
}
```

**Response:** `201 Created`

#### Update Asset
```http
PUT /api/assets/{asset_id}
```
Update an existing asset.

**Request:**
```json
{
  "name": "string",
  "status": "active|maintenance|offline",
  "health_score": "integer",
  "description": "string"
}
```

**Response:** `200 OK`

#### Delete Asset
```http
DELETE /api/assets/{asset_id}
```
Delete an asset.

**Response:** `204 No Content`

---

### Alerts

#### List Alerts
```http
GET /api/alerts
```
Get list of alerts with optional filters.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip
- `limit` (integer, optional): Maximum records to return
- `priority` (string, optional): Filter by priority (critical, high, medium, low)
- `status` (string, optional): Filter by status (active, acknowledged, resolved)
- `asset_id` (integer, optional): Filter by asset

**Response:** `200 OK`
```json
{
  "total": 25,
  "items": [
    {
      "id": 1,
      "title": "High Temperature Alert",
      "description": "HVAC Unit 1 temperature exceeds threshold",
      "priority": "high",
      "status": "active",
      "asset_id": 1,
      "asset_name": "HVAC Unit 1",
      "created_at": "2025-01-14T08:30:00",
      "acknowledged_at": null,
      "resolved_at": null
    }
  ]
}
```

#### Create Alert
```http
POST /api/alerts
```
Create a new alert.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "priority": "critical|high|medium|low",
  "asset_id": "integer"
}
```

**Response:** `201 Created`

#### Update Alert Status
```http
PUT /api/alerts/{alert_id}
```
Update alert status (acknowledge or resolve).

**Request:**
```json
{
  "status": "acknowledged|resolved",
  "notes": "string"
}
```

**Response:** `200 OK`

---

### Work Orders

#### List Work Orders
```http
GET /api/work-orders
```
Get list of work orders with optional filters.

**Query Parameters:**
- `skip` (integer, optional)
- `limit` (integer, optional)
- `status` (string, optional): Filter by status (open, in_progress, completed, cancelled)
- `priority` (string, optional): Filter by priority
- `assigned_to` (integer, optional): Filter by assigned user

**Response:** `200 OK`
```json
{
  "total": 30,
  "items": [
    {
      "id": 1,
      "title": "Replace HVAC Filter",
      "description": "Scheduled filter replacement",
      "status": "open",
      "priority": "medium",
      "asset_id": 1,
      "asset_name": "HVAC Unit 1",
      "assigned_to": 2,
      "assigned_to_name": "John Doe",
      "created_at": "2025-01-14T09:00:00",
      "due_date": "2025-01-20T17:00:00",
      "completed_at": null
    }
  ]
}
```

#### Create Work Order
```http
POST /api/work-orders
```
Create a new work order.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "priority": "critical|high|medium|low",
  "asset_id": "integer",
  "assigned_to": "integer",
  "due_date": "datetime"
}
```

**Response:** `201 Created`

#### Update Work Order
```http
PUT /api/work-orders/{work_order_id}
```
Update work order details or status.

**Request:**
```json
{
  "status": "open|in_progress|completed|cancelled",
  "notes": "string",
  "completed_at": "datetime"
}
```

**Response:** `200 OK`

---

### Energy

#### Get Energy Consumption
```http
GET /api/energy/consumption
```
Get energy consumption data over time.

**Query Parameters:**
- `start_date` (date, optional): Start date for data range
- `end_date` (date, optional): End date for data range
- `facility_id` (integer, optional): Filter by facility
- `interval` (string, optional): Data interval (hourly, daily, monthly) (default: daily)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "timestamp": "2025-01-14T00:00:00",
      "consumption_kwh": 1250.5,
      "cost": 125.05,
      "facility_id": 1,
      "facility_name": "Building A"
    }
  ],
  "summary": {
    "total_consumption": 37515.0,
    "total_cost": 3751.50,
    "average_daily": 1250.5,
    "peak_demand": 2100.0
  }
}
```

#### Get Energy Trends
```http
GET /api/energy/trends
```
Get energy consumption trends and analytics.

**Query Parameters:**
- `period` (string, optional): Analysis period (week, month, quarter, year) (default: month)

**Response:** `200 OK`
```json
{
  "current_period": {
    "consumption_kwh": 37515.0,
    "cost": 3751.50
  },
  "previous_period": {
    "consumption_kwh": 35200.0,
    "cost": 3520.00
  },
  "change_percent": 6.6,
  "trend": "increasing",
  "forecast": {
    "next_month_consumption": 39000.0,
    "next_month_cost": 3900.00
  }
}
```

#### Get Consumption by Facility
```http
GET /api/energy/by-facility
```
Get energy consumption breakdown by facility.

**Query Parameters:**
- `start_date` (date, optional)
- `end_date` (date, optional)

**Response:** `200 OK`
```json
{
  "facilities": [
    {
      "facility_id": 1,
      "facility_name": "Building A",
      "consumption_kwh": 25000.0,
      "cost": 2500.00,
      "percentage": 66.6
    },
    {
      "facility_id": 2,
      "facility_name": "Building B",
      "consumption_kwh": 12515.0,
      "cost": 1251.50,
      "percentage": 33.4
    }
  ]
}
```

---

### Dashboard

#### Get Dashboard KPIs
```http
GET /api/dashboard/kpis
```
Get key performance indicators for the dashboard.

**Response:** `200 OK`
```json
{
  "total_assets": 150,
  "active_assets": 142,
  "assets_in_maintenance": 5,
  "offline_assets": 3,
  "active_alerts": 12,
  "critical_alerts": 2,
  "open_work_orders": 25,
  "overdue_work_orders": 3,
  "energy_consumption_today": 1250.5,
  "energy_cost_today": 125.05,
  "average_asset_health": 87.5
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Example Error Responses

**Validation Error (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Authentication Error (401):**
```json
{
  "detail": "Could not validate credentials"
}
```

**Permission Error (403):**
```json
{
  "detail": "Not enough permissions"
}
```

---

## Rate Limiting

API requests are rate limited to:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642147200
```

---

## Pagination

List endpoints support pagination using `skip` and `limit` parameters:

```http
GET /api/assets?skip=0&limit=20
```

Response includes total count:
```json
{
  "total": 150,
  "items": [...]
}
```

---

## Filtering & Sorting

Many endpoints support filtering and sorting:

**Filtering:**
```http
GET /api/assets?status=active&asset_type=hvac
```

**Sorting:**
```http
GET /api/assets?sort_by=name&order=asc
```

---

## Webhooks (Coming Soon)

Subscribe to real-time events:
- `alert.created`
- `alert.resolved`
- `asset.status_changed`
- `work_order.completed`

---

## API Versioning

The API uses URL-based versioning:
```
/api/v1/assets
```

Current version: v1

---

## SDK & Client Libraries

- **Python**: `pip install enersense-client` (coming soon)
- **JavaScript**: `npm install @enersense/client` (coming soon)
- **TypeScript**: Type definitions included

---

## Interactive Documentation

Explore the API interactively:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Support

For API support:
- GitHub Issues: https://github.com/csg09/DEMO_ENERSENSE/issues
- Email: support@enersense.example.com
