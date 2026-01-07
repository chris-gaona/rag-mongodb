import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { MongoClient } from 'mongodb';
import { getEmbedding } from './get-embeddings.js';
import { getEncoding } from 'js-tiktoken';

const PDF_FILE = `DAFMAN_13-217.pdf`
// Specify the chunking params
const CHUNK_SIZE = 250;
const CHUNK_OVERLAP = 50;

// Counts number of tokens in a given string.
const encoding = getEncoding('gpt2');

export const getTokenCount = (text) => {
    // Standard character splitting (roughly 4 chars per token) is 
    // often inaccurate for non-English text or code.
    // Using tiktoken provides a more accurate token count.
    // This recursive method is generally recommended for better 
    // context preservation
    return encoding.encode(text).length;
};

async function run() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        const loader = new PDFLoader(PDF_FILE);
        const data = await loader.load();

        // Chunk the text from the PDF
        // By default, RecursiveCharacterTextSplitter uses 
        // ["\\n\\n", "\\n", " ", ""] (paragraphs, then newlines, 
        // then spaces, then characters). 
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
            lengthFunction: getTokenCount,
        });
        const docs = await textSplitter.splitDocuments(data);
        console.log(`Successfully chunked the PDF into ${docs.length} documents.`);

        // Connect to your MongoDB Atlas cluster
        await client.connect();
        const db = client.db("rag_db");
        const collection = db.collection("test");

        console.log("Clearing your collection of any pre-existing data.");
        const deleteResult = await collection.deleteMany({})
        console.log("Deleted " + deleteResult.deletedCount + " documents")

        console.log("Generating embeddings and inserting documents...");
        const insertDocuments = [];
        await Promise.all(docs.map(async doc => {

            // Generate embeddings using the function that you defined
            const embedding = await getEmbedding(doc.pageContent);

            // Add the document with the embedding to array of documents for bulk insert
            insertDocuments.push({
                document: doc,
                embedding: embedding
            });
        }))

        // Continue processing documents if an error occurs during an operation
        const options = { ordered: false };

        // Insert documents with embeddings into collection
        const result = await collection.insertMany(insertDocuments, options);  
        console.log("Count of documents inserted: " + result.insertedCount); 

    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}
run().catch(console.dir);
