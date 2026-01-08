import { MongoClient } from 'mongodb';
import { getEmbedding } from './get-embeddings.js';

// Function to get the results of a vector query
export async function getQueryResults(query, numCandidates, exact, limit) {
    // Connect to your Atlas cluster
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        // Get embedding for a query
        const queryEmbedding = await getEmbedding(query);

        await client.connect();
        const db = client.db("rag_db");
        const collection = db.collection("test");

        /**
         * ANN search is ideal for querying large datasets without significant filtering (we'll use this one)
         * https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/?interface=driver&language=nodejs#ann-search
         * ENN or exact search is ideal for smaller datasets or when filtering is applied to reduce the dataset size
         * https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/?interface=driver&language=nodejs#enn-search
         */

        // $vectorSearch must be the first stage of any pipeline 
        // where it appears.
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates, // numCandidates is required if exact is false or omitted
                    exact, // Flag that specifies whether to run ENN or ANN search
                    limit,
                    // https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/?interface=driver&language=nodejs#mongodb-vector-search-pre-filtering
                    filter: { "source": { $eq: "DAFMAN_13-217.pdf" } } // Could use this to switch between different source documents
                }
            },
            {
                $project: {
                    _id: 0,
                    text: 1,
                    // Use vectorSearchScore as a score $meta expression only after the $vectorSearch pipeline stage
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ];

        // Retrieve documents using a Vector Search query
        const result = collection.aggregate(pipeline);

        const arrayOfQueryDocs = [];
        for await (const doc of result) {
            arrayOfQueryDocs.push(doc);
        }
        return arrayOfQueryDocs;
    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}
