"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { StarRating } from "@/components/star-rating"
import {
  ArrowLeft,
  Shield,
  Github,
  Twitter,
  Linkedin,
  Globe,
  MessageCircle,
  Copy,
  ExternalLink,
  DollarSign,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Mock project data
const projectData = {
  id: 1,
  name: "DeFi Protocol",
  description:
    "Next-generation automated market maker with advanced liquidity pools and yield optimization strategies.",
  longDescription: `DeFi Protocol is revolutionizing decentralized finance with innovative automated market maker technology. Our platform features:

• Advanced liquidity pools with dynamic fee structures
• Yield optimization strategies powered by AI
• Multi-chain support for seamless asset transfers
• Community governance through DAO mechanisms
• Security-first architecture with multiple audits

Built on Arc Network, DeFi Protocol leverages the power of programmable money to create a more efficient and accessible financial system for everyone.`,
  category: "DeFi",
  rating: 4.8,
  totalRatings: 124,
  funded: 15000,
  image: "/defi-protocol-blockchain.jpg",
  author: "0x1234...5678",
  approvalDate: "2024-01-15",
  contractAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f5f3e",
  network: "Arc Network",
  links: {
    twitter: "https://twitter.com/defiprotocol",
    github: "https://github.com/defiprotocol",
    linkedin: "https://linkedin.com/company/defiprotocol",
    discord: "https://discord.gg/defiprotocol",
    website: "https://defiprotocol.com",
  },
}

export default function ProjectDetailsPage() {
  const [userRating, setUserRating] = useState(0)
  const [donationAmount, setDonationAmount] = useState("")
  const { toast } = useToast()

  const handleShare = (platform: string) => {
    const url = window.location.href
    if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=Check out ${projectData.name} on Arc Index!&url=${url}`,
        "_blank",
      )
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url)
      toast({
        title: "Link copied!",
        description: "Project URL has been copied to clipboard",
      })
    } else if (platform === "discord") {
      navigator.clipboard.writeText(url)
      toast({
        title: "Link copied!",
        description: "Share this link in Discord",
      })
    }
  }

  const handleDonate = () => {
    if (!donationAmount || Number.parseFloat(donationAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Donation initiated",
      description: `Sending ${donationAmount} USDC to ${projectData.name}`,
    })
  }

  const handleRating = (rating: number) => {
    setUserRating(rating)
    toast({
      title: "Rating submitted",
      description: `You rated this project ${rating} stars`,
    })
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Back Button */}
          <Link
            href="/explore"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          {/* Hero Section */}
          <div className="mb-8 overflow-hidden rounded-2xl">
            <div className="aspect-[21/9] overflow-hidden">
              <img
                src={projectData.image || "/placeholder.svg"}
                alt={projectData.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="mb-3 text-4xl font-bold">{projectData.name}</h1>
                    <p className="text-lg text-muted-foreground">{projectData.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-2 border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary"
                  >
                    <Shield className="h-4 w-4" />
                    Certified by Arc Index
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant="secondary">{projectData.category}</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Approved {new Date(projectData.approvalDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Description */}
              <Card className="border-border/40 bg-card/50">
                <CardHeader>
                  <CardTitle>About the Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {projectData.longDescription}
                  </div>
                </CardContent>
              </Card>

              {/* Links */}
              <Card className="border-border/40 bg-card/50">
                <CardHeader>
                  <CardTitle>Links & Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {projectData.links.website && (
                      <a
                        href={projectData.links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-background"
                      >
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Website</div>
                          <div className="text-xs text-muted-foreground">defiprotocol.com</div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {projectData.links.twitter && (
                      <a
                        href={projectData.links.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-background"
                      >
                        <Twitter className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Twitter</div>
                          <div className="text-xs text-muted-foreground">@defiprotocol</div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {projectData.links.github && (
                      <a
                        href={projectData.links.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-background"
                      >
                        <Github className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">GitHub</div>
                          <div className="text-xs text-muted-foreground">View repository</div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {projectData.links.linkedin && (
                      <a
                        href={projectData.links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-background"
                      >
                        <Linkedin className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">LinkedIn</div>
                          <div className="text-xs text-muted-foreground">Company profile</div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {projectData.links.discord && (
                      <a
                        href={projectData.links.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-background"
                      >
                        <MessageCircle className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Discord</div>
                          <div className="text-xs text-muted-foreground">Join community</div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Blockchain Info */}
              <Card className="border-border/40 bg-card/50">
                <CardHeader>
                  <CardTitle>Blockchain Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">Network</div>
                    <div className="font-mono text-sm">{projectData.network}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">Contract Address</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-sm">
                        {projectData.contractAddress}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(projectData.contractAddress)
                          toast({ title: "Copied!", description: "Contract address copied to clipboard" })
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Share */}
              <Card className="border-border/40 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-base">Share Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 bg-transparent"
                      onClick={() => handleShare("twitter")}
                    >
                      <Twitter className="h-4 w-4" />
                      Tweet
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 bg-transparent"
                      onClick={() => handleShare("copy")}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 bg-transparent"
                      onClick={() => handleShare("discord")}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Funding */}
              <Card className="border-border/40 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-base">Support This Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <div className="mb-1 text-sm text-muted-foreground">Total Funded</div>
                    <div className="text-2xl font-bold text-primary">${projectData.funded.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">USDC</div>
                  </div>
                  <div className="space-y-3">
                    <Input
                      type="number"
                      placeholder="Amount in USDC"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                    />
                    <Button className="w-full gap-2" onClick={handleDonate}>
                      <DollarSign className="h-4 w-4" />
                      Send USDC
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Connect your wallet to support this project
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Rating */}
              <Card className="border-border/40 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-base">Rate This Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="mb-2 text-3xl font-bold">{projectData.rating}</div>
                    <StarRating value={projectData.rating} readonly size="lg" />
                    <div className="mt-2 text-sm text-muted-foreground">{projectData.totalRatings} ratings</div>
                  </div>
                  <div className="border-t border-border/40 pt-4">
                    <div className="mb-3 text-sm font-medium">Your Rating</div>
                    <div className="flex justify-center">
                      <StarRating value={userRating} onChange={handleRating} size="lg" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <Toaster />
    </div>
  )
}
