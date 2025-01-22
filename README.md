# Solana Agent Server

A server that initializes and manages a Solana Agent for onchain interactions using LangChain and OpenAI.

## Features
- Dynamic agent initialization with configurable LLM parameters
- Secure wallet generation and management
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

### 1. Create Docker Image
```bash
docker build -t solana-agent-kit:latest .
docker save solana-agent-kit:latest -o solana-agent-kit.tar
```

### 2. Build Oyster-CVM Image
```bash
oyster-cvm build --platform amd64 --docker-compose ./docker-compose.yml --docker-images ./solana-agent-kit.tar
```

### 3. Upload Image
Upload the generated `result/image.eif` to a remote file server that's accessible via HTTP/HTTPS.

### 4. Deploy to Marlin Hub
```bash
cargo run -- deploy \
    --image-url <image-url> \
    --region ap-south-1 \
    --wallet-private-key <wallet-secret> \
    --instance-type c6a.xlarge \
    --operator 0xe10fa12f580e660ecd593ea4119cebc90509d642 \
    --duration-in-minutes 60 \
    --bandwidth 100
```

## Environment Variables

The following variables are set automatically during initialization:
- `OPENAI_API_KEY`: OpenAI API key for LLM interactions
- `RPC_URL`: Solana RPC URL for blockchain interactions
- `SOLANA_PRIVATE_KEY`: Generated wallet's private key (base58 encoded)
- `SOLANA_PUBLIC_KEY`: Generated wallet's public key (base58 encoded)
