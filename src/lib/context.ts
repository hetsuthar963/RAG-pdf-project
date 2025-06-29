// import { Pinecone } from "@pinecone-database/pinecone";
// import { getPineconeClient } from "./db/pinecone";
// import { convertToAscii } from "./utils";
// import { vector } from "drizzle-orm/pg-core";
// import { getEmbeddings } from "./db/embeddings";

// export async function getMatchesFromEmbeddings(embeddings:number[], fileKey:string) {
//     const pinecone = new Pinecone({
//         apiKey: process.env.PINECONE_API_KEY!,
//     })

//     const index = await pinecone.Index('chatpdf')

//     try {
//         const namespace = convertToAscii(fileKey)
//         const queryResult = await index.query ({
//             queryRequest: {
//                 topK: 5,
//                 vector: embeddings,
//                 includeMetadata: true,
//                 namespace
//             }
//         })
//         return queryResult.matches || []
//     } catch (error) {
//         console.log('Error querying embeddings', error);
//         throw error
//     }
// }

// export async function getContext(query:string, fileKey:string) {
//     const queryEmbeddings = await getEmbeddings(query);
//     const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);

//     const qualifyingDocs = matches.filter(
//         (match) => match.score && match.score > 0.7 
//     );

//     type Metadata = {
//         text: string,
//         pageNumber: number
//     } 

//     let docs = qualifyingDocs
//     .map(match => (match.metadata && (match.metadata as Metadata).text) || "")
//     .filter(Boolean);

//     return docs.join('\n').substring(0, 3000);
// }







import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./db/embeddings";

// Remove unused imports (e.g., 'vector', 'getPineconeClient') if not used elsewhere.

export async function getMatchesFromEmbeddings(embeddings: number[], fileKey: string) {
    // Pinecone v2: instantiate with config, no .init()
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
        // environment: process.env.PINECONE_ENVIRONMENT!, // <-- add if your org uses it
    });

    const index = pinecone.Index('de-rag-pipeline').namespace(convertToAscii(fileKey)); // No 'await' needed!

    try {
        const namespace = convertToAscii(fileKey);
        console.log(`[Pinecone] Querying index "de-rag-pipeline" for namespace "${namespace}"`);
        
        const queryResult = await index.query({
            topK: 5,
            vector: embeddings,
            includeMetadata: true,
            filter: {
                fileKey: { "$eq": fileKey }
            }
        });

        const matches = queryResult.matches || [];
        console.log(`[Pinecone] Matches returned: ${matches.length}`);
        return matches;
    } catch (error) {
        console.error('[Pinecone] Error querying embeddings:', error);
        throw error;
    }
}

export async function getContext(query: string, fileKey: string) {
    // Get vector embeddings for the query string
    const queryEmbeddings = await getEmbeddings(query);
    if (!queryEmbeddings || !Array.isArray(queryEmbeddings)) {
        console.warn("[Embeddings] Failed to get embeddings for query:", query);
        return "";
    }

    // Get top matches from Pinecone
    const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);
    if (!matches.length) {
        console.warn(`[Pinecone] No matches found for fileKey: ${fileKey}`);
        return "";
    }

    // Filter matches by score threshold (adjust as needed)
    const qualifyingDocs = matches.filter((match) => match.score && match.score > 0.1);
    console.log("[DEBUG] Pinecone match scores:", matches.map(m => m.score));
    type Metadata = { text: string; pageNumber: number };

    // Extract only the text from qualifying docs (robust check)
    const docs = qualifyingDocs
        .map(match => (match.metadata && (match.metadata as Metadata).text) || "")
        .filter(Boolean);

    if (!docs.length) {
        console.warn(`[Context] No qualifying docs above threshold for query: "${query}"`);
    } else {
        console.log(`[Context] Returning ${docs.length} docs for context (truncated to 3000 chars)`);
    }

    // Join and trim the total context
    return docs.join('\n').substring(0, 3000);
}