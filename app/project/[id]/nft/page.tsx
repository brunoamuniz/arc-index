"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ArrowLeft, ExternalLink, Download, Shield } from "lucide-react"
import { projectsAPI } from "@/lib/api/client"
import type { ProjectWithAggregates } from "@/packages/shared"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function NFTViewPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<ProjectWithAggregates | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const nftImageUrl = project 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/api/nft-image/${project.id}`
    : null

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    try {
      setIsLoading(true)
      const response = await projectsAPI.get(projectId)
      setProject(response.project)
    } catch (error: any) {
      console.error("Error loading project:", error)
      toast({
        title: "Error loading project",
        description: error.message || "Failed to load project",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (!nftImageUrl) return
    
    const link = document.createElement('a')
    link.href = nftImageUrl
    link.download = `arc-index-nft-${project?.name.replace(/\s+/g, '-').toLowerCase() || 'project'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download started",
      description: "NFT image is being downloaded",
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-muted-foreground">Loading NFT...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-2xl font-bold">Project not found</h1>
            <Button asChild>
              <Link href="/explore">Back to Explore</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!project.nft_token_id) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-2xl font-bold">NFT not available</h1>
            <p className="mb-6 text-muted-foreground">
              This project doesn't have an approval NFT yet.
            </p>
            <Button asChild>
              <Link href={`/project/${projectId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <Toaster />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link href={`/project/${projectId}`} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Project
            </Link>
          </Button>

          {/* NFT Display Card */}
          <Card className="mb-6 border-border/40 bg-card/50">
            <CardContent className="p-6">
              <div className="mb-6 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">Arc Index Approval NFT</span>
                </div>
                <h1 className="mb-2 text-3xl font-bold">{project.name}</h1>
                <p className="text-muted-foreground">Token ID: #{project.nft_token_id}</p>
              </div>

              {/* NFT Image */}
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <img
                    src={nftImageUrl || ''}
                    alt={`${project.name} - Arc Index Approval NFT`}
                    className="max-w-full rounded-lg border-4 border-primary/20 shadow-2xl"
                    style={{ maxWidth: '800px', width: '100%', height: 'auto' }}
                  />
                  <div className="absolute -top-2 -right-2 rounded-full bg-primary p-2">
                    <Shield className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </div>

              {/* NFT Details */}
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <Card className="border-border/40 bg-card/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Project Name</div>
                    <div className="mt-1 text-lg font-semibold">{project.name}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/40 bg-card/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Category</div>
                    <div className="mt-1 text-lg font-semibold">{project.category}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/40 bg-card/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Project ID</div>
                    <div className="mt-1 text-lg font-semibold">#{project.project_id || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/40 bg-card/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Approval Date</div>
                    <div className="mt-1 text-lg font-semibold">
                      {new Date(project.updated_at || project.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-center gap-4">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download NFT Image
                </Button>
                <Button variant="outline" asChild className="gap-2">
                  <Link href={`/project/${projectId}`}>
                    <ExternalLink className="h-4 w-4" />
                    View Project
                  </Link>
                </Button>
                {project.nft_contract_address && (
                  <Button variant="outline" asChild className="gap-2">
                    <a
                      href={`https://testnet.arcscan.app/address/${project.nft_contract_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Explorer
                    </a>
                  </Button>
                )}
              </div>

              {/* Description */}
              <div className="mt-6 rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  This NFT certifies that <strong>{project.name}</strong> has been reviewed and approved by Arc Index curators. 
                  It serves as an on-chain verification badge that proves the project has met our quality standards.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}

