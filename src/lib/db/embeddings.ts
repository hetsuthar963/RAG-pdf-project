// import { OpenAIApi, Configuration } from "openai-edge"

// const config = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY
// })

// const openai = new OpenAIApi(config)

// export async function getEmbeddings(text:string) {
//     try {
//         const response = await openai.createEmbedding({
//             model: "text-embedding-ada-002",
//             input: text.replace(/\n/g, ' ')
//         })
//         const result = await response.json()
//         return result.data[0].embedding as number[]
//     } catch (error) {
//         console.error("Error calling OpenAI Embeddings API", error);
//         throw error
//     }
// }



// import { CohereClient } from 'cohere-ai';

// const cohere = new CohereClient({
//   token: process.env.COHERE_API_KEY, // Set your Cohere API key in .env
// });

// export async function getEmbeddings(text: string): Promise<number[]> {
//   try {
//     const sanitizedInput = text.replace(/\n/g, ' ').trim();

//     if (sanitizedInput.length === 0) {
//       throw new Error("Invalid input text - empty string after sanitization");
//     }

//     // Generate embeddings
//     const response = await cohere.embed({
//       texts: [sanitizedInput],
//       model: 'embed-english-v3.0', // Use the latest embedding model
//       inputType: 'search_document', // Specify the input type
//     });

//     // Handle response based on its type
//     if (Array.isArray(response.embeddings)) {
//       // For older models, embeddings is a number[][]
//       return response.embeddings[0]; // Return the first embedding vector
//     } else if (response.embeddings && Array.isArray(response.embeddings.float)) {
//       // For newer models, embeddings is an EmbedByTypeResponseEmbeddings object
//       return response.embeddings.float[0]; // Return the first embedding vector
//     } else {
//       throw new Error("Unexpected response format from Cohere API");
//     }
//   } catch (error) {
//     console.error("Error generating embeddings with Cohere API:", error);
//     throw error;
//   }
// }



import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!, // Ensure you have the key
});

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const sanitizedInput = text.replace(/\n/g, ' ').trim();
    if (!sanitizedInput) throw new Error("Input text is empty after sanitization");

    const response = await cohere.embed({
      texts: [sanitizedInput],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    // Modern Cohere returns { embeddings: number[][] }
    if (response.embeddings && Array.isArray(response.embeddings)) {
      return response.embeddings[0]; // The embedding as number[]
    } else {
      throw new Error("Unexpected Cohere embedding response format");
    }
  } catch (error) {
    console.error("Error generating embeddings with Cohere API:", error);
    throw error;
  }
}