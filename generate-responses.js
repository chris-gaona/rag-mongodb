import { getQueryResults } from './retrieve-documents.js';
import OpenAI from 'openai';

// Specify the question ask
// const QUESTION = "What are the surface wind limits for CDS / Equipment airdops from a C-130 aircraft, and how do these limits adjust for high-velocity drops?";
// const QUESTION = "What is the purpose of the MAJCOM Civil Engineering Divisions in regards to executing SFO?";
// const QUESTION = "What are the standard geometric size criteria and minimums for Drop Zone operations, such as for C-130 CDS airdrops up to 600 feet AGL?";
const QUESTION = "What do I need to know as a FARP surveyor?";

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
        const context = documents.map(doc =>
            `Content from ${doc.source} (page ${doc.pageNumber}):\n${doc.text}`
        ).join('\n\n')

        // Create a prompt consisting of the question and context to pass to the LLM
        const prompt = `You are a helpful assistant that answers questions based only on the provided context. Acknowledge limitations when the context provided is incomplete or does not contain relevant information to answer the question. If you need to fill knowledge gaps using information outside of the context, clearly attribute it as such. Always cite the source file, page number, table section / chapter, etc. for where you found the information. If you don't know the answer, kindly apologize, acknowledge the question or comment, and remind the user we can only answer questions about survey related military topics. Don't attempt to fabricate an answer.
            Question: {${QUESTION}}
            Context: {${context}}
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
