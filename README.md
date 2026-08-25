# KANBN

KANBN is an MIT-licensed, focused, self-hosted Kanban application for a trusted single-instance environment. It opens directly on the last used board and deliberately has no login, users, workspaces, members, roles, invitations, billing, or multi-tenant layer.

## Screenshots

![KANBN board with freely named sidebar sections](docs/images/kanbn-sections.png)

## Features

- Board, list, and card CRUD with soft deletion
- Freely named board sections with reversible board assignment, selectable Lucide icons, and persistent ordering in Settings
- Optimistic drag-and-drop for lists, cards, and checklist items
- Three-line card previews, aligned labels and due dates, and expandable inline checklists
- Optional label-backed card colors with an automatic board-header legend
- Section-wide reusable labels, due dates, multiple checklists, comments, and scrollable activity
- Autosaving card details and settings, with fully application-styled edit/confirmation dialogs
- Local board templates
- Built-in default board with `IN PROGRESS`, `TODO`, `BACKLOG`, and `DONE`
- Card search and label, due-date, overdue, and checklist filters
- Light, dark, and system themes
- JSON export and validated full-instance import
- Public IDs in routes; internal database IDs never appear in URLs
- PostgreSQL persistence with code-first Drizzle migrations

## Requirements

For Docker operation, only Docker Engine with Docker Compose is required. Local development requires Node.js 22, npm, and PostgreSQL 15 or newer.

## Docker setup

```bash
git clone https://github.com/HeiselAnalytics/KANBN.git
cd KANBN
cp .env.example .env
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). The `kanbn` container waits for PostgreSQL, applies pending migrations, and then starts the application. Both services include healthchecks. PostgreSQL data is retained in the `kanbn_postgres_data` volume.

Change `POSTGRES_PASSWORD` in `.env` before exposing an installation. KANBN itself intentionally provides no access control; use a reverse proxy, Cloudflare Access, or a trusted internal network when protection is needed.

## Custom branding

The publisher logo in the bottom-left sidebar can be replaced without changing application code. KANBN supports separate logo variants for Light and Dark Mode.

1. Put your logo files in `public/branding/`. PNG, WebP, and SVG files are suitable. The directory is mounted into the Docker container and its custom contents are ignored by Git.
2. Configure the branding in `.env`:

```env
KANBN_BRAND_NAME=Example Company
KANBN_BRAND_LOGO_LIGHT=/branding/logo-on-light.png
KANBN_BRAND_LOGO_DARK=/branding/logo-on-dark.png
```

3. Recreate the application container so it receives the updated environment:

```bash
docker compose up -d
```

Use a dark-text logo for light surfaces and a light-text logo for dark surfaces. Logos retain their aspect ratio and fit within the existing `156 × 28px` brand area. Absolute `https://` image URLs are supported as an alternative to local files. Removing the three variables restores the bundled Heisel Analytics branding.

## Development setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:migrate
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Database integration tests are opt-in so the default unit suite does not mutate a developer database:

```bash
docker compose exec postgres createdb -U kanbn kanbn_test
RUN_DB_TESTS=1 DATABASE_URL=postgresql://kanbn:change-me@localhost:5432/kanbn_test npm test
```

## Environment variables

| Variable | Purpose | Default in Compose |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL used by Next.js and Drizzle | Built from the PostgreSQL variables |
| `POSTGRES_DB` | Database name | `kanbn` |
| `POSTGRES_USER` | Database user | `kanbn` |
| `POSTGRES_PASSWORD` | Database password | `change-me` |
| `POSTGRES_PORT` | PostgreSQL port published on localhost for development | `5432` |
| `KANBN_PORT` | Published HTTP port | `3000` |
| `NEXT_PUBLIC_APP_URL` | Canonical local URL for tooling | `http://localhost:3000` |
| `KANBN_BRAND_NAME` | Accessible name of the publisher logo | `Heisel Analytics` |
| `KANBN_BRAND_LOGO_LIGHT` | Logo URL for Light Mode | Bundled dark Heisel Analytics logo |
| `KANBN_BRAND_LOGO_DARK` | Logo URL for Dark Mode | Bundled light Heisel Analytics logo |

## Database migrations

The TypeScript schema in `lib/db/schema.ts` is the source of truth. Generate and review a migration after a schema change:

```bash
npm run db:generate
npm run db:migrate
```

Production containers execute `npm run db:migrate` before every application start. Drizzle records applied migrations in PostgreSQL, so already-applied migrations are skipped.

## Backup and recovery

The Settings page can export and import a complete JSON backup. For an infrastructure-level PostgreSQL backup:

```bash
docker compose exec -T postgres pg_dump -U kanbn -d kanbn -Fc > kanbn.backup
```

Restore into an empty maintenance database or after deliberately replacing the current database:

```bash
docker compose exec -T postgres pg_restore -U kanbn -d kanbn --clean --if-exists < kanbn.backup
```

An application-level import replaces all existing KANBN data and therefore requires explicit confirmation in the UI.

## Updating

Back up the database first, then pull the new source and rebuild:

```bash
docker compose pull postgres
docker compose up -d --build
```

Pending migrations run automatically before the updated application starts. Check status with `docker compose ps` and inspect application logs with `docker compose logs kanbn`.

## Architecture

```text
Browser
  └── Next.js App Router
        ├── React client UI + dnd-kit optimistic state
        ├── Zod-validated Server Actions / route handlers
        └── Service layer
              └── Drizzle ORM
                    └── PostgreSQL volume
```

Board sections are optional organizational groups; deleting a section keeps its boards and moves them back to “Without section.” Lists belong directly to boards; cards belong directly to lists; board labels connect to cards through `card_labels`. There are no user, session, membership, permission, or workspace tables. Fractional numeric ranks allow a move to update only the moved section, list, card, or checklist item. Normal reads exclude soft-deleted boards, lists, and cards.

The main routes are `/`, `/b/:publicId`, `/templates`, and `/settings`. `/` resolves the configured default board first, then the most recently opened board. `/api/health`, `/api/export`, and `/api/import` provide operational health and data portability.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and [SECURITY.md](SECURITY.md) for responsible vulnerability reporting.

## License

KANBN source code is available under the [MIT License](LICENSE). The bundled Heisel Analytics names and logo assets remain subject to the separate [trademark notice](TRADEMARKS.md); custom branding is supported for forks and redistributed installations.
