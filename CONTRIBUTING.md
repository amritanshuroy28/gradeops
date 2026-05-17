# Contributing to GRADEOPS

## Code Style

### Python (Backend)
- Use type hints on all functions
- Follow PEP 8 style guide
- Maximum line length: 100 characters
- Use meaningful variable names
- Document complex logic with comments

Example:
```python
def process_grades(answers: List[models.Answer], threshold: float) -> Dict[str, Any]:
    """Process and filter grades above threshold."""
    return {answer.id: answer.ai_score for answer in answers if answer.ai_score >= threshold}
```

### TypeScript/React (Frontend)
- Use functional components with hooks
- Add JSDoc comments for exports
- Component names must match filename
- Props should be typed with interfaces

Example:
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function Button({ label, onClick, disabled }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}
```

## Testing

### Backend Tests
```bash
cd backend
pytest test_api.py -v
```

Write tests for:
- New API endpoints
- Critical business logic
- Database operations
- Error handling

### Frontend Tests (Future)
```bash
cd frontend
npm test
```

## Git Workflow

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push branch: `git push origin feature/description`
4. Create pull request with detailed description
5. Address review comments
6. Merge after approval

### Commit Message Format
```
<type>: <subject>

<body>
<footer>
```

Types: feat, fix, docs, style, refactor, test, chore

## Adding Features

### Backend Feature
1. Update database model in `models.py`
2. Create Pydantic schema in `schemas.py`
3. Add router functions in appropriate file
4. Update tests
5. Document in API.md

### Frontend Component
1. Create component in `src/components/`
2. Add TypeScript interfaces for props
3. Import and use in parent component
4. Add styling with Tailwind classes

## Common Tasks

### Adding New API Endpoint
```python
# In routers/your_router.py
from fastapi import APIRouter, Depends
from logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/yourprefix", tags=["yourtag"])

@router.get("/yourpath")
def your_endpoint(param: str, db: Session = Depends(database.get_db)):
    logger.info(f"Processing {param}")
    # Your logic here
    return result
```

### Adding Database Model
```python
# In models.py
class YourModel(Base):
    __tablename__ = "your_table"
    
    id = Column(Integer, primary_key=True, index=True)
    field1 = Column(String)
    field2 = Column(Float)
    
    # Relationships
    other = relationship("OtherModel", back_populates="your_models")
```

### Adding Frontend Component
```typescript
// In src/components/YourComponent.tsx
interface Props {
  title: string;
  onAction: (data: any) => void;
}

export default function YourComponent({ title, onAction }: Props) {
  const [state, setState] = useState('');
  
  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-xl font-bold">{title}</h2>
      {/* Component content */}
    </div>
  );
}
```

## Documentation

When adding features, update:
- Code docstrings
- API.md (new endpoints)
- README.md (if major feature)
- DEPLOYMENT.md (if deployment changes)

## Performance Tips

- Use database query optimization (indexes, joins)
- Implement caching where appropriate
- Lazy-load components in React
- Use async/await properly
- Profile code before optimizing

## Debugging

### Backend
```python
# Use logger instead of print
logger.debug("Debug message")
logger.info("Info message")
logger.error("Error message", exc_info=True)
```

### Frontend
```typescript
// Browser DevTools console
console.log('Debug:', variable);
// Use React DevTools extension for component inspection
```

## Pull Request Checklist

- [ ] Code follows style guide
- [ ] Tests pass and added for new code
- [ ] No console errors/warnings
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No hardcoded values
- [ ] Error handling implemented

## Questions?

- Check existing issues and PRs
- Review API.md and README.md
- Check test files for examples
- Ask in pull request comments

