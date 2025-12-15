# Arc Index

> Curated index of blockchain projects for the Arc Network. Discover, certify, and support innovative projects with on-chain NFT certification.

## 📋 About the Project

**Arc Index** is a web platform that connects blockchain innovators with the Arc Network community. The platform allows developers to submit their projects, receive on-chain NFT certification after approval, and get ratings and funding from the community.

### Key Features

- 🛡️ **NFT Certification**: Approved projects receive an on-chain NFT certificate as a trust badge
- ⭐ **Community Ratings**: 1-5 star rating system to help others discover quality projects
- 💰 **USDC Support**: Direct funding of projects through USDC donations
- 📝 **Curated Listings**: All projects are reviewed to ensure quality and legitimacy
- 📊 **Author Dashboard**: Track submissions, view status, and manage projects
- 🔗 **Social Integration**: Links to Twitter, GitHub, Discord, and LinkedIn

## 🚀 Technologies Used

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **React**: Version 19.2.0
- **TypeScript**: For type safety
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with animations
- **UI Components**: [Radix UI](https://www.radix-ui.com/) - accessible component library
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics)
- **Fonts**: Geist and Geist Mono (Google Fonts)

### Backend
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Storage)
- **Authentication**: Web3 wallet signature (SIWE-style)
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/)
- **Blockchain**: Solidity contracts (Hardhat)
- **Web3**: [viem](https://viem.sh/) for contract interactions
- **Indexer**: Event listener worker for on-chain sync

## 📁 Project Structure

```
arc-index/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── projects/       # Project CRUD endpoints
│   │   ├── public/         # Public API for external integrations
│   │   ├── review/         # Curator review endpoints
│   │   └── metadata/       # NFT metadata endpoint
│   ├── explore/             # Project exploration page
│   ├── submit/              # Project submission form
│   ├── my-projects/         # User dashboard
│   ├── project/[id]/        # Project details page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page (landing)
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Reusable UI components (Radix UI)
│   ├── navigation.tsx       # Navigation component
│   ├── footer.tsx           # Footer component
│   └── star-rating.tsx      # Star rating component
├── hooks/                   # Custom React Hooks
├── lib/                     # Utilities and helpers
│   ├── api/                # Frontend API client
│   ├── auth/               # Authentication helpers
│   └── supabase/           # Supabase clients
├── packages/                # Shared packages
│   ├── shared/             # Shared TypeScript types
│   └── contracts/          # Solidity contracts
│       ├── contracts/      # .sol files
│       ├── scripts/        # Deployment scripts
│       └── test/           # Contract tests
├── indexer/                 # Chain event indexer worker
├── supabase/                # Database migrations
│   └── migrations/         # SQL migration files
├── public/                  # Static files (images, icons)
└── styles/                  # Additional styles
```

## 🎯 Main Pages

### 1. Landing Page (`/`)
Home page with:
- Hero section with call-to-action
- Process explanation (4 steps)
- Key features
- Featured projects
- FAQ
- Final CTA section

### 2. Explore (`/explore`)
Exploration page with:
- Project search
- Category filters (DeFi, NFT, Gaming, DAO, Infrastructure)
- Sorting (Newest, Highest Rated, Most Funded)
- Project grid with informative cards
- Social links and sharing

### 3. Submit Project (`/submit`)
Multi-step submission form:
- **Step 1**: Basic information (name, category, description)
- **Step 2**: Media and social links
- **Step 3**: Blockchain information (network, contract address)

### 4. My Projects (`/my-projects`)
User dashboard with:
- List of submitted projects
- Status filters (Draft, Pending, Approved, Rejected)
- Project details
- Contextual actions (edit, resubmit, view)

### 5. Project Details (`/project/[id]`)
Project details page with:
- Complete project information
- Rating system
- Funding section (USDC)
- Links and resources
- Blockchain information
- Social sharing

## 🛠️ Installation and Setup

### Prerequisites

- Node.js 20+
- pnpm (recommended package manager)
- Supabase account and project
- EVM-compatible blockchain (local or Arc Network)
- MetaMask or compatible wallet

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd arc-index
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_BUCKET=arc-index-projects

# Web3 / Chain
CHAIN_ID=5042002
RPC_URL=http://localhost:8545
PROJECT_REGISTRY_ADDRESS=
APPROVAL_NFT_ADDRESS=
RATINGS_ADDRESS=
FUNDING_ADDRESS=
USDC_ADDRESS=

# Curator/Admin
CURATOR_WALLETS=0x1234567890123456789012345678901234567890
ADMIN_PRIVATE_KEY=

# Image Processing
MAX_UPLOAD_MB=5
BANNER_WIDTH=1600
BANNER_HEIGHT=900
BANNER_FORMAT=webp
BANNER_QUALITY=80

# Indexer
INDEXER_POLL_INTERVAL_MS=5000
INDEXER_FROM_BLOCK=0

# App
NEXT_PUBLIC_APP_URL=http://arcindex.xyz
NODE_ENV=development
```

4. **Set up Supabase**

   a. Create a new Supabase project at [supabase.com](https://supabase.com)
   
   b. Create a storage bucket named `arc-index-projects` with public access
   
   c. Run database migrations:
   ```bash
   # Option 1: Via Supabase Dashboard
   # Go to SQL Editor and run the files in supabase/migrations/ in order
   # See docs/supabase/APPLY_MIGRATIONS.md for detailed instructions
   
   # Option 2: Via Supabase CLI
   supabase db push
   ```

5. **Deploy smart contracts**

```bash
# Compile contracts
pnpm contracts:compile

# Deploy to local network (Hardhat)
npx hardhat node  # In a separate terminal
pnpm contracts:deploy --network localhost

# Or deploy to Arc Network
pnpm contracts:deploy --network arc
```

   Copy the deployed contract addresses to your `.env.local` file.

6. **Start the development server**
```bash
pnpm dev
```

7. **Start the indexer (optional, in separate terminal)**
```bash
pnpm indexer:dev
```

8. **Access the application**
Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `pnpm dev` - Start development server (web + API)
- `pnpm build` - Create production build
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint linter
- `pnpm contracts:compile` - Compile Solidity contracts
- `pnpm contracts:deploy` - Deploy contracts to network
- `pnpm contracts:test` - Run contract tests
- `pnpm indexer:dev` - Start chain event indexer

## 🎨 Design System

The project uses a design system based on:
- **Dark Theme**: Application configured with dark theme by default
- **Accessible Components**: All components are based on Radix UI
- **Responsive**: Fully responsive design for mobile, tablet, and desktop
- **Animations**: Smooth transitions with Tailwind CSS Animate

## 📝 Current Status

### Implemented Features

✅ Complete interface for all pages
✅ Navigation system
✅ Multi-step submission form
✅ User project dashboard
✅ Project details page
✅ Star rating system
✅ Filters and search on exploration page
✅ Complete UI components
✅ **Backend API with Supabase integration**
✅ **Web3 wallet authentication (SIWE)**
✅ **Smart contracts (ProjectRegistry, ApprovalNFT, Ratings, Funding)**
✅ **Image processing pipeline with Sharp**
✅ **Chain event indexer**
✅ **Database schema with RLS policies**
✅ **TypeScript API client**
✅ **Public API for external integrations** (`/api/public/projects`)

### Integration Status

⚠️ Frontend UI needs to be wired to API client (see `lib/api/client.ts`)
⚠️ On-chain rating and funding UI integration (contracts ready, UI needs viem hooks)
⚠️ NFT badge display (needs indexer to sync tokenId)

## 🔮 Next Steps

To make the application fully functional, it will be necessary to:

1. **Blockchain Integration**
   - Wallet connection (MetaMask, WalletConnect, etc.)
   - Smart contracts for NFT certification
   - Arc Network integration

2. **Backend**
   - REST or GraphQL API
   - Database for projects
   - Authentication system
   - File upload (images)

3. **Advanced Features**
   - Notification system
   - Analytics and metrics
   - Comment system
   - Transaction history

## 🌐 Public API

Arc Index provides a public API for external applications to integrate and display approved projects. This is ideal for:

- Carousels and widgets
- Partner websites
- Mobile applications
- Third-party integrations

### Quick Start

```bash
# Get all approved projects
curl https://arcindex.xyz/api/public/projects

# Filter by category
curl "https://arcindex.xyz/api/public/projects?category=DeFi"

# With pagination
curl "https://arcindex.xyz/api/public/projects?limit=20&offset=0"
```

### Documentation

For complete API documentation, see [docs/API_PUBLIC.md](docs/API_PUBLIC.md).

### Features

- ✅ Returns only approved projects
- ✅ Includes short descriptions, images, and social links
- ✅ Optional API key authentication
- ✅ CORS enabled for cross-origin requests
- ✅ Caching headers for performance
- ✅ Pagination support

## 📄 License

This project is licensed under the terms specified in the `LICENSE` file.

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request for discussion.

## 📧 Contact

For more information about Arc Network, visit [arc.network](https://www.arc.network/)

---

**Developed with ❤️ for the Arc Network community**
