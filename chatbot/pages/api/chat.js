import { OpenAI } from 'langchain/llms/openai';
import { PineconeClient } from '@pinecone-database/pinecone';
import { VectorDBQAChain } from 'langchain/chains';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { BufferWindowMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';

const model = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
});

// Set the memory to keep the last 3 interactions

// Initiate Pinecone client
const client = new PineconeClient();

export default async function handler(req, res) {
  if (req.method == 'POST') {
    const memory = new BufferWindowMemory({ k: 3 });

    const llmChain = new ConversationChain({
      llm: model,
      memory: memory,
      verbose: true,
    });

    await client.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });

    const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);

    const { query } = req.body;

    // Target the Pinecone index with our information
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex }
    );

    // Create a chain to query our index
    const vectorChain = VectorDBQAChain.fromLLM(model, vectorStore, {
      k: 5,
      returnSourceDocuments: true,
    });

    // Await the response from database
    const pineconeResponse = await vectorChain.call({ query });

    try {
      // Create a prompt to inform the LLM how to respond
      // Insert the database results and question to guide the answer
      const prompt = `
            ROLE: You are a helpful AI bot answering questions for a human.
            You will use CONTEXT to answer the questions.
            You will use MEMORY chat messages to make responses more conversational.
            You will answer the QUESTION for the user.
            You will NOT use any information outside of the CONTEXT to answer the question.
            If you don't know the answer, you will say "I can't help you with that answer".

            CONTEXT: ${JSON.stringify(pineconeResponse)}
            
            QUESTION: ${query}
            `;

      // Await the LLM response
      const response = await llmChain.call({ input: prompt });

      // Return the result to requester
      res.status(200).json({ response });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load data' });
    }
  } else {
    res.status(400).json({ error: 'Not found' });
  }
}
