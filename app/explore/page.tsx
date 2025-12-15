"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Search, Star, Shield, Github, Twitter, Linkedin, Share2 } from "lucide-react"

// Mock data for projects
const projects = [
  {
    id: 1,
    name: "DeFi Protocol",
    description: "Next-generation automated market maker with advanced liquidity pools",
    category: "DeFi",
    rating: 4.8,
    totalRatings: 124,
    funded: 15000,
    image: "/defi-protocol-blockchain.jpg",
    author: "0x1234...5678",
    twitter: "https://twitter.com/defiprotocol",
    github: "https://github.com/defiprotocol",
    linkedin: "https://linkedin.com/company/defiprotocol",
  },
  {
    id: 2,
    name: "NFT Marketplace",
    description: "Curated digital art trading platform with creator royalties",
    category: "NFT",
    rating: 4.6,
    totalRatings: 98,
    funded: 12000,
    image: "/nft-marketplace-digital.jpg",
    author: "0x2345...6789",
    twitter: "https://twitter.com/nftmarket",
    github: "https://github.com/nftmarket",
  },
  {
    id: 3,
    name: "GameFi Platform",
    description: "Play-to-earn gaming ecosystem with NFT integration",
    category: "Gaming",
    rating: 4.9,
    totalRatings: 156,
    funded: 20000,
    image: "/gamefi-platform-gaming.jpg",
    author: "0x3456...7890",
    twitter: "https://twitter.com/gamefi",
    github: "https://github.com/gamefi",
    linkedin: "https://linkedin.com/company/gamefi",
  },
  {
    id: 4,
    name: "Dao Governance",
    description: "Decentralized autonomous organization platform for community voting",
    category: "DAO",
    rating: 4.5,
    totalRatings: 87,
    funded: 9500,
    image: "/dao-governance-voting.jpg",
    author: "0x4567...8901",
    twitter: "https://twitter.com/daogov",
    github: "https://github.com/daogov",
  },
  {
    id: 5,
    name: "Cross-Chain Bridge",
    description: "Secure asset transfer protocol across multiple blockchains",
    category: "Infrastructure",
    rating: 4.7,
    totalRatings: 112,
    funded: 18000,
    image: "/cross-chain-bridge.jpg",
    author: "0x5678...9012",
    twitter: "https://twitter.com/crossbridge",
    github: "https://github.com/crossbridge",
  },
  {
    id: 6,
    name: "Lending Protocol",
    description: "Peer-to-peer lending and borrowing with algorithmic interest rates",
    category: "DeFi",
    rating: 4.8,
    totalRatings: 143,
    funded: 22000,
    image: "/lending-protocol-finance.jpg",
    author: "0x6789...0123",
    twitter: "https://twitter.com/lendingpro",
    github: "https://github.com/lendingpro",
    linkedin: "https://linkedin.com/company/lendingpro",
  },
]

const categories = ["All", "DeFi", "NFT", "Gaming", "DAO", "Infrastructure"]
const sortOptions = ["Newest", "Highest Rated", "Most Funded"]

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState("Newest")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProjects = projects.filter((project) => {
    const matchesCategory = selectedCategory === "All" || project.category === selectedCategory
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Explore Projects</h1>
            <p className="text-lg text-muted-foreground">Discover certified projects building on Arc Network</p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-10 pr-4"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                {sortOptions.map((option) => (
                  <Button
                    key={option}
                    variant={sortBy === option ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6 text-sm text-muted-foreground">
            Showing {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
          </div>

          {/* Project Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="group flex flex-col overflow-hidden border-border/40 bg-card/50 transition-all hover:border-primary/50"
              >
                <Link href={`/project/${project.id}`} className="block">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={project.image || "/placeholder.svg"}
                      alt={project.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                </Link>
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex-1">
                    <Link href={`/project/${project.id}`}>
                      <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary">
                        {project.name}
                      </h3>
                    </Link>
                    <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {project.category}
                      </Badge>
                      <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-xs text-primary">
                        <Shield className="h-3 w-3" />
                        Certified
                      </Badge>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mb-4 flex items-center justify-between border-t border-border/40 pt-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium">{project.rating}</span>
                      <span className="text-muted-foreground">({project.totalRatings})</span>
                    </div>
                    <div className="font-mono text-primary">${project.funded.toLocaleString()}</div>
                  </div>

                  {/* Social Links */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {project.twitter && (
                        <a
                          href={project.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                      )}
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {project.linkedin && (
                        <a
                          href={project.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2">
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="py-20 text-center">
              <p className="mb-4 text-lg text-muted-foreground">No projects found matching your criteria</p>
              <Button
                onClick={() => {
                  setSelectedCategory("All")
                  setSearchQuery("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
