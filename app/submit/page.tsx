"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ChevronRight, ChevronLeft, Upload, Wallet } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWallet } from "@/lib/wallet/hooks"
import { projectsAPI } from "@/lib/api/client"

const categories = ["DeFi", "NFT", "Gaming", "DAO", "Infrastructure", "Social", "Tools", "Other"]

export default function SubmitProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isConnected, address, connect } = useWallet()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectStatus, setProjectStatus] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    shortDescription: "",
    longDescription: "",
    category: "",
    image: null as File | null,
    twitter: "",
    discord: "",
    discordUsername: "",
    github: "",
    website: "",
    linkedin: "",
    contractAddress: "",
  })

  // Load project data if in edit mode
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && isConnected) {
      setIsEditMode(true)
      setProjectId(editId)
      loadProjectData(editId)
    }
  }, [searchParams, isConnected])

  async function loadProjectData(id: string) {
    try {
      setIsLoading(true)
      const response = await projectsAPI.get(id)
      const project = response.project
      
      setProjectStatus(project.status)
      setFormData({
        name: project.name || "",
        shortDescription: project.description || "",
        longDescription: project.full_description || project.description || "", // Use full_description if available
        category: project.category || "",
        image: null,
        twitter: project.x_url || "",
        discord: project.discord_url || "",
        discordUsername: project.discord_username || "",
        github: project.github_url || "",
        website: project.website_url || "",
        linkedin: project.linkedin_url || "",
        contractAddress: project.contracts_json?.[0]?.address || "",
      })

      // If project has image, go to step 2
      if (project.image_url) {
        setStep(2)
      }
    } catch (error: any) {
      console.error("Error loading project:", error)
      toast({
        title: "Error loading project",
        description: error.message || "Failed to load project data",
        variant: "destructive",
      })
      router.push("/my-projects")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, image: e.target.files![0] }))
    }
  }

  const handleCreateOrUpdateProject = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    if (!formData.name || !formData.shortDescription || !formData.longDescription || !formData.category || !formData.website) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields including Website URL",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      if (isEditMode && projectId) {
        // Update existing project
        await projectsAPI.update(projectId, {
          name: formData.name,
          description: formData.shortDescription,
          full_description: formData.longDescription,
          category: formData.category,
          x_url: formData.twitter || undefined,
          github_url: formData.github || undefined,
          linkedin_url: formData.linkedin || undefined,
          discord_url: formData.discord || undefined,
          discord_username: formData.discordUsername || undefined,
          website_url: formData.website,
          contracts_json: formData.contractAddress
            ? [{ address: formData.contractAddress, label: "Arc Network" }]
            : [],
        })

        toast({
          title: "Project updated!",
          description: "Project details have been updated successfully",
        })

        // Move to step 2 if not already there
        if (step === 1) {
          setStep(2)
        }
      } else {
        // Create new project
        const response = await projectsAPI.create({
          name: formData.name,
          description: formData.shortDescription,
          full_description: formData.longDescription,
          category: formData.category,
          x_url: formData.twitter || undefined,
          github_url: formData.github || undefined,
          linkedin_url: formData.linkedin || undefined,
          discord_url: formData.discord || undefined,
          discord_username: formData.discordUsername || undefined,
          website_url: formData.website,
          contracts_json: formData.contractAddress
            ? [{ address: formData.contractAddress, label: "Arc Network" }]
            : [],
        })

        const createdProjectId = response.project.id
        console.log('Project created with ID:', createdProjectId)
        
        setProjectId(createdProjectId)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        toast({
          title: "Project created!",
          description: "Now upload an image and submit for review",
        })

        setStep(2)
      }
    } catch (error: any) {
      console.error("Error saving project:", error)
      const errorMessage = error.message || error.error || `Failed to ${isEditMode ? 'update' : 'create'} project`
      const errorDetails = error.details 
        ? (typeof error.details === 'string' ? error.details : JSON.stringify(error.details))
        : ''
      
      // Handle authentication errors
      if (error.status === 401 || errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
        toast({
          title: "Authentication required",
          description: "Please connect your wallet and sign in.",
          variant: "destructive",
        })
        if (!isConnected) {
          connect()
        }
        return
      }
      
      toast({
        title: `Error ${isEditMode ? 'updating' : 'creating'} project`,
        description: errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUploadImage = async () => {
    if (!projectId || !formData.image) {
      toast({
        title: "Missing image",
        description: projectId ? "Please select an image to upload" : "Project ID is missing. Please create the project first.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      // Validate project ID before making request
      if (!projectId || projectId === 'undefined' || projectId === 'null') {
        throw new Error(`Invalid project ID: ${projectId}. Please create the project first.`)
      }
      
      console.log('Uploading image for project ID:', projectId)
      console.log('Project ID type:', typeof projectId)
      console.log('Project ID value:', JSON.stringify(projectId))

      const formDataToSend = new FormData()
      formDataToSend.append("file", formData.image)

      await projectsAPI.uploadImage(String(projectId), formDataToSend)

      toast({
        title: "Image uploaded!",
        description: "Image uploaded successfully",
      })

      // Move to step 3
      setStep(3)
    } catch (error: any) {
      console.error("Error uploading image:", error)
      const errorMessage = error.message || error.error || "Failed to upload image"
      const errorDetails = error.details 
        ? (typeof error.details === 'string' ? error.details : JSON.stringify(error.details))
        : ''
      
      // Provide helpful error messages
      if (error.status === 404 || errorMessage.includes('not found')) {
        toast({
          title: "Project not found",
          description: `Project ID "${projectId}" was not found. Please create the project again.`,
          variant: "destructive",
        })
        // Reset to step 1 to recreate project
        setStep(1)
        setProjectId(null)
      } else {
        toast({
          title: "Error uploading image",
          description: errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    // Validate project ID before making request
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      toast({
        title: "No project",
        description: `Invalid project ID: ${projectId}. Please create the project first.`,
        variant: "destructive",
      })
      return
    }

    // If already submitted, don't allow resubmission
    if (projectStatus === "Submitted") {
      toast({
        title: "Already submitted",
        description: "This project is already pending review. You can edit it but cannot resubmit.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      console.log('Submitting project with ID:', projectId)

      await projectsAPI.submit(String(projectId))

      toast({
        title: "Project submitted!",
        description: "Your project is now pending review. We'll notify you of the decision.",
      })

      // Redirect to My Projects after a delay
      setTimeout(() => {
        router.push("/my-projects")
      }, 2000)
    } catch (error: any) {
      console.error("Error submitting project:", error)
      toast({
        title: "Error submitting project",
        description: error.message || "Failed to submit project",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStep1Valid = formData.name && formData.shortDescription && formData.longDescription && formData.category && formData.website

  const isStep2Valid = formData.image !== null

  return (
    <div className="min-h-screen">
      <Navigation />
      <Toaster />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold">
              {isEditMode ? "Edit Project" : "Submit Your Project"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isEditMode 
                ? "Update your project details" 
                : "Share your Arc Network project with the community"}
            </p>
            {isEditMode && projectStatus === "Submitted" && (
              <div className="mt-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ This project is pending review. You can edit details, but it cannot be resubmitted.
                </p>
              </div>
            )}
          </div>

          {/* Wallet Connection Notice */}
          {!isConnected && (
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 p-4">
                <Wallet className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">Wallet required:</span> Connect your wallet to submit a project
                  </p>
                </div>
                <Button onClick={connect} size="sm">
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progress Steps */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium transition-colors ${
                    stepNum === step
                      ? "border-primary bg-primary text-primary-foreground"
                      : stepNum < step
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`mx-2 h-0.5 w-12 transition-colors ${stepNum < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <Card className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle>
                {step === 1 && "Step 1: Project Details"}
                {step === 2 && "Step 2: Upload Image"}
                {step === 3 && "Step 3: Review & Submit"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Project Details */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Project Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="My Awesome Project"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="shortDescription">
                        Short Description <span className="text-destructive">*</span>
                      </Label>
                      <span className={`text-xs ${formData.shortDescription.length > 400 ? 'text-destructive' : formData.shortDescription.length > 350 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {formData.shortDescription.length} / 400 characters
                      </span>
                    </div>
                    <Textarea
                      id="shortDescription"
                      value={formData.shortDescription}
                      onChange={(e) => {
                        if (e.target.value.length <= 400) {
                          handleInputChange("shortDescription", e.target.value)
                        }
                      }}
                      placeholder="A brief one-line description of your project"
                      rows={2}
                      maxLength={400}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 400 characters. This will be displayed in project cards and listings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="longDescription">
                        Full Description <span className="text-destructive">*</span>
                      </Label>
                      <span className={`text-xs ${formData.longDescription.length > 5000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formData.longDescription.length} / 5000 characters
                      </span>
                    </div>
                    <Textarea
                      id="longDescription"
                      value={formData.longDescription}
                      onChange={(e) => {
                        if (e.target.value.length <= 5000) {
                          handleInputChange("longDescription", e.target.value)
                        }
                      }}
                      placeholder="Describe your project in detail..."
                      rows={6}
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 5000 characters. Provide a detailed description of your project, its features, and goals.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Social Media & Links Section */}
                  <div className="space-y-4 border-t border-border/40 pt-6">
                    <h3 className="text-sm font-semibold">Social Media & Links</h3>
                    
                    {/* Website */}
                    <div className="space-y-2">
                      <Label htmlFor="website">
                        Website URL <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        placeholder="https://yourproject.com"
                      />
                    </div>

                    {/* GitHub */}
                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub Repository URL</Label>
                      <Input
                        id="github"
                        type="url"
                        value={formData.github}
                        onChange={(e) => handleInputChange("github", e.target.value)}
                        placeholder="https://github.com/yourproject"
                      />
                    </div>

                    {/* LinkedIn */}
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn URL</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        value={formData.linkedin}
                        onChange={(e) => handleInputChange("linkedin", e.target.value)}
                        placeholder="https://linkedin.com/company/yourproject"
                      />
                    </div>

                    {/* Twitter */}
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter / X URL</Label>
                      <Input
                        id="twitter"
                        type="url"
                        value={formData.twitter}
                        onChange={(e) => handleInputChange("twitter", e.target.value)}
                        placeholder="https://twitter.com/yourproject"
                      />
                    </div>

                    {/* Discord */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="discord">Discord URL</Label>
                        <Input
                          id="discord"
                          type="url"
                          value={formData.discord}
                          onChange={(e) => handleInputChange("discord", e.target.value)}
                          placeholder="https://discord.gg/yourproject"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discordUsername">Discord Username</Label>
                        <Input
                          id="discordUsername"
                          value={formData.discordUsername}
                          onChange={(e) => handleInputChange("discordUsername", e.target.value)}
                          placeholder="username#1234"
                        />
                        <p className="text-xs text-muted-foreground">Discord username</p>
                      </div>
                    </div>

                    {/* Contract Address */}
                    <div className="space-y-2 border-t border-border/40 pt-4">
                      <h3 className="text-sm font-semibold">Blockchain Contract (Optional)</h3>
                      <div className="space-y-2">
                        <Label htmlFor="contractAddress">Contract Address</Label>
                        <Input
                          id="contractAddress"
                          value={formData.contractAddress}
                          onChange={(e) => handleInputChange("contractAddress", e.target.value)}
                          placeholder="0x..."
                        />
                        <p className="text-xs text-muted-foreground">Main contract address (optional)</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-destructive">*</span> Required fields
                    </p>
                    
                    <div className="flex justify-end gap-4">
                      {isEditMode && (
                        <Button
                          variant="outline"
                          onClick={() => router.push("/my-projects")}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        onClick={handleCreateOrUpdateProject}
                        disabled={!isStep1Valid || !isConnected || isSubmitting || isLoading}
                      >
                        {isSubmitting 
                          ? (isEditMode ? "Updating..." : "Creating...") 
                          : (isEditMode ? "Update Project" : "Create Project")}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Upload Image */}
              {step === 2 && (
                <>
                  {!projectId && (
                    <div className="mb-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Project is being created. Please wait...
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="image">
                      Project Banner Image <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="cursor-pointer"
                      />
                      {formData.image && (
                        <div className="text-sm text-muted-foreground">
                          Selected: {formData.image.name}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 1600x900px, max 5MB. Will be automatically resized and optimized.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-destructive">*</span> Required fields
                    </p>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        disabled={isSubmitting}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={handleUploadImage}
                        disabled={!isStep2Valid || !projectId || isSubmitting}
                      >
                        {isSubmitting ? "Uploading..." : "Upload Image"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Review & Submit */}
              {step === 3 && (
                <>
                  <div className="space-y-4 rounded-lg border border-border/40 bg-muted/50 p-4">
                    <h3 className="font-semibold">Review Your Project</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {formData.name}
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {formData.category}
                      </div>
                      <div>
                        <span className="font-medium">Description:</span> {formData.shortDescription}
                      </div>
                      {formData.image && (
                        <div>
                          <span className="font-medium">Image:</span> {formData.image.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditMode && projectStatus === "Submitted" && (
                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ This project is already pending review. You can edit details, but it cannot be resubmitted.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={isSubmitting}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    {!isEditMode || projectStatus !== "Submitted" ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || projectStatus === "Submitted"}
                      >
                        {isSubmitting 
                          ? "Submitting..." 
                          : projectStatus === "Submitted" 
                            ? "Already Submitted" 
                            : "Submit for Review"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => router.push("/my-projects")}
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
