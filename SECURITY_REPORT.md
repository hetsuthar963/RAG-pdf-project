# RAG PDF Project Security Vulnerability & Architectural Flaw Report

**Date:** April 2, 2026
**Scope:** Comprehensive security analysis and architectural review of the Next.js RAG application.

This document details critical vulnerabilities, high-risk security flaws, and architectural anti-patterns found within the application, accompanied by detailed remediation steps.

---

## 🔴 CRITICAL SEVERITY (Immediate Action Required)

### 1. Exposed Production API Keys and Secrets
**Location:** `.env`
**Description:** The project contains a `.env` file with live production credentials checked into the codebase or otherwise exposed. This is the single highest risk in the application as it allows full compromise of the application's infrastructure and connected services.
**Exposed Services:**
- Clerk Authentication (Publishable and Secret Keys)
- NeonDB PostgreSQL database URI (with password)
- AWS S3 (Access Key ID and Secret Access Key)
- Pinecone Vector Database API Key
- Gemini API Key
- OpenAI API Key
- HuggingFace Token
- Cohere API Key

**Impact:** Complete infrastructure compromise. Attackers can access the database, manipulate S3 buckets, exhaust API quotas (resulting in massive bills), and steal user data.
**Fix:**
1. **Rotate all keys immediately.** The keys in the current `.env` file must be considered compromised and revoked from their respective provider dashboards.
2. Add `.env`, `.env.local`, `.env.development`, and `.env.production` to your `.gitignore` file.
3. Use a secure secrets manager (like Vercel Environment Variables, AWS Secrets Manager, or Doppler) to inject these keys during deployment.

### 2. Broken Access Control (IDOR & Missing Authentication) on `getMessages`
**Location:** `src/app/api/getMessages/route.ts`
**Description:** The endpoint designed to fetch chat messages lacks both Authentication (verifying who the user is) and Authorization (verifying if the user owns the data). It accepts a `chatId` in the request body and returns all messages associated with that chat.
```typescript
// Current Implementation:
export const POST = async(req: Request) => {
    const {chatId} = await req.json(); // Takes any chatId from the user
    const _messages = await db.select().from(message).where(eq(message.chatId, chatId));
    return NextResponse.json(_messages);
}
```

**Impact:** Any user (authenticated or unauthenticated) can query the endpoint with sequential `chatId` numbers (e.g., 1, 2, 3...) and download the entire message history of every user on the platform.
**Fix:**
1. Retrieve the authenticated user's ID using Clerk's `getAuth(req)`.
2. Query the database to ensure the `chatId` belongs to the requesting `userId`.
```typescript
import { getAuth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

export const POST = async(req: Request) => {
    const { userId } = await getAuth(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { chatId } = await req.json();
    
    // Verify ownership
    const chat = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
    if (!chat.length) return NextResponse.json({ error: "Not found or Unauthorized" }, { status: 404 });

    const _messages = await db.select().from(message).where(eq(message.chatId, chatId));
    return NextResponse.json(_messages);
}
```

### 3. Insecure Direct Object Reference (IDOR) on Chat API
**Location:** `src/app/api/chat/route.ts` (Lines 224-228)
**Description:** Similar to the `getMessages` endpoint, the main chat route accepts a `chatId` to append new messages and retrieve context from the vector database. It fetches the chat from the DB but never checks if the chat belongs to the currently logged-in user.
**Impact:** A malicious actor can inject messages into another user's chat session or utilize another user's uploaded documents as RAG context by passing their `chatId`.
**Fix:** 
Implement Clerk authentication check `getAuth(req)` and verify that the `chatId` matches the authenticated `userId` in the `chats` table before processing the AI prompt.

---

## 🟠 HIGH SEVERITY

### 4. Client-Side Exposure of AWS S3 Credentials
**Location:** `src/lib/db/s3.ts`
**Description:** AWS S3 credentials are prefixed with `NEXT_PUBLIC_`. In Next.js, any environment variable prefixed with `NEXT_PUBLIC_` is bundled into the client-side JavaScript.
```typescript
NEXT_PUBLIC_S3_ACCESS_KEY_ID=AKIA...
NEXT_PUBLIC_S3_SECRET_ACCESS_KEY=SbGu...
```
**Impact:** Anyone inspecting the network tab or browser source code can extract your AWS Access Keys and gain direct access to your S3 buckets.
**Fix:**
1. Remove the `NEXT_PUBLIC_` prefix from these variables in `.env` and all referencing code.
2. Move all S3 interactions (like uploading files) to a Next.js API route (Server Actions or API endpoints). The client should send the file to your Next.js server, and the server (using secure environment variables) uploads it to S3. Alternatively, use Pre-signed URLs for client-side uploads.

### 5. Lack of Input Validation and Sanitization
**Location:** `src/app/api/create-chat/route.ts`, `src/app/api/chat/route.ts`
**Description:** The application relies on basic `if (!file_key)` checks but does not strictly validate the shape, type, or bounds of incoming data.
**Impact:** 
- `file_key` could be manipulated for path traversal attacks if not sanitized properly before being used to generate S3 URLs.
- Malformed JSON payloads could crash the server.
**Fix:** Integrate a validation library like **Zod**. Define schemas for incoming API requests and validate `req.json()` against these schemas before processing.

### 6. Information Disclosure via Error Stack Traces
**Location:** `src/app/api/chat/route.ts` (Lines 307-310)
**Description:** The catch block in the API route explicitly returns `error.stack` in the JSON response when an error occurs.
```typescript
return new Response(JSON.stringify({
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined // 🚨 CRITICAL FLAW
}), ...);
```
**Impact:** Stack traces reveal the internal directory structure, library versions, and execution flow of the application, giving attackers valuable reconnaissance data to craft targeted exploits.
**Fix:** Remove `stack` from the JSON response. Log the stack trace to the server console or an APM tool (like Sentry), but only return a generic "Internal Server Error" message to the client.

---

## 🟡 MEDIUM SEVERITY & ARCHITECTURAL FLAWS

### 7. Missing Rate Limiting
**Location:** `src/app/api/chat/route.ts`, `src/app/api/create-chat/route.ts`
**Description:** The endpoints that interact with paid APIs (Gemini, Pinecone) have no rate limits.
**Impact:** A malicious user or bot could spam the endpoints, leading to massive financial costs (Denial of Wallet) and quota exhaustion, bringing down the application for legitimate users.
**Fix:** Implement rate limiting (e.g., using Upstash Redis or Vercel KV) based on `userId` or IP address to restrict the number of chats created or messages sent per minute/hour.

### 8. Use of Deprecated AWS SDK (v2)
**Location:** `src/lib/db/s3.ts`, `src/lib/db/s3-server.ts`
**Description:** The application imports `aws-sdk` (v2), which has reached the end of support. It also partially imports `@aws-sdk/client-s3` (v3). 
**Impact:** v2 receives no security updates and significantly bloats the server bundle size compared to the modular v3.
**Fix:** Standardize on `@aws-sdk/client-s3`. Remove `aws-sdk` from `package.json` and refactor the `uploadToS3` and `downloadloadFromS3` functions to use v3 commands (`PutObjectCommand`, `GetObjectCommand`).

### 9. Missing File Size Limits on Upload
**Location:** `src/components/UploadComponent.tsx`
**Description:** While there is a client-side check (`file.size > 10 * 1024 * 1024`), there is no server-side enforcement.
**Impact:** An attacker can bypass the client-side UI and send massive files directly to S3 or the API, consuming storage and server memory during vectorization.
**Fix:** Enforce the 10MB limit within the Next.js API route that handles the upload or pre-signed URL generation.

### 10. Missing Database Indexes
**Location:** `src/lib/db/schema.ts`
**Description:** The `chats` table lacks an index on `userId`, and the `messages` table lacks an index on `chatId`.
**Impact:** As the database grows, querying `db.select().from(chats).where(eq(chats.userId, userId))` will result in full table scans, severely degrading application performance.
**Fix:** Add indexes to foreign keys and heavily queried columns in drizzle schema:
```typescript
import { index } from 'drizzle-orm/pg-core';
// Add to table definitions:
// (table) => { return { userIdIndex: index('user_id_idx').on(table.userId) } }
```

### 11. Overuse of `any` and Unsafe Types
**Location:** Multiple files (e.g., `src/app/api/chat/route.ts` line 102)
**Description:** Catch blocks use `catch (error: any)` or `catch (error: unknown)` without proper type narrowing before accessing properties. 
**Fix:** Use TypeScript's `unknown` in catch blocks and narrow using `if (error instanceof Error)` consistently.

---

## 📋 Summary of Required Fixes (Checklist)

- [ ] Delete/Revoke all API keys currently in `.env`.
- [ ] Remove `NEXT_PUBLIC_` from S3 credentials.
- [ ] Implement `getAuth(req)` checks in `getMessages` API.
- [ ] Implement `getAuth(req)` checks in `chat` API.
- [ ] Remove `error.stack` from API responses.
- [ ] Implement Zod input validation on all API endpoints.
- [ ] Enforce server-side file size limits.
- [ ] Add rate limiting to AI generation endpoints.
- [ ] Migrate entirely to AWS SDK v3.
- [ ] Add DB indexes to `userId` and `chatId`.