import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from  "@langchain/textsplitters"
import { getEmbeddings } from "./embeddings";
import md5 from 'md5'
import { convertToAscii } from "../utils";
import { log } from "console";
import { index } from "drizzle-orm/gel-core";
// import { Vector } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/db_data";


let pinecone: Pinecone | null = null;  


// Changed to synchronous function
export const getPineconeClient = () => {
    if (!pinecone) {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
            // environment: process.env.PINECONE_ENVIRONMENT!
        });
    }
    return pinecone;
}

type PDFPage = {
    pageContent: string;
    metadata: {
        loc: {pageNumber:number}
    }
}



export async function loadS3IntoPinecone(fileKey: string) {
    // s-1: Obtain the PDF -> Download and read the pdf from S3

    console.log("🪣 Downloading S3 into file System");

    const file_name = await downloadFromS3(fileKey)
    
    if (!file_name ) {
        throw new Error("Could Not download from S3")
    }

    console.log(`📄 Downloaded to: ${file_name}`);

    const loader = new PDFLoader(file_name);

    const pages = await loader.load();
    console.log(`📑 Loaded ${pages.length} pages`);

    if (pages.length === 0) {
        throw new Error("PDF parsing returned zero pages - check if PDF is image-based or corrupted");
    }

    // s-2: Split and Segment the PDF
    const documents = await Promise.all(pages.map(page => prepareDocument(page)));     

    const flattenedDocs = documents.flat();

    console.log(` -- Chunked into ${flattenedDocs.length} documents`);
    
    if (flattenedDocs.length === 0) {
        throw new Error("Document chunking produced zero chunks - check your splitting logic");
    }

    // s-3: Vectorise and embed individual documents 
    const vectors = await Promise.all(flattenedDocs.map((doc, index) => embedDocument(doc, fileKey, index)))

    console.log(`-- Generated ${vectors.length} vectors --`);

    const validVectors = vectors.filter(v => v !== null && v !== undefined);
    console.log(`-- Valid vectors are : ${validVectors.length}`);

    if (validVectors.length === 0) {
        throw new Error(" -- Embedding generation failed all vectors are empty!! --");
    }
    

    // s-4: store/upload the vectors into pinecone
    const client = await getPineconeClient()
    const pineconeIndex = client.Index('de-rag-pipeline')
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
    // Define namespace for vector storage
    
    console.log("📤 Inserting vectors into Pinecone");
    await namespace.upsert(validVectors); 

    return { documents: flattenedDocs, vectors: validVectors.length };
} 

async function embedDocument(doc: Document, fileKey: string, chunkIndex: number) {
    try {
        const embeddings  = await getEmbeddings(doc.pageContent)
        const hash = md5(doc.pageContent + chunkIndex); // Added index to ensure uniqueID

        // Defensive metadata extraction
        const rawPageNumber = doc.metadata?.pageNumber ?? doc.metadata?.sourcePage ?? chunkIndex + 1;
        const pageNumber = Number(rawPageNumber);

        // Validation 
        if (!Number.isFinite(pageNumber) || pageNumber < 1) {
            console.warn(`Invalid pageNumber (${rawPageNumber}), using chunkIndex+1`);
            return null;
        }

        const rawText = doc.metadata?.text || doc.pageContent || '';
        const text = String(rawText).substring(0, 360000);

        return {
            id: hash,
            values: embeddings,
            metadata: {
                fileKey: String(fileKey), // <-- ADD THIS!
                text: text,
                pageNumber: pageNumber
            }
        } as PineconeRecord

    } catch (error) {
        console.log('Error embedding document', error);
        return null;
    }
}



export async function prepareDocument(page: Document) {
    // const { metadata } = page;
    // let pageContent = page.pageContent;
    // pageContent = pageContent.replace(/\n/g, ' ');

    // // Use smaller chunk size for better searchability (especially for names)
    // const splitter = new RecursiveCharacterTextSplitter({
    //     chunkSize: 1000,        // Split into 400-char chunks
    //     chunkOverlap: 200       // 40-char overlap between chunks
    // });

    // const docs = await splitter.splitDocuments([
    //     new Document({
    //         pageContent,
    //         metadata : {
    //             pageNumber: metadata.loc?.pageNumber ?? 1,
    //             text: truncateStringByBytes(pageContent, 36000)
    //         }
    //     })
    // ]);
    // return docs;

    // Extracting page number from PDF metadata with fallbacks
    const pageNumber = page.metadata?.loc?.pageNumber ?? page.metadata?.pageNumber ?? 1;

    // Clean content
    const cleanContent = page.pageContent.replace(/\n/g, ' ');

    // Initialize splitter
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 400,
        chunkOverlap: 40,
        separators: ["\n\n", "\n", ". ", " ", ""]
    });

    // Assigning metadata to each chunk 
    const chunks = await splitter.createDocuments(
        [cleanContent],
        [{
            pageNumber: pageNumber,
            sourcePage: pageNumber,
            text: truncateStringByBytes(cleanContent, 36000),
            source: page.metadata?.source || "unknown" 
        }]
    );

    // Verifying the metadata persisted
    console.log(`Created ${chunks.length} chunks with metadata:`,
        chunks.map(c => ({
            pageNumber: c.metadata.pageNumber,
            hasText: !!c.metadata.text
        }))
    );

    return chunks;
}




export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder()
    return new TextDecoder('utf-8').decode(enc.encode(str).slice(0, bytes))
}
