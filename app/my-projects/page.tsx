"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { AlertCircle, CheckCircle2, Clock, Edit, FileText, Plus, Shield, XCircle, Calendar, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Mock data for user projects
const mockProjects = [
  {
    id: 1,
    name: "DeFi Protocol",
    description: "Next-generation automated market maker",
    category: "DeFi",
    status: "approved",
    submittedDate: "2024-01-10",
    approvedDate: "2024-01-15",
    image: "/defi-protocol-blockchain.jpg",
  },
  {
    id: 2,
    name: "Social Network",
    description: "Decentralized social media platform",
    category: "Social",
    status: "submitted",
    submittedDate: "2024-02-01",
    image: "/social-network-web3.jpg",
  },
  {
    id: 3,
    name: "Token Launcher",
    description: "Easy token creation and deployment tool",
    category: "Tools",
    status: "rejected",
    submittedDate: "2024-01-20",
    rejectedDate: "2024-01-25",
    rejectionReason: "Incomplete",
    rejectionDetails:
      "The project submission is missing key information including the GitHub repository link and detailed technical documentation. Please provide comprehensive information about the project's architecture and implementation.",
    image: "/token-launcher-tool.jpg",
  },
  {
    id: 4,
    name: "NFT Collection Manager",
    description: "Tools for managing NFT collections",
    category: "NFT",
    status: "draft",
    lastEdited: "2024-02-05",
    image: "/nft-collection-manager.jpg",
  },
]

const statusConfig = {
  draft: {
    label: "Draft",
    icon: FileText,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
  },
  submitted: {
    label: "Pending Review",
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
  },
}

export default function MyProjectsPage() {
  const [projects] = useState(mockProjects)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

  const filteredProjects = selectedStatus === "all" ? projects : projects.filter((p) => p.status === selectedStatus)

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
              All Projects ({projects.length})
            </Button>
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = projects.filter((p) => p.status === key).length
              return (
                <Button
                  key={key}
                  variant={selectedStatus === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(key)}
                >
                  {config.label} ({count})
                </Button>
              )
            })}
          </div>

          {/* Projects List */}
          {filteredProjects.length === 0 ? (
            <Card className="border-border/40 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No projects found</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  {selectedStatus === "all"
                    ? "You haven't submitted any projects yet"
                    : `No ${statusConfig[selectedStatus as keyof typeof statusConfig].label.toLowerCase()} projects`}
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
                          <img
                            src={project.image || "/placeholder.svg"}
                            alt={project.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col justify-between p-6">
                          <div className="mb-4">
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="mb-1 text-xl font-semibold">{project.name}</h3>
                                <p className="text-sm text-muted-foreground">{project.description}</p>
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
                              {project.status === "approved" && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-primary/30 bg-primary/10 text-xs text-primary"
                                >
                                  <Shield className="h-3 w-3" />
                                  Certified
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Dates and Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              {project.status === "draft" && project.lastEdited && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Last edited: {new Date(project.lastEdited).toLocaleDateString()}
                                </div>
                              )}
                              {project.submittedDate && project.status !== "draft" && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Submitted: {new Date(project.submittedDate).toLocaleDateString()}
                                </div>
                              )}
                              {project.status === "approved" && project.approvedDate && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                  Approved: {new Date(project.approvedDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {/* View Details (for approved projects) */}
                              {project.status === "approved" && (
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/project/${project.id}`} className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    View Live
                                  </Link>
                                </Button>
                              )}

                              {/* Edit (for draft or rejected) */}
                              {(project.status === "draft" || project.status === "rejected") && (
                                <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </Button>
                              )}

                              {/* View Rejection Reason */}
                              {project.status === "rejected" && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                                      <AlertCircle className="h-4 w-4" />
                                      View Reason
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Rejection Feedback</DialogTitle>
                                      <DialogDescription className="sr-only">
                                        Details about why the project was rejected
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <div className="mb-1 text-sm font-medium">Reason</div>
                                        <Badge variant="outline" className="bg-destructive/10 text-destructive">
                                          {project.rejectionReason}
                                        </Badge>
                                      </div>
                                      <div>
                                        <div className="mb-2 text-sm font-medium">Details</div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          {project.rejectionDetails}
                                        </p>
                                      </div>
                                      {project.rejectedDate && (
                                        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                                          Rejected on {new Date(project.rejectedDate).toLocaleDateString()}
                                        </div>
                                      )}
                                      <Button className="w-full gap-2">
                                        <Edit className="h-4 w-4" />
                                        Edit and Resubmit
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}

                              {/* Resubmit (for rejected) */}
                              {project.status === "rejected" && (
                                <Button size="sm" className="gap-2">
                                  Resubmit
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

      <Footer />
    </div>
  )
}
