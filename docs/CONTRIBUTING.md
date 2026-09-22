# Contributing to DigiPaga Marketplace

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/digi-robotics.git`
3. Add upstream remote: `git remote add upstream https://github.com/DigiPaga/digi-robotics.git`
4. Create a branch: `git checkout -b feat/your-feature-name`

## Development

### Prerequisites
- Node.js v20+
- Foundry (for smart contracts)
- Git

### Setup

```bash
# Install dependencies
cd x402-server && npm install
cd ../contracts && forge install
cd ../web && npm install
```

### Running Locally

```bash
# Terminal 1: x402 Server
cd x402-server
npm run dev

# Terminal 2: Frontend
cd web
npm run dev

# Terminal 3: Smart Contracts (optional)
cd contracts
forge build
```

## Code Style

### TypeScript
- Use strict mode
- Follow ESLint rules
- Add type annotations
- Use async/await for async operations

### Solidity
- Follow Solidity style guide
- Use NatSpec comments
- Add comprehensive tests
- Run slither for static analysis

### Commits
- Use conventional commits
- One commit per logical change
- Write clear commit messages

## Testing

```bash
# Run tests
cd x402-server
npm test

# With coverage
npm run test:coverage

# Smart contracts
cd contracts
forge test
```

## Pull Request Process

1. Update documentation as needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers
6. Address review comments
7. Squash commits if necessary

## Code Review Guidelines

- Be respectful and constructive
- Focus on the code, not the person
- Explain reasoning behind suggestions
- Approve when ready, request changes if needed

## Reporting Issues

- Use GitHub Issues
- Provide clear description
- Include steps to reproduce
- Add expected vs actual behavior
- Include screenshots if applicable

## Questions?

Join our Discord: [link]
Email: dev@digipaga.com
