# Solana Agent Server

A server that initializes and manages a Solana Agent for onchain interactions using LangChain and OpenAI.

## Features
- Dynamic agent initialization with configurable LLM parameters
- Secure wallet key derivation from kms derive server
- Real-time chat interface with the agent
- Wallet address retrieval endpoint

## API Endpoints

### Initialize Agent
```http
POST /init
```
Request body:
```json
{
    "OPENAI_API_KEY": "your-api-key",
    "RPC_URL": "your-rpc-url",
    "llm": {
        "modelName": "gpt-4o-mini",  // optional, default: "gpt-4o-mini"
        "temperature": 0.7           // optional, default: 0.7
    }
}
```

### Chat with Agent
```http
POST /chat
```
Request body:
```json
{
    "message": "your message here"
}
```

### Get Wallet Address
```http
GET /wallet
```

## Setup & Running

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm run start
```

The server will run on port 8000 by default. You can change this by setting the `PORT` environment variable.

## Development

1. Build the TypeScript code:
```bash
npm run build
```

2. Run in development mode:
```bash
npm run dev
```

## Package & Deploy

### 1. Create and push the docker image to docker hub. Replace with your username.
```bash
docker build -t <username>/solana-agent-kit:latest .
docker push <username>/solana-agent-kit:latest
```

### 2. Deploy to Marlin Hub
```bash
oyster-cvm -- deploy \
    --region us-west-1 \
    --wallet-private-key <wallet-secret> \
    --duration-in-minutes 60 \
    --docker-compose ./docker-compose.yml
```

## Environment Variables

The following variables are set automatically during initialization:
- `OPENAI_API_KEY`: OpenAI API key for LLM interactions
- `RPC_URL`: Solana RPC URL for blockchain interactions
- `SOLANA_PRIVATE_KEY`: Wallet's private key derived from the local server (base58 encoded)
- `SOLANA_PUBLIC_KEY`: Wallet's public key (base58 encoded)

## Key Derivation
Instead of generating random keys, this server uses a deterministic key derivation approach:
1. The server fetches an Ed25519 private key from a localhost derive server
2. The key is requested with a specific path parameter (`signing-server`)
3. Solana's `Keypair.fromSeed()` creates a keypair from the 32-byte private key
4. This approach ensures consistent key generation across server restarts

## Wallet Persistence
The wallet secret key is persistent across deployments -- even if you stop / redeploy your instance, as long as it's the same code -- the wallet will be the same. This feature enables:

- Secure, as only the ai agent can access the private key when run inside the Oyster CVM
- Consistent identity for your AI agent on-chain
- Ability to keep funds in the same wallet across deployments
- No need to re-fund or re-authorize a new wallet when restarting
- Seamless continuity of operations for long-running AI agents

This persistent identity makes AI agents all the more practical on Oyster TEE, enabling autonomous on-chain agents with stable, long-term blockchain identities.
