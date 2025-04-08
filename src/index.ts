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

// check if agent is initialized
const checkInitialization = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!agentInstance) {
        return res.status(400).json({ 
            error: 'Agent not initialized. Please call /init endpoint first' 
        });
    }
    next();
};

async function initializeAgent(modelName: string = "gpt-4o-mini", temperature: number = 0.7) {
    const llm = new ChatOpenAI({
        modelName,
        temperature,
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

let agentInstance: any = null;

app.post('/init', async (req, res) => {
    if (agentInstance) {
        return res.status(400).json({ error: 'Agent is already initialized' });
    }

    const { 
        OPENAI_API_KEY, 
        RPC_URL,
        llm = {
            modelName: "gpt-4o-mini",
            temperature: 0.7
        }
    } = req.body;

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

    // Validate temperature
    if (typeof llm.temperature !== 'number' || llm.temperature < 0 || llm.temperature > 1) {
        return res.status(400).json({ 
            error: 'Temperature must be a number between 0 and 1' 
        });
    }

    try {
        // Get Ed25519 private key from localhost derive server
        const response = await fetch("http://127.0.0.1:1100/derive/ed25519?path=signing-server");
        const arrayBuffer = await response.arrayBuffer();
        const privateKey = new Uint8Array(arrayBuffer);

        // Use the private key to create a Solana keypair
        const keypair = Keypair.fromSeed(privateKey.slice(0, 32));
        const walletAddress = keypair.publicKey.toBase58();
        
        // Set all environment variables before initialization
        process.env.OPENAI_API_KEY = OPENAI_API_KEY;
        process.env.RPC_URL = RPC_URL;
        process.env.SOLANA_PRIVATE_KEY = bs58.encode(keypair.secretKey);
        process.env.SOLANA_PUBLIC_KEY = walletAddress;

        // Initialize agent after all environment variables are set
        agentInstance = await initializeAgent(llm.modelName, llm.temperature);
        
        res.json({ 
            message: 'Agent initialized successfully',
            walletAddress,
            config: { llm }
        });
    } catch (error) {
        // Clear all environment variables on failure
        process.env.OPENAI_API_KEY = '';
        process.env.RPC_URL = '';
        process.env.SOLANA_PRIVATE_KEY = '';
        process.env.SOLANA_PUBLIC_KEY = '';
        
        console.error('Error initializing agent:', error);
        res.status(500).json({ 
            error: 'Failed to initialize agent',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

app.post('/chat', checkInitialization, async (req, res) => {
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

app.get('/wallet', checkInitialization, (req, res) => {
    res.json({ walletAddress: process.env.SOLANA_PUBLIC_KEY });
});

const PORT = 8000;

const server = app.listen(PORT, () => {
    console.log(`Agent server running on port ${PORT}`);
}).on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port by setting the PORT environment variable.`);
        process.exit(1);
    } else {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});
