"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { reviewAPI, projectsAPI } from "@/lib/api/client"
import type { Submission } from "@/packages/shared"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/lib/wallet/hooks"
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'Submitted' | 'Approved' | 'Rejected'>('Submitted')
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingSubmissionId, setRejectingSubmissionId] = useState<string | null>(null)
  const [rejectReasonText, setRejectReasonText] = useState("")
  const { toast } = useToast()
  const { isConnected, address } = useWallet()

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
    </div>
  )
}

