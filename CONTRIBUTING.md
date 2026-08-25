# Contributing to KANBN

Thank you for helping improve KANBN. Bug reports, focused feature proposals, documentation improvements, and pull requests are welcome.

## Development setup

KANBN requires Node.js 22, npm, Docker with Docker Compose, and PostgreSQL 15 or newer. Start with the development instructions in [README.md](README.md#development-setup).

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Database integration tests truncate their target database. Run them only against a dedicated test database:

```bash
docker compose exec postgres createdb -U kanbn kanbn_test
RUN_DB_TESTS=1 POSTGRES_DB=kanbn_test npm test -- tests/kanban.integration.test.ts
```

Keep changes focused, include tests for behavior changes, and update the README when configuration or operator workflows change.

## Pull requests

1. Create a branch from `main`.
2. Make the smallest coherent change.
3. Add or update tests and documentation.
4. Confirm the full local check suite passes.
5. Open a pull request explaining the problem, the solution, and any operational impact.

By contributing, you agree that your contribution is licensed under the MIT License.
