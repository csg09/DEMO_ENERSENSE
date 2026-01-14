# Quick Start Guide

Get DEMO_ENERSENSE up and running in 5 minutes!

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ installed
- Git installed

## Installation (5 Steps)

### 1. Clone the Repository

```bash
git clone https://github.com/csg09/DEMO_ENERSENSE.git
cd DEMO_ENERSENSE
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env

# Initialize database
python init_db.py
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### 4. Start the Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Open in Browser

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

**Default Login:**
- Email: `admin@demo.com`
- Password: `admin123`

---

## Alternative: One-Command Startup

Use the provided script to start both servers:

```bash
python run_servers.py
```

Press `Ctrl+C` to stop both servers.

---

## What's Next?

### Explore the Application
1. **Dashboard**: View KPIs, energy trends, and asset health
2. **Assets**: Browse and manage your facilities and equipment
3. **Alerts**: Monitor active alerts and acknowledgments
4. **Work Orders**: Create and track maintenance tasks
5. **Reports**: Generate energy consumption reports

### API Exploration
Visit http://localhost:8000/docs to:
- View all API endpoints
- Test endpoints interactively
- See request/response schemas

### Customize for Your Needs
1. **Add Your Assets**: Use the Assets page to add your facilities
2. **Configure Alerts**: Set up alert rules and priorities
3. **Create Work Orders**: Schedule maintenance tasks
4. **Track Energy**: Input your energy consumption data

---

## Common Issues

### Backend Won't Start

**Issue**: `ModuleNotFoundError`
**Solution**: Ensure virtual environment is activated and dependencies installed
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**Issue**: `Database not found`
**Solution**: Run database initialization
```bash
python init_db.py
```

### Frontend Won't Start

**Issue**: `Module not found`
**Solution**: Install dependencies
```bash
npm install
```

**Issue**: `Cannot connect to API`
**Solution**: Ensure backend is running on port 8000

### Login Doesn't Work

**Issue**: Invalid credentials
**Solution**: Use default credentials:
- Email: `admin@demo.com`
- Password: `admin123`

If you changed them, reset the database:
```bash
cd backend
rm enersense.db
python init_db.py
```

---

## Project Structure

```
DEMO_ENERSENSE/
├── backend/          # FastAPI backend
│   ├── main.py      # Entry point
│   ├── models/      # Database models
│   ├── routers/     # API endpoints
│   └── ...
├── frontend/        # React frontend
│   ├── src/
│   │   ├── pages/   # Page components
│   │   ├── components/  # Reusable components
│   │   └── ...
│   └── ...
└── docs/            # Documentation
```

---

## Default Data

The initial database includes:

**Users:**
- Admin: `admin@demo.com` / `admin123`

**Organization:**
- Demo Organization

**Sample Assets:**
- 10 HVAC units
- 5 Electrical systems
- 3 Mechanical assets

**Sample Alerts:**
- Various priority alerts for demonstration

**Sample Work Orders:**
- Open and in-progress work orders

---

## Next Steps

1. **Read Full Documentation**: See [README.md](./README.md)
2. **Explore API**: Visit [API.md](./docs/API.md)
3. **Deploy to Production**: See [DEPLOYMENT.md](./docs/DEPLOYMENT.md)
4. **Contribute**: Read [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Getting Help

- **Documentation**: https://github.com/csg09/DEMO_ENERSENSE
- **Issues**: https://github.com/csg09/DEMO_ENERSENSE/issues
- **Discussions**: https://github.com/csg09/DEMO_ENERSENSE/discussions

---

## Quick Commands Cheat Sheet

```bash
# Start backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Start frontend
cd frontend && npm run dev

# Run backend tests
cd backend && pytest

# Run frontend tests
cd frontend && npm test

# Format backend code
cd backend && black . && ruff check .

# Format frontend code
cd frontend && npm run lint && npm run format

# Build frontend for production
cd frontend && npm run build

# Database migrations
cd backend && alembic upgrade head
```

---

**Happy Building! 🚀**
