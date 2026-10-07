# Contributing to Najimu

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/najimu.git`
3. Install dependencies: `pnpm install`
4. Start developing:
   - Desktop app: `cd apps/desktop && pnpm dev`
   - Landing page: `cd apps/landing && pnpm dev`

## Project Structure

```
najimu/
├── apps/
│   ├── desktop/          # Electron app (port 1420)
│   │   ├── electron/     # Main process
│   │   ├── src/         # React frontend
│   │   └── tests/       # Unit tests
│   └── landing/         # Marketing site (port 1421)
├── packages/
│   ├── core/            # Business logic
│   └── ui/              # Shared components
└── docs/                # Documentation
```

## Development Workflow

### Desktop App

```bash
cd apps/desktop
pnpm dev          # Start in development mode
pnpm build        # Production build
pnpm test         # Run tests
```

### Landing Page

```bash
cd apps/landing
pnpm dev          # Start dev server
pnpm build        # Production build
```

### Running Tests

```bash
# All tests
pnpm test

# Desktop tests only
cd apps/desktop && pnpm test
```

## Code Style

- TypeScript strict mode
- Use Biome for formatting and linting
- Follow existing patterns in the codebase

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Commit with a clear message
5. Push and open a Pull Request

## Reporting Issues

Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your OS and version

## Documentation

This project includes the following documentation:

- [LICENSE.md](../LICENSE.md) - Usage terms
- [PRIVACY.md](./PRIVACY.md) - Privacy policy
- [SUPPORT.md](./SUPPORT.md) - Getting help
- [SECURITY.md](./SECURITY.md) - Security policy

## Questions?

Open an issue or start a discussion on GitHub.

## License

By contributing, you agree that your contributions will be licensed under the same license as this project. See [LICENSE.md](./LICENSE.md) for details.
