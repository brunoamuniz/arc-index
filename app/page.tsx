import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ArrowRight, CheckCircle2, Star, DollarSign, Shield, Sparkles } from "lucide-react"

export default function LandingPage() {
  const featuredProjects = [
    {
      name: "DeFi Protocol",
      description: "Next-generation automated market maker",
      category: "DeFi",
      rating: 4.8,
      funded: 15000,
      image: "/defi-protocol-blockchain.jpg",
    },
    {
      name: "NFT Marketplace",
      description: "Curated digital art trading platform",
      category: "NFT",
      rating: 4.6,
      funded: 12000,
      image: "/nft-marketplace-digital.jpg",
    },
    {
      name: "GameFi Platform",
      description: "Play-to-earn gaming ecosystem",
      category: "Gaming",
      rating: 4.9,
      funded: 20000,
      image: "/gamefi-platform-gaming.jpg",
    },
  ]

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-mono">
            <Sparkles className="h-4 w-4 text-primary" />
            Built on ARC Testnet
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight text-balance sm:text-6xl lg:text-7xl">Arc Index</h1>
          <p className="mb-8 text-xl text-muted-foreground text-balance">
            The curated project index for Arc Network. Discover, certify, and support innovative blockchain projects
            with on-chain NFT certification.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 text-base">
              <Link href="/explore">
                Enter Arc Index
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base bg-transparent">
              <Link href="/submit">Submit a Project</Link>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Curated
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Certified
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Community-rated
            </div>
          </div>
        </div>
      </section>

      {/* What is Arc Index */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">What is Arc Index?</h2>
            <p className="text-lg text-muted-foreground text-balance">
              A platform that connects blockchain innovators with the Arc Network community
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { step: "01", title: "Submit", desc: "Share your project details and blockchain info" },
              { step: "02", title: "Review", desc: "Our curators review your submission" },
              { step: "03", title: "Approve", desc: "Get approved and receive an NFT certificate" },
              { step: "04", title: "Discover", desc: "Get ratings, funding, and community support" },
            ].map((item) => (
              <Card key={item.step} className="relative overflow-hidden border-border/40 bg-card/50">
                <CardContent className="p-6">
                  <div className="mb-4 text-4xl font-bold text-primary/30">{item.step}</div>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Key Features</h2>
            <p className="text-lg text-muted-foreground text-balance">
              Everything you need to showcase and support Arc Network projects
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "NFT Certification",
                desc: "Approved projects receive an on-chain NFT certificate badge",
              },
              {
                icon: Star,
                title: "Community Ratings",
                desc: "Users can rate projects from 1-5 stars to help others discover quality",
              },
              {
                icon: DollarSign,
                title: "USDC Support",
                desc: "Directly fund projects you believe in with USDC donations",
              },
              {
                icon: CheckCircle2,
                title: "Curated Listings",
                desc: "Every project is reviewed to ensure quality and legitimacy",
              },
              {
                icon: Sparkles,
                title: "Author Dashboard",
                desc: "Track your submissions, view status, and manage projects",
              },
              {
                icon: ArrowRight,
                title: "Social Integration",
                desc: "Link to Twitter, GitHub, Discord, and LinkedIn profiles",
              },
            ].map((feature, i) => (
              <Card key={i} className="border-border/40 bg-card/50 transition-colors hover:bg-card/80">
                <CardContent className="p-6">
                  <feature.icon className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Featured Projects</h2>
              <p className="text-lg text-muted-foreground">Discover trending projects on Arc Network</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/explore">View All</Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project, i) => (
              <Card
                key={i}
                className="group overflow-hidden border-border/40 bg-card/50 transition-all hover:border-primary/50"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={project.image || "/placeholder.svg"}
                    alt={project.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                  </div>
                  <div className="mb-4 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {project.category}
                    </Badge>
                    <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-xs text-primary">
                      <Shield className="h-3 w-3" />
                      Certified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span>{project.rating}</span>
                    </div>
                    <div className="font-mono text-primary">${project.funded.toLocaleString()} USDC</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: "What does the approval NFT mean?",
                a: "The approval NFT is an on-chain certificate that verifies your project has been reviewed and approved by Arc Index curators. It serves as a trust badge for the community.",
              },
              {
                q: "Can I resubmit after rejection?",
                a: "Yes! If your project is rejected, you'll receive feedback on why. You can address the issues and resubmit your project for another review.",
              },
              {
                q: "Who can rate and fund projects?",
                a: "Anyone with a connected wallet can rate projects (1-5 stars) and send USDC to support projects they believe in.",
              },
              {
                q: "Is the NFT transferable?",
                a: "The NFT certification badge is tied to your project and wallet address. Transfer capabilities depend on the smart contract implementation.",
              },
            ].map((faq, i) => (
              <Card key={i} className="border-border/40 bg-card/50">
                <CardContent className="p-6">
                  <h3 className="mb-3 text-lg font-semibold">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="p-12 text-center">
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Ready to get started?</h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Submit your project today and join the Arc Network ecosystem
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/submit">
                    Submit Your Project
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/explore">Explore Projects</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  )
}
