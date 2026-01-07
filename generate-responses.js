import { getQueryResults } from './retrieve-documents.js';
import OpenAI from 'openai';

// Specify the question ask
const QUESTION = "What are the surface wind limits for CDS / Equipment airdops from a C-130 aircraft, and how do these limits adjust for high-velocity drops?";

// Specify the search query parameters
/**
 * It is recommended that you specify a numCandidates number at least 20 times higher than the number of documents to return (limit) to increase accuracy and reduce discrepancies
 */
const NUM_CANDIDATES = 100; // 100 is 20 times higher than LIMIT of 5
const EXACT = false; // Indicates whether to run ENN (true) or ANN (false) search - If true, numCandidates should be omitted
const LIMIT = 5;

async function run() {
    try {
        // Specify search query and retrieve relevant documents
        const documents = await getQueryResults(QUESTION, NUM_CANDIDATES, EXACT, LIMIT);

        // Uncomment below line to print out retrieved documents
        // console.log('Retrieved documents: ', documents);

        // Build a string representation of the retrieved documents to use in the prompt
        let textDocuments = "";
        documents.forEach(doc => {
            textDocuments += doc.text;
        });

        // Create a prompt consisting of the question and context to pass to the LLM
        const prompt = `Answer the following question based on the given context. If the user doesn't ask something answerable with provided context, let the user know we can answer questions about the DAFMAN document only. If you don't know the answer, just say that you don't know, don't try to make up an answer. Acknowledge limitations when the context provided is incomplete or does not contain relevant information to answer the question. If you need to fill knowledge gaps using information outside of the context, clearly attribute it as such. Make sure to provide the location (section/chapter) of the document where the answer can be found.
            Question: {${QUESTION}}
            Context: {${textDocuments}}
        `;

        // Initialize OpenAI client
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Prompt the LLM to generate a response based on the context
        const chatCompletion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: prompt
                },
            ],
        });

        // Output the LLM's response as text.
        console.log(chatCompletion.choices[0].message.content);
    } catch (err) {
        console.log(err.stack);
    }
}
run().catch(console.dir);
