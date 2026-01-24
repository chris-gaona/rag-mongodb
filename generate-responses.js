import { getQueryResults } from './retrieve-documents.js';
import OpenAI from 'openai';
import { storeConversationHistory, getConversationHistory } from './conversation-history.js';

// Specify the question ask
// const QUESTION = "What are the surface wind limits for CDS / Equipment airdops from a C-130 aircraft, and how do these limits adjust for high-velocity drops?";
// const QUESTION = "What is the purpose of the MAJCOM Civil Engineering Divisions in regards to executing SFO?";
// const QUESTION = "What are the standard geometric size criteria and minimums for Drop Zone operations, such as for C-130 CDS airdrops up to 600 feet AGL?";
// const QUESTION = "What do I need to know as a FARP surveyor?";
// const QUESTION = "What is the minimum runway length for a USAF C-130 aircraft on a Landing Zone at sea level?";
// const QUESTION = "What about for a C-17 aircraft?";
// const QUESTION = "What are the minimum runway width requirements for a USAF C-130 aircraft on a Landing Zone at sea level, including options for turns specifically from the TSPWG_M_3-260-03_02-19 file?";
const QUESTION = "What is the glide slope ratio (as part of imaginary surfaces) for approach and departure vertical obstruction clearances for a USAF C-130 aircraft on a Landing Zone at sea level?";

// Specify the search query parameters
/**
 * It is recommended that you specify a numCandidates number at least 20 times higher than the number of documents to return (limit) to increase accuracy and reduce discrepancies
 */
const NUM_CANDIDATES = 200; // 200 is 20 times higher than LIMIT of 10
const EXACT = false; // Indicates whether to run ENN (true) or ANN (false) search - If true, numCandidates should be omitted
const LIMIT = 10;

async function run() {
    try {
        // Initialize OpenAI client
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Retrieve the conversation history from mongodb
        const conversationHistory = await getConversationHistory("user-test-session-001");
        // console.log(`conversationHistory`, conversationHistory)

        // Instruct the LLM to generate a "standalone question" that incorporates necessary context from the history if relevant, or return the original question otherwise.
        const initialPrompt = `Given the following conversation history between a user and an AI assistant, rephrase the user's most recent question to be a standalone question that incorporates any necessary context from the history. If the most recent question is already standalone, return it as is.

        Conversation History:
        ${conversationHistory.map(entry => `User: ${entry.question}\nAI: ${entry.response}`).join('\n')}

        Most Recent Question:
        ${QUESTION}`;

        // Prompt the LLM to generate a response based on the context
        const questionCompletion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: initialPrompt
                },
            ],
        });

        console.log(`Question to query with: `, questionCompletion.choices[0].message.content)
        
        // Specify search query and retrieve relevant documents
        const documents = await getQueryResults(questionCompletion.choices[0].message.content, NUM_CANDIDATES, EXACT, LIMIT);

        // Uncomment below line to print out retrieved documents
        // console.log('Retrieved documents: ', documents);

        // Build a string representation of the retrieved documents to use in the prompt
        const context = documents.map(doc =>
            `Content from ${doc.source} (page ${doc.pageNumber}):\n${doc.text}`
        ).join('\n\n')

        // Create a prompt consisting of the question and context to pass to the LLM
        const prompt = `You are a helpful assistant that answers questions based only on the provided context. Acknowledge limitations when the context provided is incomplete or does not contain relevant information to answer the question. If you need to fill knowledge gaps using information outside of the context, clearly attribute it as such. Always cite the source file, page number, table section / chapter, etc. for where you found the information. If there are multiple sources make sure to mention all sources in your response. If you don't know the answer, kindly apologize, acknowledge the question or comment, and remind the user we can only answer questions about survey related military topics. Don't attempt to fabricate an answer.
            Question: {${questionCompletion.choices[0].message.content}}
            Context: {${context}}
        `;

        // Prompt the LLM to generate a response based on the context
        const chatCompletion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: prompt
                },
            ],
        });

        // Output the LLM's response as text.
        console.log(chatCompletion.choices[0].message.content);

        // Store the conversation history back to mongodb
        await storeConversationHistory({
            conversationId: "user-test-session-001",
            question: questionCompletion.choices[0].message.content,
            context: context,
            response: chatCompletion.choices[0].message.content,
            timestamp: new Date()
        });
    } catch (err) {
        console.log(err.stack);
    }
}
run().catch(console.dir);
