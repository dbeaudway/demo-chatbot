import { PineconeClient } from '@pinecone-database/pinecone';
import { VectorDBQAChain } from 'langchain/chains';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from 'langchain/prompts';
import { BufferMemory } from 'langchain/memory';

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'history',
});

export default async function handler(req, res) {
  const client = new PineconeClient();

  const model = new ChatOpenAI({ temperature: 0 });

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(`
      The following is a friendly conversation between a human and an AI. 
      The AI is talkative and provides lots of specific details from its context. 
      If the AI does not know the answer to a question, it truthfully says it does not know.
      Use the "history" to understand what we've already talked about in the conversation.
  
      Use the CONTEXT below to answer the QUESTION asked by the user.
      `),
    new MessagesPlaceholder('history'),
    HumanMessagePromptTemplate.fromTemplate('{input}'),
  ]);

  const llmChain = new ConversationChain({
    memory,
    prompt: chatPrompt,
    llm: model,
    verbose: true,
  });

  if (req.method == 'POST') {
    // Initiate Pinecone client
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
