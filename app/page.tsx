"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import {
  ArrowRight,
  CheckCircle2,
  Star,
  DollarSign,
  Shield,
  Sparkles,
  Zap,
  Users,
  ExternalLink,
  ChevronDown,
} from "lucide-react"
import { projectsAPI } from "@/lib/api/client"
import type { ProjectWithAggregates } from "@/packages/shared"

export default function LandingPage() {
  const [featuredProjects, setFeaturedProjects] = useState<ProjectWithAggregates[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      loadFeaturedProjects()
    }
  }, [])

  async function loadFeaturedProjects() {
    try {
      setIsLoadingProjects(true)
      const response = await projectsAPI.list({
        sort: "newest",
        limit: 3,
        offset: 0,
      })
      setFeaturedProjects(response.projects || [])
    } catch {
      setFeaturedProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }

  function formatUSDC(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const steps = [
    {
      step: "01",
      title: "Submit",
      desc: "Share your project details, blockchain info, and vision with the community",
      icon: Zap,
    },
    {
      step: "02",
      title: "Review",
      desc: "Our curators carefully evaluate your submission for quality and legitimacy",
      icon: Shield,
    },
    {
      step: "03",
      title: "Certify",
      desc: "Approved projects receive an on-chain NFT certificate as proof of verification",
      icon: CheckCircle2,
    },
    {
      step: "04",
      title: "Grow",
      desc: "Get discovered, earn ratings, receive funding, and build community support",
      icon: Users,
    },
  ]

  const features = [
    {
      icon: Shield,
      title: "NFT Certification",
      desc: "Approved projects receive an on-chain NFT certificate that serves as a verifiable badge of trust",
      gradient: "from-primary/20 to-transparent",
    },
    {
      icon: Star,
      title: "Community Ratings",
      desc: "Users rate projects from 1-5 stars, creating transparent quality signals for the ecosystem",
      gradient: "from-accent/20 to-transparent",
    },
    {
      icon: DollarSign,
      title: "Direct Funding",
      desc: "Support projects you believe in with USDC donations directly to their wallet",
      gradient: "from-chart-3/20 to-transparent",
    },
    {
      icon: CheckCircle2,
      title: "Curated Quality",
      desc: "Every project is reviewed by curators to ensure quality, legitimacy, and community value",
      gradient: "from-chart-4/20 to-transparent",
    },
    {
      icon: Sparkles,
      title: "Project Dashboard",
      desc: "Track submissions, view approval status, manage settings, and monitor your project metrics",
      gradient: "from-primary/20 to-transparent",
    },
    {
      icon: ExternalLink,
      title: "Social Presence",
      desc: "Showcase your project with links to Twitter, GitHub, Discord, and other platforms",
      gradient: "from-accent/20 to-transparent",
    },
  ]

  const faqs = [
    {
      id: "approval-nft",
      q: "What does the approval NFT mean?",
      a: "The approval NFT is an on-chain certificate that verifies your project has been reviewed and approved by Arc Index curators. It serves as a permanent, verifiable badge of trust that the community can rely on when evaluating projects.",
    },
    {
      id: "resubmit",
      q: "Can I resubmit after rejection?",
      a: "Absolutely! If your project is rejected, you'll receive detailed feedback explaining why. You can address the issues and resubmit your project for another review. Many successful projects were approved on their second or third attempt.",
    },
    {
      id: "rate-fund",
      q: "Who can rate and fund projects?",
      a: "Anyone with a connected wallet can participate. Rate projects from 1-5 stars to help others discover quality, and send USDC directly to support projects you believe in. Your ratings contribute to the project's overall reputation.",
    },
    {
      id: "certification-process",
      q: "How does the certification process work?",
      a: "After submission, curators review your project for legitimacy, quality, and community value. This includes verifying team information, checking smart contract security, and evaluating the project's potential contribution to the Arc ecosystem.",
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Global background effects */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-background" />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] animate-glow-pulse" />
        <div className="absolute top-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[100px] animate-glow-pulse delay-700" />
        <div className="absolute bottom-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[80px] animate-glow-pulse delay-300" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-40" />

        {/* Noise texture */}
        <div className="absolute inset-0 noise" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--background)_70%)]" />
      </div>

      <Navigation />

      {/* Hero Section */}
      <section className="relative px-4 pt-32 pb-24 sm:px-6 lg:px-8 lg:pt-40 lg:pb-32">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="animate-fade-in-down animate-initial mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-primary">Live on ARC Testnet</span>
          </div>

          {/* Main headline */}
          <h1 className="animate-fade-in-up animate-initial delay-100 mb-6 font-display text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
            <span className="text-gradient-animated">Discover</span>
            <br />
            <span className="text-foreground">the Future of</span>
            <br />
            <span className="text-foreground">Arc Network</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in-up animate-initial delay-200 mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl lg:text-2xl">
            The curated project index for Arc Network. Discover, certify, and support innovative blockchain projects with on-chain NFT verification.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in-up animate-initial delay-300 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="group h-14 gap-3 rounded-xl px-8 text-lg font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
              <Link href="/explore">
                Explore Projects
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 gap-3 rounded-xl border-border/60 bg-card/50 px-8 text-lg font-semibold backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <Link href="/submit">Submit a Project</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="animate-fade-in-up animate-initial delay-400 mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Curated Quality</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">On-Chain Certified</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Community Rated</span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              How It Works
            </Badge>
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              From Submission to Success
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              A streamlined process that connects blockchain innovators with the Arc Network community
            </p>
          </div>

          <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Connection line */}
            <div className="absolute left-0 right-0 top-[60px] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

            {steps.map((item, index) => (
              <div key={item.step} className="group relative">
                <Card className="relative h-full overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-500 hover:border-primary/40 hover:bg-card/60">
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <CardContent className="relative p-6 lg:p-8">
                    {/* Step number with icon */}
                    <div className="relative mb-6 flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 transition-all duration-500 group-hover:bg-primary/20 group-hover:ring-primary/40">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-mono text-4xl font-bold text-muted-foreground/30 transition-colors group-hover:text-primary/40">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="mb-3 font-display text-xl font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>

                {/* Arrow connector (visible on large screens) */}
                {index < steps.length - 1 && (
                  <div className="absolute -right-3 top-[60px] z-10 hidden lg:block">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        {/* Section background accent */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/5 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4 border-accent/30 bg-accent/5 text-accent">
              Features
            </Badge>
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything You Need to Succeed
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Powerful tools to showcase and support Arc Network projects
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover-lift"
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />

                <CardContent className="relative p-6 lg:p-8">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-all duration-500 group-hover:bg-primary/20 group-hover:ring-primary/40 group-hover:scale-110">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
                Projects
              </Badge>
              <h2 className="mb-2 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Featured Projects
              </h2>
              <p className="text-lg text-muted-foreground">
                Discover trending projects building on Arc Network
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2 border-border/60 bg-card/50 backdrop-blur-sm hover:border-primary/50">
              <Link href="/explore">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoadingProjects ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border-border/40 bg-card/40">
                  <div className="aspect-video animate-pulse bg-muted/50" />
                  <CardContent className="p-6">
                    <div className="mb-3 h-5 w-3/4 animate-pulse rounded-md bg-muted/50" />
                    <div className="mb-4 h-4 w-full animate-pulse rounded-md bg-muted/50" />
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-20 animate-pulse rounded-full bg-muted/50" />
                      <div className="h-5 w-16 animate-pulse rounded-md bg-muted/50" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredProjects.length === 0 ? (
            <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">No Projects Yet</h3>
                <p className="mb-6 max-w-sm text-muted-foreground">
                  Be the first to submit a project and showcase your work to the Arc Network community.
                </p>
                <Button asChild className="gap-2">
                  <Link href="/submit">
                    Submit a Project
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredProjects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}`}>
                  <Card className="group h-full overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-500 hover:border-primary/40 hover-lift">
                    {/* Image */}
                    <div className="relative aspect-video overflow-hidden">
                      {project.image_url ? (
                        <img
                          src={project.image_url}
                          alt={project.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted/30">
                          <Sparkles className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />

                      {/* Certified badge */}
                      {project.nft_token_id && (
                        <div className="absolute right-3 top-3">
                          <Badge className="gap-1.5 border-primary/30 bg-primary/90 text-primary-foreground shadow-lg">
                            <Shield className="h-3 w-3" />
                            Certified
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-6">
                      <div className="mb-3">
                        <h3 className="mb-1.5 font-display text-lg font-semibold tracking-tight line-clamp-1 transition-colors group-hover:text-primary">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      </div>

                      <div className="mb-4">
                        <Badge variant="secondary" className="bg-secondary/50 text-xs font-medium">
                          {project.category}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="font-medium">
                            {project.rating_agg?.avg_stars
                              ? project.rating_agg.avg_stars.toFixed(1)
                              : "0.0"}
                          </span>
                          {project.rating_agg?.ratings_count ? (
                            <span className="text-xs text-muted-foreground/70">
                              ({project.rating_agg.ratings_count})
                            </span>
                          ) : null}
                        </div>
                        <div className="font-mono font-semibold text-primary">
                          {formatUSDC(Number(project.funding_agg?.total_usdc || 0))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              FAQ
            </Badge>
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Questions & Answers
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about Arc Index
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card
                key={faq.id}
                className={`overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-300 ${
                  openFaqIndex === i ? "border-primary/40" : "hover:border-border/60"
                }`}
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <h3 className="pr-4 font-display text-lg font-semibold tracking-tight">
                    {faq.q}
                  </h3>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-all duration-300 ${
                      openFaqIndex === i ? "bg-primary/20 rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className={`h-4 w-4 transition-colors ${openFaqIndex === i ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    openFaqIndex === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-border/40 px-6 pb-6 pt-4">
                      <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-4xl">
          <Card className="relative overflow-hidden border-primary/20 bg-card/60 backdrop-blur-sm">
            {/* Background effects */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute -left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[100px]" />
              <div className="absolute -right-1/4 bottom-0 h-[300px] w-[300px] rounded-full bg-accent/15 blur-[80px]" />
              <div className="absolute inset-0 bg-grid-sm opacity-30" />
            </div>

            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-[inherit] p-px">
              <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-r from-primary/50 via-accent/30 to-primary/50 opacity-50" />
            </div>

            <CardContent className="relative px-8 py-16 text-center sm:px-12 lg:px-16 lg:py-20">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>

              <h2 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Ready to Get Started?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
                Submit your project today and join the growing ecosystem of verified projects on Arc Network.
              </p>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="group h-14 gap-3 rounded-xl px-8 text-lg font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                  <Link href="/submit">
                    Submit Your Project
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 gap-3 rounded-xl border-border/60 bg-background/50 px-8 text-lg font-semibold backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background/80"
                >
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
