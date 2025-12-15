"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { AlertCircle, CheckCircle2, Clock, Edit, FileText, Plus, Shield, XCircle, Calendar, Eye, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { myProjectsAPI, projectsAPI } from "@/lib/api/client"
import type { ProjectWithAggregates } from "@/packages/shared"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/lib/wallet/hooks"

const statusConfig = {
  Draft: {
    label: "Draft",
    icon: FileText,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
  },
  Submitted: {
    label: "Pending Review",
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  Approved: {
    label: "Approved",
    icon: CheckCircle2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
  Rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
  },
}

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithAggregates[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null)
  const { toast } = useToast()
  const { isConnected } = useWallet()

  useEffect(() => {
    if (isConnected) {
      loadProjects()
    }
  }, [isConnected, selectedStatus])

  async function loadProjects() {
    try {
      setIsLoading(true)
      const response = await myProjectsAPI.list(
        selectedStatus !== "all" ? { status: selectedStatus as any } : undefined
      )
      setProjects(response.projects)
    } catch (error: any) {
      console.error("Error loading projects:", error)
      toast({
        title: "Error loading projects",
        description: error.message || "Failed to load your projects",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString()
  }

  function handleDeleteClick(projectId: string, projectName: string) {
    setProjectToDelete({ id: projectId, name: projectName })
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!projectToDelete) return

    try {
      setDeletingProjectId(projectToDelete.id)
      setDeleteDialogOpen(false)
      await projectsAPI.delete(projectToDelete.id)
      toast({
        title: "Project deleted",
        description: "The project has been deleted and will no longer appear on Arc Index.",
      })
      // Reload projects
      loadProjects()
    } catch (error: any) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error deleting project",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      })
    } finally {
      setDeletingProjectId(null)
      setProjectToDelete(null)
    }
  }

  const statusCounts = {
    all: projects.length,
    Draft: projects.filter((p) => p.status === "Draft").length,
    Submitted: projects.filter((p) => p.status === "Submitted").length,
    Approved: projects.filter((p) => p.status === "Approved").length,
    Rejected: projects.filter((p) => p.status === "Rejected").length,
  }

  const filteredProjects =
    selectedStatus === "all" ? projects : projects.filter((p) => p.status === selectedStatus)

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Connect your wallet</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Please connect your wallet to view your projects
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">My Projects</h1>
              <p className="text-muted-foreground">Manage your submitted and draft projects</p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/submit">
                <Plus className="h-4 w-4" />
                Submit New Project
              </Link>
            </Button>
          </div>

          {/* Status Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant={selectedStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus("all")}
            >
              All Projects ({statusCounts.all})
            </Button>
            {Object.entries(statusConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedStatus === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(key)}
              >
                {config.label} ({statusCounts[key as keyof typeof statusCounts]})
              </Button>
            ))}
          </div>

          {/* Projects List */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="border-border/40 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No projects found</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  {selectedStatus === "all"
                    ? "You haven't submitted any projects yet"
                    : `No ${statusConfig[selectedStatus as keyof typeof statusConfig]?.label.toLowerCase()} projects`}
                </p>
                <Button asChild>
                  <Link href="/submit">Submit Your First Project</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => {
                const config = statusConfig[project.status as keyof typeof statusConfig]
                const StatusIcon = config.icon

                return (
                  <Card
                    key={project.id}
                    className={`overflow-hidden border-border/40 bg-card/50 ${config.borderColor}`}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* Image */}
                        <div className="aspect-video sm:aspect-square w-full sm:w-48 shrink-0 overflow-hidden">
                          {project.image_url ? (
                            <img
                              src={project.image_url}
                              alt={project.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col justify-between p-6">
                          <div className="mb-4">
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="mb-1 text-xl font-semibold">{project.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                              </div>
                              <Badge variant="outline" className={`gap-1.5 ${config.bgColor} ${config.color}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {project.category}
                              </Badge>
                              {project.status === "Approved" && project.nft_token_id && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-primary/30 bg-primary/10 text-xs text-primary"
                                >
                                  <Shield className="h-3 w-3" />
                                  Certified
                                </Badge>
                              )}
                            </div>
                            
                            {/* Rejection Reason */}
                            {project.status === "Rejected" && (project as any).latest_submission?.review_reason_text && (
                              <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  Rejection Reason
                                </div>
                                <p className="text-sm text-destructive/90">
                                  {(project as any).latest_submission.review_reason_text}
                                </p>
                                {(project as any).latest_submission.reviewed_at && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Reviewed on: {formatDate((project as any).latest_submission.reviewed_at)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Dates and Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              {project.status === "Draft" && project.updated_at && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Last edited: {formatDate(project.updated_at)}
                                </div>
                              )}
                              {project.created_at && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Created: {formatDate(project.created_at)}
                                </div>
                              )}
                              {project.status === "Approved" && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                  Approved
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {/* View Details (for approved and rejected projects) */}
                              {(project.status === "Approved" || project.status === "Rejected") && (
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/project/${project.id}`} className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    {project.status === "Approved" ? "View Live" : "View Project"}
                                  </Link>
                                </Button>
                              )}

                              {/* Edit (for draft or pending review only) */}
                              {(project.status === "Draft" || project.status === "Submitted") && (
                                <Button asChild size="sm" variant="outline" className="gap-2 bg-transparent">
                                  <Link href={`/submit?edit=${project.id}`}>
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Link>
                                </Button>
                              )}

                              {/* Delete (available for approved and rejected projects, or any project owner) */}
                              {(project.status === "Approved" || project.status === "Rejected" || project.status === "Draft" || project.status === "Submitted") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(project.id, project.name)}
                                disabled={deletingProjectId === project.id}
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingProjectId === project.id ? "Deleting..." : "Delete"}
                              </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Info Cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6">
                <Clock className="mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Review Time</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Projects typically take 3-5 business days to review. You'll be notified once a decision is made.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6">
                <Shield className="mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">NFT Certificate</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Approved projects receive an on-chain NFT certificate badge that verifies authenticity.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6">
                <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Resubmissions</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If rejected, you can address the feedback and resubmit your project for another review.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone and the project will no longer appear on Arc Index.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  )
}
