"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Search, Star, Shield, Github, Twitter, Linkedin, Share2 } from "lucide-react"
import { projectsAPI } from "@/lib/api/client"
import type { ProjectWithAggregates } from "@/packages/shared"
import { useToast } from "@/hooks/use-toast"

export default function ExplorePage() {
  const [projects, setProjects] = useState<ProjectWithAggregates[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [sortBy, setSortBy] = useState<'newest' | 'top_rated' | 'most_funded'>('newest')
  const { toast } = useToast()

  const categories = ["DeFi", "NFT", "Gaming", "DAO", "Infrastructure", "Social", "Tools", "Other"]

  useEffect(() => {
    loadProjects()
  }, [selectedCategory, sortBy, searchQuery])

  async function loadProjects() {
    try {
      setIsLoading(true)
      const response = await projectsAPI.list({
        category: selectedCategory || undefined,
        sort: sortBy,
        q: searchQuery || undefined,
        limit: 50,
        offset: 0,
      })
      setProjects(response.projects)
    } catch (error: any) {
      console.error('Error loading projects:', error)
      const errorMessage = error.message || error.error || "Failed to load projects"
      const isDbError = errorMessage.includes('Database') || errorMessage.includes('migrations')
      
      toast({
        title: isDbError ? "Database Setup Required" : "Error loading projects",
        description: isDbError 
          ? "Please apply database migrations in Supabase. See docs/supabase/APPLY_MIGRATIONS.md"
          : errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadProjects()
  }

  function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  function formatUSDC(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold">Explore Projects</h1>
            <p className="text-lg text-muted-foreground">
              Discover innovative blockchain projects on Arc Network
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="top_rated">Top Rated</option>
                  <option value="most_funded">Most Funded</option>
                </select>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects found</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}`}>
                  <Card className="group h-full cursor-pointer transition-all hover:shadow-lg">
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                      {project.image_url ? (
                        <img
                          src={project.image_url}
                          alt={project.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                      {project.nft_token_id && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary/90">
                            <Shield className="mr-1 h-3 w-3" />
                            Certified
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h3 className="mb-1 text-lg font-semibold group-hover:text-primary">
                            {project.name}
                          </h3>
                          <Badge variant="outline">{project.category}</Badge>
                        </div>
                      </div>
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">
                              {project.rating_agg?.avg_stars.toFixed(1) || "0.0"}
                            </span>
                            <span className="text-muted-foreground">
                              ({project.rating_agg?.ratings_count || 0})
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {formatUSDC(Number(project.funding_agg?.total_usdc || 0))} funded
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatAddress(project.owner_wallet)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
