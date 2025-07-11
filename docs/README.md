# Pickleball Tracker Documentation

Welcome to the Pickleball Tracker documentation. This guide provides comprehensive information about the architecture, development, deployment, and maintenance of the application.

## Documentation Overview

### Getting Started

- **[Architecture Overview](./architecture.md)** - Understand the system design, component structure, and data flow
- **[Development Guide](./development-guide.md)** - Set up your development environment and learn coding standards

### Core Documentation

- **[API Reference](./api-reference.md)** - Database schema, API endpoints, and real-time subscriptions
- **[Testing Guide](./testing-guide.md)** - Testing strategies, running tests, and writing new test cases

### Operations

- **[Deployment Guide](./deployment-guide.md)** - Deploy to production with GitHub Pages and Supabase
- **[Troubleshooting](./troubleshooting.md)** - Solutions to common issues and debugging tips

## Quick Links

### For Developers

1. **First Time Setup**: Start with the [Development Guide](./development-guide.md) to set up your local environment
2. **Understanding the Codebase**: Read the [Architecture Overview](./architecture.md) to understand how components interact
3. **Making Changes**: Review the coding standards in the [Development Guide](./development-guide.md#coding-standards)
4. **Testing Your Code**: Follow the [Testing Guide](./testing-guide.md) to ensure quality

### For Operators

1. **Deployment**: Follow the [Deployment Guide](./deployment-guide.md) for production setup
2. **Monitoring**: Check the deployment guide's [monitoring section](./deployment-guide.md#monitoring)
3. **Troubleshooting**: Reference the [Troubleshooting Guide](./troubleshooting.md) for common issues

### For Contributors

1. **Understanding the Project**: Start with the main [README](../README.md) and [Architecture Overview](./architecture.md)
2. **Development Setup**: Follow the [Development Guide](./development-guide.md)
3. **Code Standards**: Review our coding conventions and best practices
4. **Testing Requirements**: Understand our testing requirements in the [Testing Guide](./testing-guide.md)

## Documentation Structure

```
docs/
├── README.md               # This file - documentation index
├── architecture.md         # System design and architecture
├── development-guide.md    # Developer setup and guidelines
├── api-reference.md        # API and database documentation
├── deployment-guide.md     # Production deployment instructions
├── testing-guide.md        # Testing strategies and guides
└── troubleshooting.md      # Common issues and solutions
```

## Key Technologies

The documentation covers these core technologies:

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: Zustand, React Context
- **Testing**: Vitest, React Testing Library
- **Deployment**: GitHub Pages, GitHub Actions

## Contributing to Documentation

When updating documentation:

1. Keep content concise and focused
2. Use clear headings and structure
3. Include code examples where helpful
4. Update the table of contents when adding sections
5. Test all code examples and commands
6. Link to related documentation sections

## Need Help?

- Check the [Troubleshooting Guide](./troubleshooting.md) for common issues
- Review existing [GitHub Issues](https://github.com/routaran/routaran.github.io/issues)
- Consult the [Support Guide](./support-guide.md) for additional resources