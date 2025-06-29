import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";
import type { Index as PineconeIndex } from "@pinecone-database/pinecone";
import { downloadloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document, RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter"
import { getEmbeddings } from "./embeddings";
import md5 from 'md5'
import { metadata } from "@/app/layout";
import { convertToAscii } from "../utils";
import { Vector } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/db_data/models/Vector";
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

    console.log("🪣   Downloading S3 into file System");
    const file_name = await downloadloadFromS3(fileKey)
    if (!file_name ) {
        throw new Error("Could Not download fro S3")
    }
    const loader = new PDFLoader(file_name)
    const pages = (await loader.load()) as PDFPage[];

    // s-2: Split and Segment the PDF
    const documents = await Promise.all(pages.map(prepareDocument));     
    
    // s-3: Vectorise and embed individual documents 
    const vectors = await Promise.all(documents.flat().map(doc => embedDocument(doc, fileKey)))

    // s-4: store/upload the vectors into pinecone
        const client = await getPineconeClient()
        const pineconeIndex = client.Index('de-rag-pipeline')
        const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
        // Define namespace for vector storage
    
        console.log("📤 Inserting vectors into Pinecone");
        await namespace.upsert(vectors); // Increased chunk size

    return { documents: documents.flat(), vectors: vectors.length };
} 

async function embedDocument(doc: Document, fileKey: string) {
    try {
        const embeddings  = await getEmbeddings(doc.pageContent)
        const hash = md5(doc.pageContent)

        return {
            id: hash,
            values: embeddings,
            metadata: {
                fileKey, // <-- ADD THIS!
                text: String(doc.metadata.text),
                pageNumber: Number(doc.metadata.pageNumber)
            }
        } as PineconeRecord

    } catch (error) {
        console.log('Error embedding document', error);
        throw error
    }
}



export async function prepareDocument(page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, ' ');

    // Use smaller chunk size for better searchability (especially for names)
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 400,        // Split into 400-char chunks
        chunkOverlap: 40       // 40-char overlap between chunks
    });

    const docs = await splitter.splitDocuments([
        new Document({
            pageContent,
            metadata : {
                pageNumber: metadata.loc.pageNumber,
                text: truncateStringByBytes(pageContent, 36000)
            }
        })
    ]);
    return docs;
}


// Updated chunkedUpsert function
async function chunkedUpsert(
    index: ReturnType<typeof Pinecone.prototype.Index>,
    vectors: PineconeRecord[],
    namespace: string,
    chunkSize = 100
) {
    const chunks = Array.from(
        { length: Math.ceil(vectors.length / chunkSize) },
        (_, i) => vectors.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    const results = await Promise.allSettled(
        chunks.map(async (chunk) => {
            try {
                await index.upsert(chunk);
                return chunk.length;
            } catch (error) {
                console.error("Chunk upsert error:", error);
                return 0;
            }
        })
    );

    const totalInserted = results.reduce((acc, result) => 
        result.status === 'fulfilled' ? acc + result.value : acc, 0
    );

    if (totalInserted !== vectors.length) {
        throw new Error(`Failed to insert all vectors (${totalInserted}/${vectors.length})`);
    }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder()
    return new TextDecoder('utf-8').decode(enc.encode(str).slice(0, bytes))
}