import express from 'express';
import { SolanaAgentKit, createSolanaTools } from "solana-agent-kit";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const app = express();
app.use(express.json());

async function initializeAgent() {
    const llm = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
    });

    const solanaAgent = new SolanaAgentKit(
        process.env.SOLANA_PRIVATE_KEY!,
        process.env.RPC_URL!,
        process.env.OPENAI_API_KEY!,
    );

    const tools = createSolanaTools(solanaAgent);
    const memory = new MemorySaver();
    const config = { configurable: { thread_id: "Solana Agent Kit!" } };

    const agent = createReactAgent({
        llm,
        tools,
        checkpointSaver: memory,
        messageModifier: `
            You are a helpful agent that can interact onchain using the Solana Agent Kit.
            Be concise and helpful with your responses.
        `,
    });

    return { agent, config };
}

let isInitialized = false;
let agentInstance: any = null;

app.post('/init', async (req, res) => {
    if (isInitialized) {
        return res.status(400).json({ error: 'Agent is already initialized' });
    }

    const { OPENAI_API_KEY, RPC_URL } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!OPENAI_API_KEY) missingFields.push('OPENAI_API_KEY');
    if (!RPC_URL) missingFields.push('RPC_URL');

    if (missingFields.length > 0) {
        return res.status(400).json({ 
            error: 'Missing required fields', 
            missingFields 
        });
    }

    // Generate new Solana keypair
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();
    
    // Set environment variables
    process.env.OPENAI_API_KEY = OPENAI_API_KEY;
    process.env.RPC_URL = RPC_URL;
    process.env.SOLANA_PRIVATE_KEY = bs58.encode(keypair.secretKey);

    try {
        agentInstance = await initializeAgent();
        isInitialized = true;
        res.json({ 
            message: 'Agent initialized successfully',
            walletAddress: walletAddress
        });
    } catch (error) {
        console.error('Error initializing agent:', error);
        res.status(500).json({ error: 'Failed to initialize agent' });
    }
});

app.post('/chat', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ 
            error: 'Agent not initialized. Please call /init endpoint first' 
        });
    }

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const stream = await agentInstance.agent.stream(
            { messages: [new HumanMessage(message)] },
            agentInstance.config
        );

        const responses: any[] = [];
        for await (const chunk of stream) {
            if ("agent" in chunk) {
                responses.push(chunk.agent.messages[0].content);
            } else if ("tools" in chunk) {
                responses.push(chunk.tools.messages[0].content);
            }
        }

        res.json({ responses });
    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Agent server running on port ${PORT}`);
});
