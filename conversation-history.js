import { MongoClient } from 'mongodb';

export async function storeConversationHistory(conversation) {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db("rag_db");
        const collection = db.collection("conversations");

        // Insert the conversation history into the collection
        const result = await collection.insertOne(conversation);
        console.log(`Conversation history stored with id: ${result.insertedId}`);
    } catch (err) {
        console.log(err.stack);
    } finally {
        await client.close();
    }
}

export async function getConversationHistory(conversationId) {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db("rag_db");
        const collection = db.collection("conversations");

        // Retrieve the conversation history by ID
        const conversation = await collection.find({ conversationId }).limit(5).project({ conversationId: 1, question: 1, response: 1, timestamp: 1 }).sort({ timestamp: 1 }).toArray();
        return conversation;
    } catch (err) {
        console.log(err.stack);
    } finally {
        await client.close();
    }
}