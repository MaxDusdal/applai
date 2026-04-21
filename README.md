# Applai

An agentic job application assistant that makes application tracking and document creation faster through a learning AI agent — usable both inside the app and externally via MCP.

## What it does

- **Application tracking** — manage your job applications across all stages
- **Document creation** — generate and edit CVs and cover letters using [Typst](https://typst.app/) templates
- **AI agent** — a context-aware agent that learns your profile, writing style, and preferences over time
- **MCP server** — expose the agent as an MCP tool so it can be used from Claude, Cursor, or any MCP-compatible client outside the app

## Tech stack

- [Next.js 15](https://nextjs.org) — app framework
- [tRPC](https://trpc.io) — end-to-end typesafe API
- [Prisma](https://prisma.io) — database ORM
- [better-auth](https://better-auth.com) — authentication
- [Vercel AI SDK](https://sdk.vercel.ai) — AI integration
- [Model Context Protocol](https://modelcontextprotocol.io) — external agent access
- [Typst](https://typst.app) — document compilation

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- Anthropic API key

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Fill in your .env, then run migrations
pnpm db:generate

# Start the dev server
pnpm dev
```

### MCP usage

Applai exposes an MCP server at `/api/mcp`. You can connect any MCP-compatible client to it and interact with your applications, profile, and documents directly from your editor or AI assistant.

## Status

Early-stage prototype — core features are working, rough edges remain.
