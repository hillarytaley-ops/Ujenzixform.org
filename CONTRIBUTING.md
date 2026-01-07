# Contributing to UjenziPro / MradiPro

Thank you for your interest in contributing to UjenziPro! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Component Guidelines](#component-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a positive community

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Tailwind CSS IntelliSense

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd UjenziPro

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔄 Development Workflow

### Branch Naming

```
feature/   - New features (feature/add-payment-gateway)
fix/       - Bug fixes (fix/login-redirect-issue)
refactor/  - Code refactoring (refactor/auth-module)
docs/      - Documentation (docs/update-readme)
test/      - Testing (test/add-unit-tests)
```

### Commit Messages

Follow conventional commits:

```
feat: add new supplier dashboard
fix: resolve login redirect issue
docs: update API documentation
test: add unit tests for auth module
refactor: simplify error handling
style: format code with prettier
chore: update dependencies
```

## 📝 Code Style Guide

### TypeScript

```typescript
// ✅ Good - Use explicit types
interface UserProps {
  id: string;
  email: string;
  role: 'builder' | 'supplier' | 'delivery' | 'admin';
}

// ✅ Good - Use const for immutable values
const MAX_RETRIES = 3;

// ✅ Good - Destructure props
const UserCard = ({ id, email, role }: UserProps) => {
  // ...
};

// ❌ Avoid - any type
const data: any = fetchData();

// ❌ Avoid - Magic numbers
if (attempts > 3) { }
```

### React Components

```tsx
// ✅ Good - Functional components with TypeScript
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};
```

### File Organization

```
src/
├── components/
│   ├── ui/              # Reusable UI components (Button, Input, Card)
│   ├── common/          # Shared components (ProfilePicture, LoadingSpinner)
│   ├── builders/        # Builder-specific components
│   ├── suppliers/       # Supplier-specific components
│   ├── delivery/        # Delivery-specific components
│   ├── admin/           # Admin-specific components
│   ├── error/           # Error boundary components
│   └── [feature]/       # Feature-specific components
├── pages/               # Route page components
├── hooks/               # Custom React hooks
├── contexts/            # React contexts
├── utils/               # Utility functions
├── services/            # API and business logic
├── types/               # TypeScript type definitions
└── test/                # Test utilities and setup
```

## 🧩 Component Guidelines

### Creating New Components

1. **Single Responsibility**: Each component should do one thing well
2. **Props Interface**: Always define TypeScript interfaces for props
3. **Default Props**: Provide sensible defaults
4. **Error Handling**: Use error boundaries for fallback UI

```tsx
// Example: Well-structured component
import React from 'react';
import { ErrorBoundary } from '@/components/error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onAction?: () => void;
}

/**
 * FeatureCard - Displays a feature with title, description, and optional icon
 * 
 * @example
 * <FeatureCard
 *   title="Quick Orders"
 *   description="Place orders in seconds"
 *   icon={<ShoppingCart />}
 * />
 */
export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  onAction,
}) => {
  return (
    <ErrorBoundary>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          {icon && <div className="mb-2">{icon}</div>}
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default FeatureCard;
```

### Using shadcn/ui Components

We use [shadcn/ui](https://ui.shadcn.com/) for UI components. Always import from `@/components/ui/`:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

## 🧪 Testing Guidelines

### Test File Location

Place test files next to the component they test:

```
src/components/ui/
├── button.tsx
├── button.test.tsx    # ✅ Test file next to component
├── input.tsx
└── input.test.tsx
```

### Writing Tests

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { Button } from './button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- button.test.tsx
```

## 🔀 Pull Request Process

### Before Submitting

1. **Run tests**: `npm run test:run`
2. **Run linting**: `npm run lint`
3. **Build check**: `npm run build`
4. **Update documentation** if needed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
```

### Review Process

1. Create PR with descriptive title
2. Fill out PR template
3. Request review from team members
4. Address feedback
5. Merge after approval

## 🔐 Security Guidelines

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Follow the principle of least privilege
- Report security issues privately

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vitest](https://vitest.dev/)
- [Supabase](https://supabase.com/docs)

---

Thank you for contributing to UjenziPro! 🏗️





