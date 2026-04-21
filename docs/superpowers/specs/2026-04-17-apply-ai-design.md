# Apply AI — Design Specification

## Overview

A Next.js web application for managing job applications with AI-assisted document generation. Users track applications through a pipeline, maintain a candidate profile as free-form markdown sections, and generate tailored CVs and cover letters by having AI directly author and edit Typst source files.

Deployed to Vercel. Multi-tenant from day one via Better Auth. All data scoped by authenticated user.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Deployment | Vercel |
| Database | Neon (managed PostgreSQL) |
| ORM | Prisma |
| API | tRPC (router/service architecture) |
| Auth | Better Auth (email + password) |
| AI | Vercel AI SDK + Claude |
| Document Engine | Typst (WASM — server-side only for MVP) |
| UI | shadcn/ui + Tailwind CSS |

## Architecture

### Request Flow

```
Client (React) → tRPC React hooks → tRPC Router → Service → Prisma → Neon PostgreSQL
```

### tRPC Router / Service Separation

**Routers** define the API surface and handle input validation. **Services** contain business logic and are framework-agnostic, receiving the Prisma client via dependency injection for testability.

**Routers:**

- `profileRouter` — CRUD for profile sections (markdown content)
- `applicationRouter` — CRUD for applications, status transitions, metadata management, filtering/sorting
- `documentRouter` — CRUD for documents, PDF preview and download
- `aiRouter` — document generation/editing (streaming), job description parsing
- `templateRouter` — list starter templates, get metadata/preview

**Services:**

- `ProfileService` — profile section management (create, reorder, edit markdown content)
- `ApplicationService` — application lifecycle, status transitions, metadata CRUD
- `DocumentService` — document CRUD (stores Typst source), manages single-level undo
- `AIService` — orchestrates Claude calls: assembles prompts from profile sections + job description + current Typst source, streams updated Typst source back
- `TemplateService` — reads starter `.typ` files, provides template listing and content
- `CompilationService` — wraps Typst WASM server-side: Typst source → PDF bytes

### Key Patterns

- tRPC context extracts the authenticated user from the Better Auth session and passes `userId` to every procedure
- Activity logging via Prisma middleware: intercepts mutations on Application and Document models, auto-writes activity entries. No manual wiring in services.
- Services receive Prisma client via dependency injection
- Documents store raw Typst source — no intermediate JSON schema or translation layer
- AI rate limiting at tRPC middleware level: max 10 AI calls per minute per user

## Data Model

### Data Model Philosophy

**Flexible everywhere, let the AI handle structure.**

- **Profile data** is free-form markdown sections. Users write naturally, organize however they want.
- **Application metadata** uses key-value pairs for display and context. Not queryable for filtering.
- **Job descriptions** are plain text stored directly on the Application record. They don't compile, don't use templates, and aren't documents.
- **Documents are Typst source code.** Templates are starting points — the AI clones a template, fills it with content from the profile and job description, and from there the document is a `.typ` file that gets edited directly. No JSON schema, no form fields, no translation layer between what the user sees and what gets compiled.

### ProfileSection (many per user)

The user's candidate profile — experience, education, skills, contact info, style guide, etc. — stored as named markdown sections that the user can freely create, edit, reorder, and rename.

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| userId | String (FK) | Owner |
| name | String | Section name (e.g., "Experience", "Skills", "Style Guide", "Contact") |
| content | Text | Markdown content |
| order | Int | Display order |
| createdAt | DateTime | |
| updatedAt | DateTime | |

No predefined sections. Users create whatever sections make sense for them. The AI prompt assembly reads all sections as context. A section named "Style Guide" (by convention) is used to inform the AI's writing style.

### Application

Only fields the UI functionally depends on are columns. Everything else is flexible metadata.

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| userId | String (FK) | Owner |
| company | String | Company name (sorting, filtering) |
| role | String | Job title (displayed everywhere) |
| status | Enum | RESEARCH, DRAFT, READY, APPLIED, INTERVIEW, OFFER, REJECTED, WITHDRAWN |
| type | Enum | INTERNAL, EXTERNAL (drives default template selection) |
| jobDescription | Text? | Raw job posting text, pasted by the user. Used as AI context for document generation. |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### ApplicationMeta (key-value pairs per application)

Flexible metadata for anything application-specific: contacts, URLs, job IDs, location, salary range, notes, or any other detail the user wants to track. Displayed and edited on the application detail page. **Not used for filtering or sorting** — the dashboard table filters only on core Application columns (company, role, status, type, dates).

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| applicationId | String (FK) | Parent application |
| key | String | Field name (e.g., "Hiring Manager", "URL", "Job ID", "Location") |
| value | Text | Field value |
| order | Int | Display order |

The UI renders these as an editable key-value list. Common keys are suggested via autocomplete based on keys the user has used before, but nothing is enforced.

### Document

The document *is* Typst source code. No intermediate structured JSON, no schema contract, no translation layer.

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| applicationId | String (FK) | Parent application |
| userId | String (FK) | Owner |
| type | Enum | CV, COVER_LETTER |
| source | Text | Raw Typst source code (the document itself) |
| previousSource | Text? | Previous version of source, saved before each AI edit. Single-level undo. |
| templateId | String? | Which starter template this was created from (for reference, not a live dependency) |
| chatHistory | JSON | Array of last 20 AI chat messages for iterative refinement (role + content pairs). Oldest messages dropped when limit exceeded. |
| createdAt | DateTime | |
| updatedAt | DateTime | |

When a document is created, the AI takes a starter template + user's profile + job description and generates a complete `.typ` file. From that point on, the source field is the document. Edits happen to the source — by the AI via chat. Before each AI edit, the current source is copied to `previousSource` so the user can revert one step.

### Activity

Auto-generated via Prisma middleware. Read-only from the application's perspective.

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| applicationId | String (FK) | Parent application |
| userId | String (FK) | Owner |
| type | Enum | STATUS_CHANGE, DOCUMENT_EDIT, NOTE, AI_INTERACTION |
| description | String | Human-readable description |
| metadata | JSON? | Machine-generated context (e.g., `{from: "DRAFT", to: "READY"}`) |
| createdAt | DateTime | |

### Starter Templates

Starter templates are `.typ` files in the `templates/` directory. They are **starting points, not live dependencies** — when a document is created, the template content is cloned into the document's `source` field and customized. After creation, the document has no ongoing relationship with the template.

```ts
// templates/config.ts
{
  id: string;
  name: string;
  description: string;
  documentTypes: DocumentType[]; // which document types this template is designed for
  filePath: string; // relative path to .typ file
  previewImage?: string; // path to preview thumbnail
}
```

MVP ships with three starter templates:
1. Modern/clean CV template
2. Classic/traditional CV template
3. Cover letter template

Additional templates can be added by dropping `.typ` files into the templates directory and registering in config.

## UI Structure

All UI built with shadcn/ui components wherever possible.

### Layout

- App shell with collapsible sidebar navigation
- Sidebar items: Dashboard, Profile, Templates, Settings

### Pages

#### Dashboard (`/dashboard`)

- Table view: sortable/filterable DataTable (shadcn DataTable) with columns for company, role, status, type, dates
- Inline status dropdown per row (shadcn Select)
- Filtering on core columns only (company, role, status, type)
- "New Application" button (shadcn Button + Dialog)

#### Application Detail (`/applications/[id]`)

- Header: company name, role, status badge (shadcn Badge), quick status change (shadcn Select)
- Metadata section: editable key-value list of application metadata (shadcn Input pairs with add/remove)
- Job description section: editable text area showing the raw job posting
- Documents section: list of associated documents (CV, cover letter) with preview/edit/download actions

#### Document Editor (`/applications/[id]/documents/[docId]`)

- **PDF preview** (main area): server-rendered PDF preview. On source change, a server request compiles the Typst source and returns a PDF rendered in an iframe. Debounced at 500ms. Shows a skeleton/loading state while compiling.
- **Source view** (toggle): read-only syntax-highlighted display of the Typst source. For transparency — lets the user see what the AI produced. Not editable in MVP.
- **AI drawer** (shadcn Sheet, slides from the right):
  - Chat interface for iterative refinement: "make the summary shorter", "add my cloud experience", "reorder education before experience"
  - AI receives: current Typst source + profile sections + job description + chat history (last 20 messages)
  - AI returns: updated Typst source (streamed). Before applying, current source is saved to `previousSource`. The source field is then replaced, preview recompiles.
  - Chat history persisted on the Document record (capped at 20 messages) for continuity across page refreshes.
  - If AI edit fails (network error, rate limit), the source retains its previous state. Error message with retry.
  - "Undo last AI edit" button — restores `previousSource` to `source`.

**Toolbar**: source view toggle, save button, download PDF, undo AI edit, template info (which starter template was used)

#### Profile (`/profile`)

- List of user-defined markdown sections, each with a name and editable content area
- Drag-and-drop reordering of sections
- Add/remove sections freely
- Markdown editor for each section (simple textarea with markdown preview, or a richer editor)
- This is the master source material feeding all AI-assisted document generation

#### New Application (`/applications/new`)

- Text area to paste job description text (or URL)
- "Parse with AI" button — calls `aiRouter` to extract structured fields
- Review/edit extracted data: company and role as form fields, job description as editable text, everything else as suggested key-value metadata pairs
- Save creates the application + associated metadata

## Typst Compilation Pipeline

### Starter Templates

- `.typ` files in `templates/` directory
- Used as starting points for document creation — cloned into document source, then customized
- Template registry in `templates/config.ts`

### Server-Side Compilation (preview and download)

All Typst compilation happens server-side for MVP. No client-side WASM.

- `CompilationService` loads Typst WASM in a Vercel serverless function
- Takes Typst source string → compiles → returns PDF bytes
- Used for both preview (called on source change, debounced 500ms) and download
- Preview shows a skeleton/loading state while the server compiles
- Fonts bundled as static assets in the serverless function

### Font Handling

- 2-3 professional fonts bundled (e.g., Inter, Source Serif, Fira Sans)
- Bundled in the serverless function alongside Typst WASM
- Consistent output since all compilation uses the same environment

### Vercel Constraints

- 50MB serverless bundle limit — Typst WASM + fonts fit comfortably
- 10s default execution timeout — Typst compiles in milliseconds
- Cold starts will be slower on first compilation; subsequent calls reuse initialized module

### Future Enhancement: Client-Side WASM

Client-side Typst WASM can be added post-MVP for instant preview without server round-trips. This would involve lazy-loading the WASM module (~5-8MB + fonts) when entering the document editor, with the server-side compilation as fallback.

## AI Integration

### Rate Limiting and Cost Guardrails

- tRPC middleware enforces max 10 AI calls per minute per user
- Chat history capped at 20 messages per document (oldest messages dropped when exceeded)
- If the user's profile is empty or minimal, the AI generates placeholder content with clear markers (e.g., `/* TODO: add your experience here */`) rather than producing garbage

### Document Generation (initial creation)

1. User creates a new document, picks a starter template and document type
2. System prompt assembled from: starter template source + all profile sections (as markdown) + job description
3. Claude generates a complete Typst source file: the template filled in with real content tailored to the job
4. Response streams as text — the Typst source streams in, saved to Document on completion
5. Server compiles for preview

### Document Editing (chat refinement)

1. User opens the AI drawer on an existing document
2. User gives an instruction: "make the summary more concise", "emphasize leadership experience", "switch to a two-column layout for skills"
3. System prompt includes: current Typst source + profile sections + job description + chat history (last 20 messages)
4. Before applying the AI response, current source is saved to `previousSource`
5. Claude returns updated Typst source (streamed). The entire source is replaced — simpler and more reliable than applying diffs.
6. Server recompiles for preview
7. Chat history updated on the Document record
8. If generation fails, source retains previous state. Error shown with retry option.
9. User can click "Undo last AI edit" to restore `previousSource`

### Job Description Parser

1. User pastes raw job posting text into the new application form
2. Single tRPC mutation sends text to `AIService`
3. Claude extracts: company name, role title, and any other relevant details as key-value pairs (location, career level, contacts, responsibilities, requirements, etc.)
4. Returns structured JSON via tool_use: `company` and `role` as top-level fields, everything else as suggested metadata key-value pairs
5. Non-streaming — single request/response

### Prompt Architecture

- Base system prompt: role definition, Typst expertise, output format instructions
- Dynamic context block per call: profile sections as markdown, job description text, current document source (for edits)
- For generation/editing: output is raw Typst source code (not JSON, not structured data)
- For job description parsing: output is structured JSON via tool_use

## Authentication

### Better Auth Setup

- Email + password authentication for MVP
- Session-based auth with secure cookies
- Better Auth's Next.js integration for middleware-level route protection
- All authenticated routes: `/dashboard`, `/applications/*`, `/profile`, `/settings`
- Landing/login page at `/`

### Data Isolation

- Every user-data table has a `userId` column (FK to Better Auth user table)
- All service methods require `userId` — enforced at tRPC context level
- tRPC context extracts authenticated user from Better Auth session
- Queries always filter by `userId` — no data leaks between users

### Future Extensibility

- Multi-tenancy already baked in — adding users just works
- Social login (Google, GitHub) via Better Auth plugins
- Role-based access or team features can layer on existing `userId` scoping

## MVP Scope Summary

**In scope (core loop: paste job → parse → create application → generate document → refine via AI chat → export PDF):**
- Dashboard with table view (sortable/filterable on core columns)
- Application CRUD with flexible key-value metadata
- Job description stored as text on the application
- Free-form markdown profile sections
- Document editor with server-side Typst preview + AI chat for editing
- Read-only source view for transparency
- Single-level undo for AI edits (`previousSource`)
- AI document generation from starter templates + profile + job description
- AI iterative refinement via chat (persisted history, capped at 20 messages)
- AI job description parser
- AI rate limiting (10 calls/min/user)
- 3 Typst starter templates (modern CV, classic CV, cover letter)
- Better Auth (email + password)
- Vercel deployment

**Deferred (post-MVP):**
- Client-side Typst WASM for instant preview
- Editable source mode (CodeMirror + Typst syntax support)
- Kanban board view
- Command palette (Cmd+K)
- Document snapshot versioning (full history beyond single undo)
- Activity timeline
- Fit check / gap analysis
- Interview prep generator
- Email draft generator
- Deadline/reminder tracking
- Social login providers
- Template gallery with user-uploaded templates
- Cross-application comparison view
- Data export (JSON resume, markdown dump)
