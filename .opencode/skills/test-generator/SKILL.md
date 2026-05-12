---
name: test-generator
description: Generates comprehensive tests (unit, integration, e2e) based on implementation code and requirements.
---
## Test Generator Skill

Automatically generate tests for implemented code following project testing standards.

### When to Use
- After implementing any new feature
- After fixing a bug (regression test)
- When executor completes a task
- When coverage is below threshold
- **TDD-First (executor-tdd):** When writing tests BEFORE implementation — tests must be designed to FAIL initially (red phase). Use mocks/stubs/interfaces for dependencies that don't exist yet.

### Prerequisites
**CRITICAL**: Read `PROJECT_CONTEXT.md` to understand:
- Testing frameworks in use (Jest, Pytest, Playwright, etc.)
- Coverage requirements
- Mock/stub strategies
- Test file naming conventions

### Test Types

#### Unit Tests
- Test individual functions/methods in isolation
- Mock all external dependencies
- Focus on edge cases and boundary conditions
- One test file per source file

#### Integration Tests
- Test component/module interactions
- Use real implementations where practical
- Test API endpoints with database
- Test component compositions

#### E2E Tests (Playwright/Cypress)
- Test critical user flows
- Happy path scenarios
- Error state handling
- Authentication flows

### Step 1: Analyze Implementation
```bash
# Get recently changed files
git diff --name-only HEAD~1

# Or for feature branch
git diff --name-only main...HEAD
```

Read each changed file to understand:
- Public APIs / exported functions
- Input types and edge cases
- Error conditions
- Dependencies to mock

### Step 2: Generate Test Plan
Create a mental model:
```
Function/Component: <name>
Inputs: <parameter types>
Outputs: <return types>
Side Effects: <external calls, state changes>
Edge Cases:
- Empty input
- Invalid input
- Boundary values
- Error conditions
```

### Step 3: Write Tests

#### Unit Test Template (JavaScript/TypeScript)
```typescript
import { describe, it, expect, vi } from 'vitest'; // or jest
import { functionName } from './module';

describe('functionName', () => {
  describe('happy path', () => {
    it('should return expected result for valid input', () => {
      const result = functionName(validInput);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      expect(() => functionName('')).toThrow();
    });

    it('should handle null input', () => {
      expect(functionName(null)).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw on invalid input', () => {
      expect(() => functionName(invalidInput)).toThrow(ExpectedError);
    });
  });
});
```

#### Unit Test Template (Python)
```python
import pytest
from module import function_name

class TestFunctionName:
    def test_happy_path(self):
        result = function_name(valid_input)
        assert result == expected_output

    def test_empty_input(self):
        with pytest.raises(ValueError):
            function_name('')

    def test_edge_case(self):
        result = function_name(boundary_value)
        assert result == expected_boundary_output
```

#### E2E Test Template (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('user can complete flow', async ({ page }) => {
    await page.goto('/feature-page');

    // Arrange
    await page.fill('[data-testid="input"]', 'value');

    // Act
    await page.click('[data-testid="submit"]');

    // Assert
    await expect(page.locator('[data-testid="result"]'))
      .toHaveText('expected result');
  });

  test('handles error state', async ({ page }) => {
    // Test error scenario
  });
});
```

### Step 4: Verify Coverage
After generating tests:
```bash
# JavaScript/TypeScript
npm run test:coverage

# Python
pytest --cov=src --cov-report=html
```

Target: >= 80% coverage for new code

### Step 5: Document Tests
Add to spec file:
```markdown
## Tests Generated

### Unit Tests
- `src/__tests__/module.test.ts` - 5 tests
- `src/__tests__/utils.test.ts` - 3 tests

### Integration Tests
- `src/__tests__/integration/api.test.ts` - 2 tests

### E2E Tests
- `e2e/feature.spec.ts` - 2 tests

**Coverage:** 85% for new code
```

### Test Naming Conventions
- Unit tests: `<filename>.test.ts` or `test_<filename>.py`
- Integration: `<feature>.integration.test.ts`
- E2E: `<feature>.spec.ts` or `<feature>.e2e.ts`

### Output Format
```
## Tests Generated for Issue #<num>

**Files created:**
- src/__tests__/newFeature.test.ts (8 tests)
- e2e/newFeature.spec.ts (3 tests)

**Coverage:** New code coverage at 87%

**Test summary:**
- Unit: 8 tests
- Integration: 0 tests
- E2E: 3 tests
- Total: 11 tests

Ready for: @tester to execute
```

### Guidelines
- One assertion per test when practical
- Use descriptive test names (should_do_X_when_Y)
- Mock external services (APIs, databases in unit tests)
- Include both positive and negative test cases
- Test the public API, not internal implementation

### TDD-First Mode (for executor-tdd)
- Write tests BEFORE any implementation exists
- Tests MUST fail initially (red phase) — validates the test is meaningful
- Use mocks/stubs/interfaces for dependencies that haven't been built yet
- Import from future source paths (e.g., `import { newFunction } from '../src/newModule'`)
- Tests serve as the executable specification for executor to implement against
- Stack-agnostic: always read PROJECT_CONTEXT.md for the correct test framework
