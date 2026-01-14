# DEMO_ENERSENSE File Structure

Complete directory structure and file organization for the DEMO_ENERSENSE project.

## Root Directory

```
DEMO_ENERSENSE/
├── README.md                    # Main project documentation
├── QUICKSTART.md               # 5-minute setup guide
├── CHANGELOG.md                # Version history and release notes
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
├── .gitignore                  # Git ignore patterns
├── docker-compose.yml          # Docker orchestration
├── .env.example                # Docker environment template
└── run_servers.py              # Script to start both servers
```

## Documentation

```
docs/
├── API.md                      # Complete API documentation
├── DEPLOYMENT.md               # Production deployment guide
├── DEVELOPMENT.md              # Development best practices
├── ARCHITECTURE.md             # System architecture details
└── screenshots/                # Application screenshots
    ├── dashboard.png
    ├── assets.png
    ├── alerts.png
    └── work-orders.png
```

## Backend Structure

```
backend/
├── main.py                     # FastAPI application entry point
├── config.py                   # Configuration management
├── database.py                 # Database connection & session
├── init_db.py                  # Database initialization script
├── requirements.txt            # Python dependencies
├── requirements-dev.txt        # Development dependencies
├── .env.example                # Environment variables template
├── Dockerfile                  # Docker image definition
├── .dockerignore              # Docker ignore patterns
│
├── alembic/                    # Database migrations
│   ├── env.py                  # Alembic environment
│   ├── script.py.mako          # Migration template
│   ├── alembic.ini             # Alembic configuration
│   └── versions/               # Migration scripts
│       └── 001_initial.py      # Initial schema
│
├── models/                     # SQLAlchemy ORM models
│   ├── __init__.py
│   ├── base.py                 # Base model class
│   ├── user.py                 # User model
│   ├── organization.py         # Organization model
│   ├── asset.py                # Asset model
│   ├── facility.py             # Facility model
│   ├── alert.py                # Alert model
│   ├── work_order.py           # Work order model
│   └── energy.py               # Energy data model
│
├── schemas/                    # Pydantic validation schemas
│   ├── __init__.py
│   ├── user.py                 # User DTOs
│   ├── auth.py                 # Authentication DTOs
│   ├── asset.py                # Asset DTOs
│   ├── alert.py                # Alert DTOs
│   ├── work_order.py           # Work order DTOs
│   ├── energy.py               # Energy DTOs
│   └── common.py               # Shared schemas
│
├── routers/                    # API route handlers
│   ├── __init__.py
│   ├── auth.py                 # Authentication endpoints
│   ├── assets.py               # Asset management endpoints
│   ├── facilities.py           # Facility endpoints
│   ├── alerts.py               # Alert endpoints
│   ├── work_orders.py          # Work order endpoints
│   ├── energy.py               # Energy endpoints
│   └── dashboard.py            # Dashboard KPI endpoints
│
├── services/                   # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py         # Authentication logic
│   ├── asset_service.py        # Asset management logic
│   ├── alert_service.py        # Alert management logic
│   ├── work_order_service.py   # Work order logic
│   ├── energy_service.py       # Energy calculations
│   └── notification_service.py # Notification handling
│
├── utils/                      # Utility functions
│   ├── __init__.py
│   ├── security.py             # JWT & password hashing
│   ├── dependencies.py         # FastAPI dependencies
│   ├── validators.py           # Custom validators
│   ├── formatters.py           # Data formatters
│   └── exceptions.py           # Custom exceptions
│
├── middleware/                 # Custom middleware
│   ├── __init__.py
│   ├── auth_middleware.py      # Authentication middleware
│   ├── error_handler.py        # Global error handling
│   └── logging_middleware.py   # Request logging
│
├── tests/                      # Backend tests
│   ├── __init__.py
│   ├── conftest.py             # Pytest fixtures
│   ├── test_auth.py            # Authentication tests
│   ├── test_assets.py          # Asset tests
│   ├── test_alerts.py          # Alert tests
│   ├── test_work_orders.py     # Work order tests
│   └── test_energy.py          # Energy tests
│
└── logs/                       # Application logs (gitignored)
    └── app.log
```

## Frontend Structure

```
frontend/
├── package.json                # Node dependencies
├── package-lock.json           # Locked versions
├── tsconfig.json               # TypeScript configuration
├── tsconfig.node.json          # TypeScript config for Vite
├── vite.config.ts              # Vite build configuration
├── tailwind.config.js          # TailwindCSS configuration
├── postcss.config.js           # PostCSS configuration
├── .env.example                # Environment variables template
├── Dockerfile                  # Docker image definition
├── .dockerignore              # Docker ignore patterns
├── .eslintrc.cjs              # ESLint configuration
├── .prettierrc                # Prettier configuration
│
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── robots.txt
│
├── src/
│   ├── main.tsx                # Application entry point
│   ├── App.tsx                 # Root component
│   ├── index.css               # Global styles with Tailwind
│   ├── vite-env.d.ts          # Vite type definitions
│   │
│   ├── components/             # Reusable components
│   │   ├── Layout/
│   │   │   ├── Header.tsx      # App header
│   │   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   │   ├── Footer.tsx      # App footer
│   │   │   └── Layout.tsx      # Main layout wrapper
│   │   │
│   │   ├── Dashboard/
│   │   │   ├── KPICard.tsx     # KPI display card
│   │   │   ├── EnergyChart.tsx # Energy consumption chart
│   │   │   ├── AssetHealthChart.tsx # Asset health chart
│   │   │   ├── AlertList.tsx   # Recent alerts list
│   │   │   └── WorkOrderSummary.tsx # Work order summary
│   │   │
│   │   ├── Assets/
│   │   │   ├── AssetList.tsx   # Asset list view
│   │   │   ├── AssetCard.tsx   # Individual asset card
│   │   │   ├── AssetDetails.tsx # Asset detail view
│   │   │   ├── AssetForm.tsx   # Asset create/edit form
│   │   │   └── AssetFilter.tsx # Asset filtering
│   │   │
│   │   ├── Alerts/
│   │   │   ├── AlertList.tsx   # Alert list view
│   │   │   ├── AlertCard.tsx   # Individual alert card
│   │   │   ├── AlertDetails.tsx # Alert detail modal
│   │   │   └── AlertBadge.tsx  # Priority badge
│   │   │
│   │   ├── WorkOrders/
│   │   │   ├── WorkOrderList.tsx # Work order list
│   │   │   ├── WorkOrderCard.tsx # Work order card
│   │   │   ├── WorkOrderForm.tsx # Create/edit form
│   │   │   └── WorkOrderDetails.tsx # Detail view
│   │   │
│   │   ├── Energy/
│   │   │   ├── ConsumptionChart.tsx # Consumption chart
│   │   │   ├── TrendAnalysis.tsx # Trend visualization
│   │   │   ├── CostBreakdown.tsx # Cost analysis
│   │   │   └── FacilityComparison.tsx # Compare facilities
│   │   │
│   │   └── common/             # Shared components
│   │       ├── Button.tsx      # Button component
│   │       ├── Card.tsx        # Card wrapper
│   │       ├── Input.tsx       # Input field
│   │       ├── Select.tsx      # Select dropdown
│   │       ├── Modal.tsx       # Modal dialog
│   │       ├── Spinner.tsx     # Loading spinner
│   │       ├── Table.tsx       # Data table
│   │       ├── Pagination.tsx  # Pagination controls
│   │       ├── DatePicker.tsx  # Date picker
│   │       ├── SearchBar.tsx   # Search input
│   │       └── ErrorBoundary.tsx # Error boundary
│   │
│   ├── pages/                  # Page components
│   │   ├── Login.tsx           # Login page
│   │   ├── Register.tsx        # Registration page
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── Assets.tsx          # Assets page
│   │   ├── AssetDetails.tsx    # Asset detail page
│   │   ├── Alerts.tsx          # Alerts page
│   │   ├── WorkOrders.tsx      # Work orders page
│   │   ├── Reports.tsx         # Reports page
│   │   ├── Settings.tsx        # Settings page
│   │   ├── Profile.tsx         # User profile
│   │   └── NotFound.tsx        # 404 page
│   │
│   ├── services/               # API client services
│   │   ├── api.ts              # Axios instance & config
│   │   ├── authService.ts      # Auth API calls
│   │   ├── assetService.ts     # Asset API calls
│   │   ├── alertService.ts     # Alert API calls
│   │   ├── workOrderService.ts # Work order API calls
│   │   └── energyService.ts    # Energy API calls
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── useAssets.ts        # Asset data hook
│   │   ├── useAlerts.ts        # Alert data hook
│   │   ├── useWorkOrders.ts    # Work order hook
│   │   ├── useEnergy.ts        # Energy data hook
│   │   ├── usePagination.ts    # Pagination hook
│   │   ├── useDebounce.ts      # Debounce hook
│   │   └── useLocalStorage.ts  # LocalStorage hook
│   │
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx     # Authentication context
│   │   ├── ThemeContext.tsx    # Theme context
│   │   └── NotificationContext.tsx # Notification context
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── index.ts            # Barrel export
│   │   ├── auth.ts             # Auth types
│   │   ├── asset.ts            # Asset types
│   │   ├── alert.ts            # Alert types
│   │   ├── workOrder.ts        # Work order types
│   │   ├── energy.ts           # Energy types
│   │   └── common.ts           # Shared types
│   │
│   ├── utils/                  # Utility functions
│   │   ├── formatters.ts       # Data formatters
│   │   ├── validators.ts       # Input validators
│   │   ├── constants.ts        # App constants
│   │   ├── helpers.ts          # Helper functions
│   │   └── dateUtils.ts        # Date utilities
│   │
│   ├── styles/                 # Additional styles
│   │   ├── variables.css       # CSS variables
│   │   └── components.css      # Component styles
│   │
│   └── assets/                 # Static assets
│       ├── images/
│       ├── icons/
│       └── fonts/
│
└── tests/                      # Frontend tests
    ├── setup.ts                # Test setup
    ├── components/
    │   ├── AssetCard.test.tsx
    │   ├── KPICard.test.tsx
    │   └── ...
    ├── pages/
    │   ├── Dashboard.test.tsx
    │   └── ...
    ├── hooks/
    │   ├── useAuth.test.tsx
    │   └── ...
    └── utils/
        ├── formatters.test.ts
        └── ...
```

## Scripts Directory

```
scripts/
├── run_servers.py              # Start both servers
├── cleanup.py                  # Clean temporary files
├── seed_data.py                # Seed database with test data
├── backup_db.sh                # Backup database
├── deploy.sh                   # Deployment script
└── setup_dev.sh                # Dev environment setup
```

## Nginx Configuration (Optional)

```
nginx/
├── nginx.conf                  # Main nginx config
├── sites-available/
│   ├── enersense-api.conf     # Backend proxy config
│   └── enersense-app.conf     # Frontend config
└── ssl/                        # SSL certificates
    ├── cert.pem
    └── key.pem
```

## CI/CD Configuration (Optional)

```
.github/
└── workflows/
    ├── tests.yml               # Run tests on PR
    ├── deploy.yml              # Deploy to production
    └── docker-build.yml        # Build Docker images
```

## Total File Count

- **Backend**: ~50 Python files
- **Frontend**: ~60 TypeScript/React files
- **Documentation**: 8 markdown files
- **Configuration**: 15+ config files
- **Tests**: 30+ test files

## Key Files Summary

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `docker-compose.yml` | Docker orchestration |
| `backend/main.py` | Backend entry point |
| `frontend/src/main.tsx` | Frontend entry point |
| `backend/database.py` | Database configuration |
| `frontend/src/App.tsx` | Root React component |
| `.env.example` | Environment template |
| `requirements.txt` | Python dependencies |
| `package.json` | Node dependencies |

## Generated/Ignored Files

The following are generated or ignored by git:

```
# Backend
backend/venv/
backend/__pycache__/
backend/*.db
backend/logs/
backend/.pytest_cache/

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.vite/

# Root
.env
.DS_Store
*.log
```

---

## File Organization Principles

1. **Separation of Concerns**: Models, services, and routes are separate
2. **Type Safety**: TypeScript interfaces and Pydantic schemas
3. **Reusability**: Shared components and utilities
4. **Testing**: Tests mirror source structure
5. **Documentation**: Comprehensive docs at multiple levels
6. **Configuration**: Environment-based configuration
7. **Scalability**: Modular structure for easy expansion

---

This structure supports:
- ✅ Easy navigation
- ✅ Clear responsibilities
- ✅ Testability
- ✅ Maintainability
- ✅ Scalability
- ✅ Team collaboration
