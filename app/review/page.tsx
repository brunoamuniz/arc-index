"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { reviewAPI, projectsAPI } from "@/lib/api/client"
import { useUserRole } from "@/lib/auth/use-user-role"
import type { Submission } from "@/packages/shared"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/lib/wallet/hooks"
import { CheckCircle2, XCircle, Clock, ExternalLink, Edit } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function ReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'Submitted' | 'Approved' | 'Rejected'>('Submitted')
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingSubmissionId, setRejectingSubmissionId] = useState<string | null>(null)
  const [rejectReasonText, setRejectReasonText] = useState("")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    full_description: '',
    category: '',
    website_url: '',
    x_url: '',
    github_url: '',
    linkedin_url: '',
    discord_url: '',
    discord_username: '',
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const { isConnected, address } = useWallet()
  const { isCuratorOrAdmin } = useUserRole()

  useEffect(() => {
    if (isConnected) {
      loadSubmissions()
    }
  }, [statusFilter, isConnected])

  async function loadSubmissions() {
    try {
      setIsLoading(true)
      const response = await reviewAPI.listSubmissions({ status: statusFilter })
      
      // Log for debugging
      console.log('Submissions loaded:', {
        count: response.submissions?.length || 0,
        status: statusFilter,
        submissions: response.submissions,
      });
      
      setSubmissions(response.submissions || [])
    } catch (error: any) {
      // Extract error information safely - handle both APIError and regular Error
      const errorStatus = error?.status || error?.statusCode || (error instanceof Error ? 'unknown' : 'unknown');
      const errorMessage = error?.message || error?.error || error?.toString?.() || "Failed to load submissions";
      const errorDetails = error?.details || error?.responseData?.details || '';
      
      // Log full error information for debugging
      const errorInfo: Record<string, unknown> = {
        errorType: error?.constructor?.name || typeof error,
        isAPIError: error?.name === 'APIError',
        status: errorStatus,
        message: errorMessage,
        details: errorDetails,
        errorKeys: error ? Object.keys(error) : [],
        errorString: error?.toString?.() || String(error),
        errorName: error?.name,
      };
      
      // Add stack if available
      if (error?.stack) {
        errorInfo.errorStack = error.stack;
      }
      
      // Add responseData if available
      if (error?.responseData) {
        errorInfo.responseData = error.responseData;
      }
      
      // Try to stringify the error
      try {
        errorInfo.errorJSON = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorInfo.errorJSON = 'Could not stringify error';
      }
      
      // Add all enumerable properties
      if (error) {
        for (const key in error) {
          if (Object.prototype.hasOwnProperty.call(error, key)) {
            errorInfo[`error_${key}`] = (error as any)[key];
          }
        }
      }
      
      console.error("Error loading submissions - Full Details:", errorInfo);
      
      // Handle specific error cases
      if (errorStatus === 403 || errorMessage?.includes('Access denied') || errorMessage?.includes('Forbidden')) {
        toast({
          title: "Access Denied",
          description: errorDetails || "You need to be a curator or admin to view submissions. Contact an administrator to get curator access.",
          variant: "destructive",
        })
      } else if (errorStatus === 401 || errorMessage?.includes('Authentication') || errorMessage?.includes('Unauthorized')) {
        toast({
          title: "Authentication required",
          description: "Please connect your wallet and sign in to view submissions.",
          variant: "destructive",
        })
      } else {
        // Show more detailed error message
        let description = errorMessage;
        if (errorDetails) {
          description += `\n\n${errorDetails}`;
        }
        if (errorStatus === 403) {
          description += "\n\n💡 Dica: Se você acabou de ter seu role atualizado para 'curator', faça logout e login novamente para atualizar sua sessão.";
        }
        
        toast({
          title: "Error loading submissions",
          description: description || "An unexpected error occurred. Please check the console for details.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApprove(submissionId: string) {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to approve projects",
        variant: "destructive",
      })
      return
    }

    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    try {
      setIsApproving(submissionId)
      const response = await reviewAPI.approve(submissionId)
      
      toast({
        title: "Project approved",
        description: "The project has been approved. The owner or curator can now register it on-chain to enable ratings and funding.",
      })

      loadSubmissions()
    } catch (error: any) {
      console.error("Error approving:", error);
      
      // Handle authentication/authorization errors
      if (error.status === 401 || error.status === 403) {
        toast({
          title: error.status === 401 ? "Authentication required" : "Access denied",
          description: error.details || error.message || (error.status === 401 
            ? "Please connect your wallet and sign in." 
            : "You need curator or admin role to approve projects."),
          variant: "destructive",
        });
        return;
      }
      
      // Handle other errors
      const errorMessage = error.details 
        ? `${error.message || "Failed to approve project"}\n\n${error.details}`
        : error.message || error.error || "Failed to approve project";
      
      toast({
        title: "Approval failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsApproving(null);
    }
  }

  function openRejectDialog(submissionId: string) {
    setRejectingSubmissionId(submissionId)
    setRejectReasonText("")
    setRejectDialogOpen(true)
  }

  async function handleReject() {
    if (!rejectingSubmissionId || !rejectReasonText) {
      toast({
        title: "Missing information",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      })
      return
    }

    try {
      await reviewAPI.reject(rejectingSubmissionId, {
        reasonCode: "", // Empty code, only text is required
        reasonText: rejectReasonText,
      })
      toast({
        title: "Project rejected",
        description: "Project has been rejected",
      })
      setRejectDialogOpen(false)
      setRejectingSubmissionId(null)
      setRejectReasonText("")
      loadSubmissions()
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject project",
        variant: "destructive",
      })
    }
  }

  // Validate URL fields
  function validateUrl(url: string): string | null {
    if (!url || url.trim() === '') return null;
    const trimmed = url.trim();
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  // Validate form before submission
  function validateForm(): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!editFormData.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!editFormData.description.trim()) {
      errors.description = 'Short description is required';
    }
    if (!editFormData.category.trim()) {
      errors.category = 'Category is required';
    }
    if (!editFormData.website_url.trim()) {
      errors.website_url = 'Website URL is required';
    } else {
      const validUrl = validateUrl(editFormData.website_url);
      if (!validUrl) {
        errors.website_url = 'Please enter a valid website URL (e.g., https://example.com)';
      }
    }

    if (editFormData.x_url.trim()) {
      const validUrl = validateUrl(editFormData.x_url);
      if (!validUrl) {
        errors.x_url = 'Please enter a valid Twitter URL (e.g., https://x.com/username)';
      }
    }
    if (editFormData.github_url.trim()) {
      const validUrl = validateUrl(editFormData.github_url);
      if (!validUrl) {
        errors.github_url = 'Please enter a valid GitHub URL (e.g., https://github.com/username)';
      }
    }
    if (editFormData.linkedin_url.trim()) {
      const validUrl = validateUrl(editFormData.linkedin_url);
      if (!validUrl) {
        errors.linkedin_url = 'Please enter a valid LinkedIn URL (e.g., https://linkedin.com/company/name)';
      }
    }
    if (editFormData.discord_url.trim()) {
      const validUrl = validateUrl(editFormData.discord_url);
      if (!validUrl) {
        errors.discord_url = 'Please enter a valid Discord URL (e.g., https://discord.gg/invite)';
      }
    }

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  function openEditDialog(projectId: string, project: any) {
    setEditingProjectId(projectId)
    setEditFormData({
      name: project.name || '',
      description: project.description || '',
      full_description: project.full_description || '',
      category: project.category || '',
      website_url: project.website_url || '',
      x_url: project.x_url || '',
      github_url: project.github_url || '',
      linkedin_url: project.linkedin_url || '',
      discord_url: project.discord_url || '',
      discord_username: project.discord_username || '',
    })
    setValidationErrors({}) // Clear validation errors
    setEditDialogOpen(true)
  }

  async function handleAdminEdit() {
    if (!editingProjectId) return

    // Validate form before submitting
    const validation = validateForm();
    if (!validation.isValid) {
      // Get list of fields with errors from the validation result
      const errorFields = Object.keys(validation.errors);
      const errorMessages = errorFields.map(field => {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${fieldName}: ${validation.errors[field]}`;
      });
      
      toast({
        title: "Validation error",
        description: errorMessages.length > 0 
          ? errorMessages.join('\n')
          : "Please fix the errors in the form before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true)
      
      // Normalize empty strings to null for optional fields
      const normalizeUrl = (url: string) => {
        const trimmed = url.trim();
        if (trimmed === '') return null;
        try {
          new URL(trimmed);
          return trimmed;
        } catch {
          return null;
        }
      }
      
      // Prepare update data - include all fields that are provided
      const updateData: Record<string, string | null> = {}
      if (editFormData.name) updateData.name = editFormData.name
      if (editFormData.description) updateData.description = editFormData.description
      if (editFormData.full_description !== undefined) {
        updateData.full_description = normalizeUrl(editFormData.full_description)
      }
      if (editFormData.category) updateData.category = editFormData.category
      if (editFormData.website_url !== undefined) {
        updateData.website_url = normalizeUrl(editFormData.website_url)
      }
      if (editFormData.x_url !== undefined) {
        updateData.x_url = normalizeUrl(editFormData.x_url)
      }
      if (editFormData.github_url !== undefined) {
        updateData.github_url = normalizeUrl(editFormData.github_url)
      }
      if (editFormData.linkedin_url !== undefined) {
        updateData.linkedin_url = normalizeUrl(editFormData.linkedin_url)
      }
      if (editFormData.discord_url !== undefined) {
        updateData.discord_url = normalizeUrl(editFormData.discord_url)
      }
      // discord_username is not a URL, just normalize empty strings to null
      if (editFormData.discord_username !== undefined) {
        const trimmed = editFormData.discord_username.trim()
        updateData.discord_username = trimmed === '' ? null : trimmed
      }

      await projectsAPI.adminUpdate(editingProjectId, updateData)
      
      toast({
        title: "Project updated",
        description: "The project has been updated successfully",
      })
      
      setEditDialogOpen(false)
      setEditingProjectId(null)
      setValidationErrors({}) // Clear validation errors on success
      loadSubmissions() // Reload to show updated data
    } catch (error: any) {
      console.error("Error updating project:", error)
      
      // Check if it's a validation error from the backend
      if (error?.responseData?.details && Array.isArray(error.responseData.details)) {
        const backendErrors: Record<string, string> = {};
        error.responseData.details.forEach((err: any) => {
          if (err.path && err.path.length > 0) {
            backendErrors[err.path[0]] = err.message || 'Invalid value';
          }
        });
        setValidationErrors(backendErrors);
        
        // Show specific error messages
        const errorFields = Object.keys(backendErrors);
        const errorMessages = errorFields.map(field => {
          const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `${fieldName}: ${backendErrors[field]}`;
        });
        
        toast({
          title: "Validation error",
          description: errorMessages.length > 0 
            ? errorMessages.join('\n')
            : "Please check the form for errors",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating project",
          description: error.message || "Failed to update project",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-2xl font-bold">Curator Dashboard</h1>
            <p className="text-muted-foreground">Please connect your wallet to access the curator dashboard</p>
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
          <div className="mb-8">
            <h1 className="mb-4 text-3xl font-bold">Curator Dashboard</h1>
            <p className="text-muted-foreground">Review and manage project submissions</p>
          </div>

          {/* Status Filter */}
          <div className="mb-6 flex gap-2">
            <Button
              variant={statusFilter === 'Submitted' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('Submitted')}
            >
              <Clock className="mr-2 h-4 w-4" />
              Pending
            </Button>
            <Button
              variant={statusFilter === 'Approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('Approved')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approved
            </Button>
            <Button
              variant={statusFilter === 'Rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('Rejected')}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rejected
            </Button>
          </div>

          {/* Submissions List */}
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No {statusFilter.toLowerCase()} submissions found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => {
                // Supabase returns joined data as arcindex_projects (table name)
                const project = (submission as any).arcindex_projects;
                
                // Log for debugging
                if (process.env.NODE_ENV === 'development' && !project) {
                  console.warn('Submission without project:', {
                    submissionId: submission.id,
                    submissionKeys: Object.keys(submission),
                    submission: submission,
                  });
                }
                
                if (!project) {
                  console.error('Submission missing project data:', submission);
                  return null;
                }

                return (
                  <Card key={submission.id} className="border-border/40 bg-card/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="mb-2">{project.name}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{project.category}</Badge>
                            <Badge variant="outline">
                              Version {submission.version}
                            </Badge>
                            {submission.submitted_at && (
                              <Badge variant="outline">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            submission.status === 'Approved'
                              ? 'default'
                              : submission.status === 'Rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {submission.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-2 text-sm font-medium text-foreground">
                        {project.description}
                      </p>
                      {project.full_description && (
                        <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                          {project.full_description}
                        </p>
                      )}

                      {submission.review_reason_text && (
                        <div className="mb-4 rounded-lg border border-border/40 bg-muted/50 p-3">
                          <p className="text-sm font-medium">Review Reason:</p>
                          <p className="text-sm text-muted-foreground">{submission.review_reason_text}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/project/${project.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Project
                          </Link>
                        </Button>
                        {isCuratorOrAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(project.id, project)}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        {submission.status === 'Submitted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(submission.id)}
                              disabled={isApproving === submission.id}
                              className="gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {isApproving === submission.id ? "Approving..." : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(submission.id)}
                              className="gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Reject Project Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Project</DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this project submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReasonText">Rejection Reason *</Label>
              <Textarea
                id="rejectReasonText"
                placeholder="Provide a detailed explanation for the rejection..."
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                A detailed explanation that will be shown to the project owner
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectReasonText("")
                setRejectingSubmissionId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReasonText.trim()}
            >
              Reject Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project (Admin)</DialogTitle>
            <DialogDescription>
              Make changes to the project details. All changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Short Description *</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Short description (max 400 characters)"
                rows={3}
                maxLength={400}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-full-description">Full Description</Label>
              <Textarea
                id="edit-full-description"
                value={editFormData.full_description}
                onChange={(e) => setEditFormData({ ...editFormData, full_description: e.target.value })}
                placeholder="Full description (max 5000 characters)"
                rows={6}
                maxLength={5000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Input
                id="edit-category"
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                placeholder="Category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website URL *</Label>
              <Input
                id="edit-website"
                type="url"
                value={editFormData.website_url}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, website_url: e.target.value });
                  if (validationErrors.website_url) {
                    setValidationErrors({ ...validationErrors, website_url: '' });
                  }
                }}
                placeholder="https://example.com"
                className={validationErrors.website_url ? "border-destructive" : ""}
              />
              {validationErrors.website_url && (
                <p className="text-sm text-destructive">{validationErrors.website_url}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-x">Twitter URL</Label>
                <Input
                  id="edit-x"
                  type="url"
                  value={editFormData.x_url}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, x_url: e.target.value });
                    if (validationErrors.x_url) {
                      setValidationErrors({ ...validationErrors, x_url: '' });
                    }
                  }}
                  placeholder="https://x.com/username"
                  className={validationErrors.x_url ? "border-destructive" : ""}
                />
                {validationErrors.x_url && (
                  <p className="text-sm text-destructive">{validationErrors.x_url}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-github">GitHub URL</Label>
                <Input
                  id="edit-github"
                  type="url"
                  value={editFormData.github_url}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, github_url: e.target.value });
                    if (validationErrors.github_url) {
                      setValidationErrors({ ...validationErrors, github_url: '' });
                    }
                  }}
                  placeholder="https://github.com/username"
                  className={validationErrors.github_url ? "border-destructive" : ""}
                />
                {validationErrors.github_url && (
                  <p className="text-sm text-destructive">{validationErrors.github_url}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-linkedin">LinkedIn URL</Label>
                <Input
                  id="edit-linkedin"
                  type="url"
                  value={editFormData.linkedin_url}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, linkedin_url: e.target.value });
                    if (validationErrors.linkedin_url) {
                      setValidationErrors({ ...validationErrors, linkedin_url: '' });
                    }
                  }}
                  placeholder="https://linkedin.com/company/name"
                  className={validationErrors.linkedin_url ? "border-destructive" : ""}
                />
                {validationErrors.linkedin_url && (
                  <p className="text-sm text-destructive">{validationErrors.linkedin_url}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discord-url">Discord URL</Label>
                <Input
                  id="edit-discord-url"
                  type="url"
                  value={editFormData.discord_url}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, discord_url: e.target.value });
                    if (validationErrors.discord_url) {
                      setValidationErrors({ ...validationErrors, discord_url: '' });
                    }
                  }}
                  placeholder="https://discord.gg/invite"
                  className={validationErrors.discord_url ? "border-destructive" : ""}
                />
                {validationErrors.discord_url && (
                  <p className="text-sm text-destructive">{validationErrors.discord_url}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Leave empty to remove. Must be a valid URL (e.g., https://discord.gg/invite)
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discord-username">Discord Username</Label>
              <Input
                id="edit-discord-username"
                value={editFormData.discord_username}
                onChange={(e) => setEditFormData({ ...editFormData, discord_username: e.target.value })}
                placeholder="username#1234"
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setEditingProjectId(null)
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdminEdit}
              disabled={isSaving || !editFormData.name || !editFormData.description || !editFormData.category || !editFormData.website_url}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

