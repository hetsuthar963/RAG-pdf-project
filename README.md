# RAG PDF Assistant

An authenticated, end‑to‑end Retrieval Augmented Generation (RAG) experience built with Next.js App Router. Users upload a PDF, the document is stored in S3, chunked and embedded with Cohere, indexed in Pinecone, and then queried through a Gemini-powered chat interface that surfaces context-aware answers. Drizzle ORM on Neon powers persistence, while Clerk secures the application front to back.

> This repository is intended for internal use. Keep all API keys and service credentials private when following the instructions below.

---

## Table of Contents

- [Feature Highlights](#feature-highlights)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Data & Retrieval Workflow](#data--retrieval-workflow)
- [Database & Infrastructure Notes](#database--infrastructure-notes)
- [Deployment (Vercel)](#deployment-vercel)
- [Operations & Maintenance](#operations--maintenance)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Scripts](#scripts)

---

## Feature Highlights

- **Clerk authentication** – fine-grained session management and a polished drop-in sign-in/sign-up experience.
- **Drag-and-drop PDF upload** with size validation, S3 persistence, and optimistic feedback.
- **Automated ingestion pipeline** – downloads the PDF from S3, chunks text with LangChain tooling, generates Cohere embeddings, and upserts vectors to Pinecone.
- **Context-aware chat** – user prompts retrieve the most relevant vector matches and inject the snippets into a Gemini system prompt for grounded answers.
- **Streaming-ready UI** – React components wired with TanStack Query for reliable data fetching and real-time status indicators.
- **Serverless-first design** – Neon serverless Postgres, Pinecone, S3, and Gemini keep the runtime lean and scalable.

---

## System Architecture

1. **User authentication**: Clerk issues front-end and back-end tokens that gate every flow.
2. **PDF upload**  
   - Client uploads the file straight to S3 using temporary credentials.  
   - The `/api/create-chat` endpoint records metadata in Postgres and kicks off ingestion.
3. **Document ingestion**  
   - The PDF is downloaded from S3 on the server, chunked with `RecursiveCharacterTextSplitter`, embedded via Cohere, and stored in Pinecone (namespace = sanitized file key).  
   - Chat metadata (file key, S3 URL, user ownership) is inserted via Drizzle into Neon.
4. **Chat session**  
   - UI loads past messages from `/api/getMessages`.  
   - When the user asks a question, `/api/chat` retrieves the Pinecone matches for the chat’s namespace, injects the top snippets into a Gemini prompt, and returns the answer.  
   - Both question and answer are persisted back to Postgres for replay.
5. **PDF rendering**: Each chat view displays the original PDF using `@react-pdf-viewer` backed by a time-bound S3 pre-signed URL.

---

## Technology Stack

| Layer                | Tooling / Service                                        |
| -------------------- | -------------------------------------------------------- |
| Front-end            | Next.js 15 App Router, React 18, Tailwind CSS            |
| Authentication       | Clerk                                                    |
| State/Data fetching  | TanStack Query, Axios                                    |
| File storage         | AWS S3 (direct uploads + signed view URLs)               |
| Vector store         | Pinecone                                                 |
| Embeddings           | Cohere `embed-english-v3.0`                              |
| LLM inference        | Google Gemini 2.0 Flash                                  |
| Database             | Neon serverless Postgres + Drizzle ORM                   |
| PDF parsing/viewer   | LangChain loaders, @react-pdf-viewer                     |
| Utilities            | Lucide icons, react-dropzone, react-hot-toast, md5, etc. |

---

## Prerequisites

- **Runtime**: Node.js 20+, npm 10+
- **Cloud accounts**:
  - [Clerk](https://clerk.com/) for auth
  - [Neon](https://neon.tech/) (or compatible Postgres) for persistence
  - [AWS S3](https://aws.amazon.com/s3/) bucket in `us-east-1`
  - [Pinecone](https://www.pinecone.io/) vector DB (`de-rag-pipeline` index exists)
  - [Cohere](https://cohere.com/) API key with embedding access
  - [Google AI Studio](https://ai.google.dev/) API key for Gemini
- **Optional keys**: OpenAI / HuggingFace tokens (not required in current flow)
- **CLI tooling**: `git`, and optionally `drizzle-kit` installed globally (`npm i -g drizzle-kit`)

---

## Environment Configuration

Create a `.env.local` (not committed) in the project root and populate the required secrets. Use placeholders when sharing documentation; never commit active keys.

```dotenv
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_***
CLERK_SECRET_KEY=sk_live_***
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Database (Neon)
DATABASE_URL=postgresql://user:password@.../dbname?sslmode=require

# AWS S3 (bucket must allow PutObject/GetObject for the keys below)
NEXT_PUBLIC_S3_ACCESS_KEY_ID=AKIA***
NEXT_PUBLIC_S3_SECRET_ACCESS_KEY=***
NEXT_PUBLIC_S3_BUCKET_NAME=my-rag-bucket

# Pinecone
PINECONE_API_KEY=pcsk-***
PINECONE_ENVIRONMENT=us-east-1

# Embeddings & LLMs
COHERE_API_KEY=***
GEMINI_API_KEY=***

# Optional integrations
OPENAI_API_KEY=sk-***
HUGGINGFACE_API_KEY=hf_***
```

> **Recommendation**: Use distinct keys per environment (development, preview, production) and rotate them regularly. For production, configure the same entries in Vercel’s Environment Variables section.

---

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000). Clerk will enforce sign-in before allowing uploads or chat activity.
3. **Verify credentials**
   - Upload a PDF and confirm a chat record is created.  
   - Run `npm run lint` and `npm run build` to ensure type checks, lint, and the build pipeline pass locally.

---

## Data & Retrieval Workflow

1. **Upload**
   - `UploadComponent` handles drag-and-drop (via `react-dropzone`), enforces a 10 MB limit, and uploads to S3 with progress feedback.  
   - On success, it calls `/api/create-chat`, which records metadata and begins ingestion.

2. **Embedding & Indexing**
   - `loadS3IntoPinecone` downloads the PDF (`downloadloadFromS3`), splits it into ~400-character chunks (`RecursiveCharacterTextSplitter`), calls `getEmbeddings` (Cohere), and upserts to the Pinecone index using a namespace derived from the S3 key.

3. **Chat session**
   - `ChatComponent` fetches historic messages through `/api/getMessages`, memoizes them for UI rendering, and posts user prompts to `/api/chat`.  
   - The API turns the latest message into a Cohere embedding, queries Pinecone (`getMatchesFromEmbeddings`), constructs a Gemini system prompt that includes the top snippets, and sends the completion back.  
   - Both the user and assistant responses are persisted in the `messages` table (Drizzle/Neon).

4. **PDF rendering**
   - `/api/chat/[chatId]/page.tsx` fetches the chat metadata, generates a short-lived signed URL (`getSignedViewUrl`), and renders the PDF with `@react-pdf-viewer`.

---

## Database & Infrastructure Notes

- **Schema management**: Drizzle migrates against Neon. See `drizzle.config.ts` for configuration. Typical workflow:
  ```bash
  npx drizzle-kit generate
  npx drizzle-kit push
  ```
- **Tables**:
  - `chats`: stores chat metadata (`pdfName`, `pdfUrl`, `userId`, `fileKey`).  
  - `messages`: stores chat history (`chatId`, `role`, `content`).
- **Indexing namespace**: `convertToAscii(fileKey)` ensures Pinecone namespaces stay ASCII-safe.
- **File storage**: Uploaded PDFs live under `uploads/<timestamp>-<filename>` in S3. The server relies on AWS credentials with read/write rights to this bucket.

---

## Deployment (Vercel)

1. **Set env vars** in Vercel → *Settings → Environment Variables* (Production & Preview). Mirror the `.env.local` keys with the same names.
2. **Build command**: `npm run build` (default).  
3. **Output**: Vercel serves the Next.js output with Edge middleware and Server Components. API routes run as serverless functions.
4. **Post-deploy checks**:
   - Upload a PDF and watch the server logs to ensure Pinecone/S3 interactions succeed.
   - Open the chat page and confirm the PDF renders via the signed URL.
   - Send a prompt and confirm Gemini responses. If you see a 500 with an API key error, update the corresponding environment variable and redeploy.

---

## Operations & Maintenance

- **Credential rotation**: Update S3, Pinecone, Cohere, and Gemini keys periodically. After rotating, redeploy with the new values.
- **Monitoring**:  
  - Vercel function logs capture errors from `/api/chat` and `/api/create-chat`.  
  - Pinecone dashboard shows namespace sizes and query usage.  
  - Clerk dashboard tracks sign-in activity.
- **Cost control**:
  - Limit max file size and chunk size if storage costs climb.  
  - Pinecone charges per vector count—consider deleting old namespaces if chats are archived.  
  - Gemini usage is billed per request; watch for failed requests (often invalid keys or quota limits).
- **Security**:
  - Store secrets outside version control.  
  - Use HTTPS for all external endpoints (Clerk, S3 signed URLs, etc.).  
  - Validate file types on upload (already limited to `.pdf` via `accept` and back-end processing).

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
| ------- | ------------ | ---------- |
| `POST /api/chat` returns `API key not valid` | Gemini key missing or expired | Update `GEMINI_API_KEY` in Vercel and redeploy |
| PDF viewer shows 403/404 | `PDFViewer` received an unsigned URL | Ensure `getSignedViewUrl` result is passed to the component |
| Pinecone upsert failures | Invalid API key or namespace mismatch | Verify `PINECONE_API_KEY`, index name (`de-rag-pipeline`), and ensure namespace uses ASCII |
| Upload stalls at 0% | S3 credentials lack `PutObject` | Update IAM policy with put/list/get rights for the bucket |
| Clerk redirect loop | Incorrect `NEXT_PUBLIC_CLERK_*` URLs | Confirm they match the routes defined in the app |
| `npm run build` warns about AWS SDK v2 | Informational: upgrade path is AWS SDK v3 | Optional; current code uses v2 for direct uploads |

---

## Project Structure

```
src/
├─ app/
│  ├─ layout.tsx              # Root layout with Clerk provider
│  ├─ page.tsx                # Landing page with upload CTA
│  └─ chat/[chatId]/page.tsx  # Chat + PDF workspace view
├─ components/
│  ├─ ChatComponent.tsx       # Chat window, message list, input form
│  ├─ MessageList.tsx         # Renders chat transcript
│  ├─ PDFViewer.tsx           # Signed URL viewer w/ error handling
│  ├─ UploadComponent.tsx     # Drag-and-drop uploader
│  ├─ ChatSideBar.tsx         # List of user chats
│  └─ ui/                     # Shared UI primitives (button, input, etc.)
├─ lib/
│  ├─ db/
│  │  ├─ index.ts             # Neon/Drizzle connection
│  │  ├─ schema.ts            # Drizzle schema definitions
│  │  ├─ pinecone.ts          # Ingestion + upsert helpers
│  │  ├─ s3.ts / s3-server.ts # Upload & signed URL utilities
│  │  └─ embeddings.ts        # Cohere embedding client
│  ├─ context.ts              # Pinecone query + context builder
│  └─ utils.ts                # Tailwind class merge, ASCII helper
└─ middleware.ts              # Clerk edge middleware
```

---

## Scripts

| Command            | Description                                    |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Start the Next.js dev server                   |
| `npm run build`    | Create a production build                      |
| `npm run start`    | Serve the production build locally             |
| `npm run lint`     | Run ESLint (type-aware via `next lint`)        |
| `npx drizzle-kit generate` | Generate migration files              |
| `npx drizzle-kit push`     | Apply migrations to the database      |

---

## Next Steps

- Extend the `/api/chat` endpoint to stream partial completions for a richer UI.
- Add background jobs to re-index PDFs when new versions are uploaded.
- Introduce automated integration tests that exercise the upload → chat loop.

For internal questions or access requests (secrets, S3 policies, Pinecone index management), contact the project owner or platform team.

