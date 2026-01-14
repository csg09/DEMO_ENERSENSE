#!/bin/bash
# SmartSense - Development Environment Setup Script
# This script sets up and runs the development environment

set -e  # Exit on error

echo "=============================================="
echo "SmartSense Development Environment Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    echo -e "\n${YELLOW}Checking requirements...${NC}"

    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        echo -e "${GREEN}✓ Python: $PYTHON_VERSION${NC}"
    else
        echo -e "${RED}✗ Python 3.11+ is required but not found${NC}"
        exit 1
    fi

    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
    else
        echo -e "${RED}✗ Node.js 18+ is required but not found${NC}"
        exit 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"
    else
        echo -e "${RED}✗ npm is required but not found${NC}"
        exit 1
    fi
}

# Setup backend
setup_backend() {
    echo -e "\n${YELLOW}Setting up backend...${NC}"

    cd backend

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Activate virtual environment
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi

    # Install dependencies
    echo "Installing Python dependencies..."
    pip install -r requirements.txt --quiet

    # Run database migrations
    if [ -f "alembic.ini" ]; then
        echo "Running database migrations..."
        alembic upgrade head
    fi

    # Create .env if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "Creating .env file from template..."
        cp .env.example .env 2>/dev/null || cat > .env << EOF
# SmartSense Backend Configuration
DATABASE_URL=sqlite:///./smartsense.db
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173
EOF
    fi

    cd ..
    echo -e "${GREEN}✓ Backend setup complete${NC}"
}

# Setup frontend
setup_frontend() {
    echo -e "\n${YELLOW}Setting up frontend...${NC}"

    cd frontend

    # Install dependencies
    echo "Installing Node.js dependencies..."
    npm install --silent

    # Create .env if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "Creating .env file..."
        cat > .env << EOF
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
EOF
    fi

    cd ..
    echo -e "${GREEN}✓ Frontend setup complete${NC}"
}

# Seed database with demo data
seed_database() {
    echo -e "\n${YELLOW}Seeding database with demo data...${NC}"

    cd backend

    # Activate virtual environment
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi

    # Run seed script if it exists
    if [ -f "seed.py" ]; then
        python seed.py
        echo -e "${GREEN}✓ Database seeded${NC}"
    else
        echo -e "${YELLOW}⚠ No seed script found, skipping${NC}"
    fi

    cd ..
}

# Start development servers
start_servers() {
    echo -e "\n${YELLOW}Starting development servers...${NC}"

    # Start backend in background
    cd backend
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi

    echo "Starting backend server on http://localhost:8000..."
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..

    # Give backend time to start
    sleep 2

    # Start frontend
    cd frontend
    echo "Starting frontend server on http://localhost:5173..."
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo -e "\n${GREEN}=============================================="
    echo "SmartSense is running!"
    echo "=============================================="
    echo -e "Frontend: ${YELLOW}http://localhost:5173${NC}"
    echo -e "Backend API: ${YELLOW}http://localhost:8000${NC}"
    echo -e "API Docs: ${YELLOW}http://localhost:8000/docs${NC}"
    echo ""
    echo "Demo credentials:"
    echo "  Admin: admin@smartsense.demo / Admin123!"
    echo "  Facility Manager: fm@smartsense.demo / Manager123!"
    echo "  Technician: tech@smartsense.demo / Tech123!"
    echo "  Executive: exec@smartsense.demo / Exec123!"
    echo ""
    echo -e "Press Ctrl+C to stop all servers${NC}"

    # Wait for Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
    wait
}

# Main execution
main() {
    check_requirements

    # Parse arguments
    case "${1:-all}" in
        "setup")
            setup_backend
            setup_frontend
            ;;
        "backend")
            setup_backend
            cd backend
            if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
                source venv/Scripts/activate
            else
                source venv/bin/activate
            fi
            uvicorn main:app --reload --host 0.0.0.0 --port 8000
            ;;
        "frontend")
            cd frontend
            npm run dev
            ;;
        "seed")
            seed_database
            ;;
        "all"|"")
            setup_backend
            setup_frontend
            seed_database
            start_servers
            ;;
        *)
            echo "Usage: ./init.sh [command]"
            echo ""
            echo "Commands:"
            echo "  all       Setup and start everything (default)"
            echo "  setup     Install dependencies only"
            echo "  backend   Start backend server only"
            echo "  frontend  Start frontend server only"
            echo "  seed      Seed database with demo data"
            exit 1
            ;;
    esac
}

main "$@"
