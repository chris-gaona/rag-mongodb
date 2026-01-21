import { VoyageAIClient } from 'voyageai';
// Set up Voyage AI configuration
const client = new VoyageAIClient({apiKey: process.env.VOYAGE_API_KEY});
// Function to generate embeddings using the Voyage AI API
export async function getEmbedding(text, inputType = 'document') {
    const results = await client.embed({
        input: text,
        model: "voyage-4-large",
        input_type: inputType, // Crucial for optimal performance (query vs. document)
        // output_dimension: 1024, // Optional: Set dimension (default 1024, supports 2048, 512, 256)
        // output_dtype: 'float', // Optional: Specify data type (float, int8, uint8, binary)
    });
    return results.data[0].embedding;
}