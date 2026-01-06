import { getQueryResults } from './retrieve-documents.js';
import OpenAI from 'openai';

async function run() {
    try {
        // Specify search query and retrieve relevant documents
        const question = "Who has approval authority for HLZ surveys in a JSOAC or JSOTF context?";
        const documents = await getQueryResults(question);

        // Build a string representation of the retrieved documents to use in the prompt
        let textDocuments = "";
        documents.forEach(doc => {
            textDocuments += doc.document.pageContent;
        });

        // Create a prompt consisting of the question and context to pass to the LLM
        const prompt = `Answer the following question based on the given context. If the user doesn't ask something answerable with provided context, let the user know we can answer questions about the DAFMAN document only. If you don't know the answer, just say that you don't know, don't try to make up an answer. Acknowledge limitations when the context provided is incomplete or does not contain relevant information to answer the question. If you need to fill knowledge gaps using information outside of the context, clearly attribute it as such. Make sure to provide the location (section/chapter) of the document where the answer can be found.
            Question: {${question}}
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
