import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from  "@langchain/textsplitters"
import { getEmbeddings } from "./embeddings";
import md5 from 'md5'
import { convertToAscii } from "../utils";

console.log("[PINECONE] ========== PINECONE MODULE INITIALIZED ==========");

let pinecone: Pinecone | null = null;

export const getPineconeClient = () => {
    if (!pinecone) {
        console.log("[PINECONE] Creating new Pinecone client...");
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
        console.log("[PINECONE] Pinecone client created");
    }
    return pinecone;
}

export async function loadS3IntoPinecone(fileKey: string) {
    console.log("[PINECONE] ========== LOAD S3 INTO PINECONE ==========");
    console.log("[PINECONE] fileKey:", fileKey);

    console.log("[PINECONE] Step 1: Downloading PDF from S3...");
    const file_name = await downloadFromS3(fileKey);

    if (!file_name) {
        console.error("[PINECONE] CRITICAL: Failed to download from S3");
        throw new Error("Could Not download from S3");
    }
    console.log("[PINECONE] Downloaded to:", file_name);

    console.log("[PINECONE] Step 2: Loading PDF with PDFLoader...");
    const loader = new PDFLoader(file_name);
    const pages = await loader.load();
    console.log("[PINECONE] Loaded", pages.length, "pages");

    if (pages.length === 0) {
        console.error("[PINECONE] CRITICAL: PDF parsing returned zero pages");
        throw new Error("PDF parsing returned zero pages - check if PDF is image-based or corrupted");
    }

    console.log("[PINECONE] Step 3: Splitting documents...");
    const documents = await Promise.all(pages.map(page => prepareDocument(page)));
    const flattenedDocs = documents.flat();
    console.log("[PINECONE] Chunked into", flattenedDocs.length, "documents");

    if (flattenedDocs.length === 0) {
        console.error("[PINECONE] CRITICAL: Document chunking produced zero chunks");
        throw new Error("Document chunking produced zero chunks - check your splitting logic");
    }

    console.log("[PINECONE] Step 4: Generating embeddings...");
    const vectors = await Promise.all(flattenedDocs.map((doc, index) => embedDocument(doc, fileKey, index)));
    console.log("[PINECONE] Generated", vectors.length, "vectors");

    const validVectors = vectors.filter(v => v !== null && v !== undefined);
    console.log("[PINECONE] Valid vectors:", validVectors.length);

    if (validVectors.length === 0) {
        console.error("[PINECONE] CRITICAL: Embedding generation failed - all vectors are empty");
        throw new Error("Embedding generation failed - all vectors are empty!");
    }

    console.log("[PINECONE] Step 5: Uploading vectors to Pinecone...");
    const client = getPineconeClient();
    const pineconeIndex = client.Index('de-rag-pipeline');
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
    console.log("[PINECONE] Namespace:", convertToAscii(fileKey));

    console.log("[PINECONE] Upserting", validVectors.length, "vectors...");
    await namespace.upsert(validVectors);
    console.log("[PINECONE] Upsert complete");

    console.log("[PINECONE] ========== SUCCESS ==========");
    return { documents: flattenedDocs, vectors: validVectors.length };
}

async function embedDocument(doc: Document, fileKey: string, chunkIndex: number) {
    try {
        console.log("[PINECONE-EMBED] Processing chunk", chunkIndex, "- content length:", doc.pageContent.length);
        const embeddings = await getEmbeddings(doc.pageContent);
        const hash = md5(doc.pageContent + chunkIndex);

        const rawPageNumber = doc.metadata?.pageNumber ?? doc.metadata?.sourcePage ?? chunkIndex + 1;
        const pageNumber = Number(rawPageNumber);

        if (!Number.isFinite(pageNumber) || pageNumber < 1) {
            console.warn("[PINECONE-EMBED] Invalid pageNumber:", rawPageNumber);
            return null;
        }

        const rawText = doc.metadata?.text || doc.pageContent || '';
        const text = String(rawText).substring(0, 360000);

        console.log("[PINECONE-EMBED] Chunk", chunkIndex, "- embeddings length:", embeddings.length, "page:", pageNumber);

        return {
            id: hash,
            values: embeddings,
            metadata: {
                fileKey: String(fileKey),
                text: text,
                pageNumber: pageNumber
            }
        } as PineconeRecord

    } catch (error) {
        console.error("[PINECONE-EMBED] ERROR:", error);
        return null;
    }
}

export async function prepareDocument(page: Document) {
    console.log("[PINECONE-PREPARE] Preparing document, content length:", page.pageContent.length);

    const pageNumber = page.metadata?.loc?.pageNumber ?? page.metadata?.pageNumber ?? 1;
    const cleanContent = page.pageContent.replace(/\n/g, ' ');

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 400,
        chunkOverlap: 40,
        separators: ["\n\n", "\n", ". ", " ", ""]
    });

    const chunks = await splitter.createDocuments(
        [cleanContent],
        [{
            pageNumber: pageNumber,
            sourcePage: pageNumber,
            text: truncateStringByBytes(cleanContent, 36000),
            source: page.metadata?.source || "unknown"
        }]
    );

    console.log("[PINECONE-PREPARE] Created", chunks.length, "chunks");
    return chunks;
}

export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder()
    return new TextDecoder('utf-8').decode(enc.encode(str).slice(0, bytes))
}
