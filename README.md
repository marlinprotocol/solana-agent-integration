start project

```bash
docker build -t solana-agent-kit .
docker save solana-agent-kit:latest -o solana-agent-kit.tar

# local test
docker load -i solana-agent-kit.tar
docker-compose up -d
```