"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

const categories = ["DeFi", "NFT", "Gaming", "DAO", "Infrastructure", "Social", "Tools", "Other"]

const networks = ["Arc Network", "Ethereum", "Polygon", "Arbitrum", "Optimism", "Base"]

export default function SubmitProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    shortDescription: "",
    longDescription: "",
    category: "",
    image: null as File | null,
    twitter: "",
    discord: "",
    github: "",
    website: "",
    linkedin: "",
    contractAddress: "",
    network: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, image: e.target.files![0] }))
    }
  }

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.shortDescription || !formData.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Project submitted!",
      description: "Your project is now pending review. We'll notify you of the decision.",
    })

    // Redirect to My Projects after a delay
    setTimeout(() => {
      router.push("/my-projects")
    }, 2000)
  }

  const isStep1Valid = formData.name && formData.shortDescription && formData.longDescription && formData.category

  const isStep2Valid = formData.twitter || formData.github || formData.website

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold">Submit Your Project</h1>
            <p className="text-lg text-muted-foreground">Share your Arc Network project with the community</p>
          </div>

          {/* Wallet Connection Notice */}
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Wallet className="h-5 w-5 text-primary" />
              <p className="text-sm">
                <span className="font-medium">Wallet required:</span> Connect your wallet to submit a project
              </p>
            </CardContent>
          </Card>

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
                {step === 1 && "Basic Information"}
                {step === 2 && "Media & Links"}
                {step === 3 && "Blockchain Info"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Project Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your project name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
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

                  <div className="space-y-2">
                    <Label htmlFor="short-desc">
                      Short Description <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="short-desc"
                      placeholder="One-line description (max 100 characters)"
                      maxLength={100}
                      value={formData.shortDescription}
                      onChange={(e) => handleInputChange("shortDescription", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{formData.shortDescription.length}/100 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="long-desc">
                      Full Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="long-desc"
                      placeholder="Describe your project in detail..."
                      rows={8}
                      value={formData.longDescription}
                      onChange={(e) => handleInputChange("longDescription", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Media & Links */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="image">Project Image</Label>
                    <div className="flex items-center gap-4">
                      <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="flex-1" />
                      {formData.image && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Upload className="h-4 w-4" />
                          {formData.image.name}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Recommended: 1200x630px, max 5MB</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter">
                      Twitter / X <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="twitter"
                      type="url"
                      placeholder="https://twitter.com/yourproject"
                      value={formData.twitter}
                      onChange={(e) => handleInputChange("twitter", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github">
                      GitHub Repository <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="github"
                      type="url"
                      placeholder="https://github.com/yourproject"
                      value={formData.github}
                      onChange={(e) => handleInputChange("github", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourproject.com"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discord">Discord</Label>
                    <Input
                      id="discord"
                      type="url"
                      placeholder="https://discord.gg/yourproject"
                      value={formData.discord}
                      onChange={(e) => handleInputChange("discord", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      placeholder="https://linkedin.com/company/yourproject"
                      value={formData.linkedin}
                      onChange={(e) => handleInputChange("linkedin", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Blockchain Info */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="network">
                      Network <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.network} onValueChange={(value) => handleInputChange("network", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {networks.map((net) => (
                          <SelectItem key={net} value={net}>
                            {net}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contract">
                      Contract Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contract"
                      placeholder="0x..."
                      value={formData.contractAddress}
                      onChange={(e) => handleInputChange("contractAddress", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Enter your main contract address</p>
                  </div>

                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <h3 className="mb-2 text-sm font-semibold">Review Process</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        After submission, our curators will review your project. This typically takes 3-5 business days.
                        You'll be notified via wallet address once a decision is made. If approved, you'll receive an
                        NFT certificate!
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.contractAddress || !formData.network}
                    className="gap-2"
                  >
                    Submit Project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <Toaster />
    </div>
  )
}
