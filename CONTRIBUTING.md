# Contributing to DEMO_ENERSENSE

Thank you for considering contributing to DEMO_ENERSENSE! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

---

## Code of Conduct

This project and everyone participating in it is governed by our commitment to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs. **actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Python/Node version, etc.)

**Bug Report Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Python Version: [e.g. 3.11]
 - Node Version: [e.g. 18.0]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide detailed description of the proposed functionality
- Explain why this enhancement would be useful
- Include mockups or examples if applicable

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** from `main`
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git

### Setup Instructions

1. **Clone your fork:**
```bash
git clone https://github.com/YOUR_USERNAME/DEMO_ENERSENSE.git
cd DEMO_ENERSENSE
```

2. **Add upstream remote:**
```bash
git remote add upstream https://github.com/csg09/DEMO_ENERSENSE.git
```

3. **Backend setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Dev dependencies
cp .env.example .env
python init_db.py
```

4. **Frontend setup:**
```bash
cd frontend
npm install
cp .env.example .env
```

5. **Run tests to verify setup:**
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

---

## Coding Standards

### Python (Backend)

We follow PEP 8 with some modifications:

```python
# Good practices
class AssetService:
    """Service for managing assets."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_asset(self, asset_id: int) -> Asset:
        """Retrieve asset by ID.
        
        Args:
            asset_id: The asset identifier
            
        Returns:
            Asset object if found
            
        Raises:
            NotFoundError: If asset doesn't exist
        """
        result = await self.db.execute(
            select(Asset).where(Asset.id == asset_id)
        )
        asset = result.scalar_one_or_none()
        if not asset:
            raise NotFoundError(f"Asset {asset_id} not found")
        return asset
```

**Key Points:**
- Use type hints
- Write docstrings for classes and functions
- Use async/await for database operations
- Keep functions focused and small
- Handle errors appropriately

**Code Style Tools:**
```bash
# Format code
black backend/

# Check style
ruff check backend/

# Type checking
mypy backend/
```

### TypeScript/React (Frontend)

```typescript
// Good practices
interface AssetCardProps {
  asset: Asset;
  onSelect?: (asset: Asset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect?.(asset);
  }, [asset, onSelect]);

  return (
    <div 
      className="p-4 border rounded hover:shadow-lg cursor-pointer"
      onClick={handleClick}
    >
      <h3 className="font-bold">{asset.name}</h3>
      <p className="text-sm text-gray-600">{asset.type}</p>
    </div>
  );
};
```

**Key Points:**
- Use functional components with hooks
- Define proper TypeScript interfaces
- Use meaningful variable names
- Extract reusable logic into hooks
- Keep components small and focused

**Code Style Tools:**
```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

### API Design

Follow RESTful conventions:

```python
# Good
@router.get("/assets/{asset_id}")
async def get_asset(asset_id: int):
    """Get a specific asset."""
    pass

@router.post("/assets")
async def create_asset(asset: AssetCreate):
    """Create a new asset."""
    pass

# Bad
@router.get("/getAsset")  # Should use resource-based URL
@router.post("/createNewAsset")  # Should be POST /assets
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```bash
feat(auth): add JWT refresh token functionality

Implement refresh token endpoint to allow users to get new
access tokens without re-authenticating.

Closes #123
```

```bash
fix(assets): correct health score calculation

The health score was incorrectly averaging null values.
Changed to filter out null values before calculation.

Fixes #456
```

```bash
docs(api): update authentication examples

Added examples for refresh token usage and error handling.
```

### Commit Message Guidelines

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues and PRs in footer

---

## Pull Request Process

### Before Submitting

1. **Update your fork:**
```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **Create feature branch:**
```bash
git checkout -b feature/your-feature-name
```

3. **Make changes and commit:**
```bash
git add .
git commit -m "feat(scope): description"
```

4. **Run all tests:**
```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

5. **Run linters:**
```bash
# Backend
black backend/ && ruff check backend/

# Frontend
cd frontend && npm run lint
```

6. **Update documentation** if needed

7. **Push to your fork:**
```bash
git push origin feature/your-feature-name
```

### Creating the Pull Request

1. Go to the original repository
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill in the PR template:

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe the tests you ran.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All tests pass locally
```

### PR Review Process

1. **Automated checks** must pass:
   - Tests
   - Linting
   - Type checking

2. **Code review** by maintainer(s)

3. **Address feedback** if any:
```bash
# Make changes
git add .
git commit -m "fix: address review comments"
git push origin feature/your-feature-name
```

4. **Approval and merge** by maintainer

---

## Testing Guidelines

### Backend Testing

```python
# tests/test_asset_service.py
import pytest
from services.asset_service import AssetService

@pytest.mark.asyncio
async def test_get_asset(db_session, sample_asset):
    """Test retrieving an asset."""
    service = AssetService(db_session)
    
    asset = await service.get_asset(sample_asset.id)
    
    assert asset.id == sample_asset.id
    assert asset.name == sample_asset.name

@pytest.mark.asyncio
async def test_get_nonexistent_asset(db_session):
    """Test retrieving non-existent asset raises error."""
    service = AssetService(db_session)
    
    with pytest.raises(NotFoundError):
        await service.get_asset(999)
```

**Testing Best Practices:**
- Write descriptive test names
- One assertion per test (when possible)
- Use fixtures for setup
- Test both success and failure cases
- Aim for 80%+ coverage

### Frontend Testing

```typescript
// tests/components/AssetCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetCard } from '../AssetCard';

describe('AssetCard', () => {
  const mockAsset = {
    id: 1,
    name: 'Test Asset',
    type: 'HVAC',
    status: 'active'
  };

  it('renders asset information', () => {
    render(<AssetCard asset={mockAsset} />);
    
    expect(screen.getByText('Test Asset')).toBeInTheDocument();
    expect(screen.getByText('HVAC')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<AssetCard asset={mockAsset} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Test Asset'));
    
    expect(onSelect).toHaveBeenCalledWith(mockAsset);
  });
});
```

### Running Tests

```bash
# Backend - all tests
cd backend && pytest

# Backend - specific test
pytest tests/test_asset_service.py

# Backend - with coverage
pytest --cov=app --cov-report=html

# Frontend - all tests
cd frontend && npm test

# Frontend - specific test
npm test -- AssetCard.test.tsx

# Frontend - with coverage
npm test -- --coverage
```

---

## Documentation

When adding features:

1. **Update README.md** if needed
2. **Update API.md** for new endpoints
3. **Add inline comments** for complex logic
4. **Update relevant guides** in `docs/`
5. **Add JSDoc/docstrings** to new functions

Example docstring:
```python
async def calculate_health_score(asset_id: int) -> float:
    """Calculate health score for an asset.
    
    The health score is calculated based on:
    - Recent maintenance history
    - Alert frequency
    - Age of the asset
    - Performance metrics
    
    Args:
        asset_id: The ID of the asset to calculate score for
        
    Returns:
        float: Health score between 0 and 100
        
    Raises:
        NotFoundError: If asset doesn't exist
        
    Example:
        >>> score = await calculate_health_score(123)
        >>> print(f"Health: {score}%")
        Health: 87.5%
    """
    pass
```

---

## Areas Needing Contributions

We especially welcome contributions in these areas:

### High Priority
- [ ] Mobile app development (React Native)
- [ ] Additional test coverage
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Features
- [ ] Email notifications for alerts
- [ ] SMS notifications
- [ ] Advanced reporting features
- [ ] Data export (CSV, Excel, PDF)
- [ ] Scheduled reports
- [ ] Multi-language support

### Integrations
- [ ] BMS system integrations
- [ ] IoT sensor integrations
- [ ] Third-party CMMS integration
- [ ] Calendar integration (Google, Outlook)

### Documentation
- [ ] Video tutorials
- [ ] Architecture diagrams
- [ ] API client examples
- [ ] Deployment examples for various platforms

---

## Questions?

- **GitHub Issues**: https://github.com/csg09/DEMO_ENERSENSE/issues
- **Discussions**: https://github.com/csg09/DEMO_ENERSENSE/discussions
- **Email**: your.email@example.com

---

Thank you for contributing to DEMO_ENERSENSE! 🎉
