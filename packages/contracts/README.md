# Arc Index Smart Contracts

Smart contracts for the Arc Index project registry, curation, ratings, and donations system.

## Contracts

### New Architecture (Arc Index V2)

| Contract | Description |
|----------|-------------|
| `ArcIndexRegistry.sol` | Main registry for project submission, curation, ratings, and donations |
| `ArcIndexCertificateNFT.sol` | Soulbound ERC-721 NFT for approved project certificates |

### Legacy Contracts

| Contract | Description |
|----------|-------------|
| `ProjectRegistry.sol` | Original project registry |
| `ApprovalNFT.sol` | Original approval NFT |
| `Ratings.sol` | Standalone ratings contract |
| `Funding.sol` | Standalone funding contract |

## Arc Testnet Configuration

| Parameter | Value |
|-----------|-------|
| Network Name | Arc Testnet |
| RPC URL | https://rpc-testnet.arc.io |
| Chain ID | 5042002 |
| Currency | ETH |
| USDC Address | `0x3600000000000000000000000000000000000000` |

### Faucet

Get testnet tokens at: https://faucet.circle.com

## Installation

```bash
npm install
```

## Compilation

```bash
npm run compile
```

## Testing

```bash
npm test
```

## Deployment

### Environment Variables

Create a `.env.local` file in the project root with:

```env
# Required
RPC_URL=https://rpc-testnet.arc.io
CHAIN_ID=5042002
ADMIN_PRIVATE_KEY=your_private_key_here

# Optional for Arc Index V2
TREASURY_ADDRESS=0x...  # Defaults to deployer if not set
FEE_BPS=250             # Fee in basis points (250 = 2.5%)
CURATOR_WALLETS=0x...,0x...  # Comma-separated curator addresses
```

### Deploy to Localhost

```bash
# Start local node
npx hardhat node

# Deploy legacy contracts
npm run deploy:localhost

# Deploy Arc Index V2 contracts
npm run deploy:arc-index:localhost
```

### Deploy to Arc Testnet

```bash
# Deploy legacy contracts
npm run deploy:arc

# Deploy Arc Index V2 contracts
npm run deploy:arc-index
```

## Contract Addresses

| Contract | Address |
|----------|---------|
| ArcIndexCertificateNFT | `0x3aA8e518594CdABBF7660F05D5bA9F0504A4Bde2` |
| ArcIndexRegistry | `0xA64a0505eda4619b7CCCEDcd0777176363347f12` |

## Arc Index V2 Features

### Project Lifecycle

1. **Submit**: Anyone can submit a project with metadata URI
2. **Review**: Curators approve or reject pending projects
3. **Approve**: Approved projects receive a soulbound certificate NFT
4. **Rate**: Anyone can rate approved projects (1-5 stars)
5. **Donate**: USDC donations with configurable fee split

### Roles

- **Admin**: Full control, can add/remove curators, set treasury, adjust fees
- **Curator**: Can approve/reject pending projects

### Certificate NFT

- Soulbound (non-transferable)
- Minted automatically on project approval
- Contains project metadata URI
- Can be burned by admin

### Ratings

- 1-5 star ratings
- Users can update their rating
- Aggregates (count, sum) tracked on-chain
- Average calculated via view function

### Donations

- USDC-based donations
- Configurable fee (basis points)
- Fee sent to treasury
- Remainder sent to project owner

## Certificate SVG Template

The `assets/certificate.svg` file contains a template for generating certificate images. Placeholders:

- `{{PROJECT_NAME}}`: Project name
- `{{PROJECT_ID}}`: On-chain project ID
- `{{ISSUE_DATE}}`: Certificate issue date
- `{{CURATOR_SHORT}}`: Shortened curator address

## License

MIT
