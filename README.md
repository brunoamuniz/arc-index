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

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **React**: Version 19.2.0
- **TypeScript**: For type safety
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with animations
- **UI Components**: [Radix UI](https://www.radix-ui.com/) - accessible component library
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics)
- **Fonts**: Geist and Geist Mono (Google Fonts)

## 📁 Project Structure

```
arc-index/
├── app/                      # Next.js App Router
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

- Node.js 18+ 
- pnpm (recommended package manager)

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

3. **Run the development server**
```bash
pnpm dev
```

4. **Access the application**
Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Create production build
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint linter

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

### Pending Features (Mock)

⚠️ Wallet integration (currently mock)
⚠️ Blockchain integration (NFT certification)
⚠️ Backend/API for data persistence
⚠️ Real USDC payment system
⚠️ User authentication
⚠️ Image upload to storage

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

## 📄 License

This project is licensed under the terms specified in the `LICENSE` file.

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request for discussion.

## 📧 Contact

For more information about Arc Network, visit [arc.network](https://www.arc.network/)

---

**Developed with ❤️ for the Arc Network community**
