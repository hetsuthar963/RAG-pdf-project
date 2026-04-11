

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