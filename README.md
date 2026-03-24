# Welp

Blockchain-based review platform where users earn WLP tokens for verified reviews.

## Project Structure

```
welp-capstone/
├── contracts/            # Foundry project (Solidity smart contracts)
│   ├── src/              # Contract source files
│   ├── test/             # Foundry tests
│   ├── script/           # Deployment scripts
│   ├── lib/              # Dependencies (forge-std, OpenZeppelin)
│   └── foundry.toml      # Foundry configuration
└── README.md
```

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Build & Test

```bash
cd contracts
forge build
forge test
```
