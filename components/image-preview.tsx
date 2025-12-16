"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, X } from "lucide-react"

interface ImagePreviewProps {
  file: File | null
  onConfirm: () => void
  onCancel: () => void
  aspectRatio?: number // width/height ratio, default 16/9
}

export function ImagePreview({ file, onConfirm, onCancel, aspectRatio = 16 / 9 }: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      setProcessedUrl(null)
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Process image to show how it will look
    setIsProcessing(true)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Target dimensions (same as backend: 1600x900)
      const targetWidth = 1600
      const targetHeight = 900

      canvas.width = targetWidth
      canvas.height = targetHeight

      // Calculate crop to maintain aspect ratio and center crop
      const imgAspect = img.width / img.height
      const targetAspect = aspectRatio

      let sourceX = 0
      let sourceY = 0
      let sourceWidth = img.width
      let sourceHeight = img.height

      if (imgAspect > targetAspect) {
        // Image is wider - crop width
        sourceWidth = img.height * targetAspect
        sourceX = (img.width - sourceWidth) / 2
      } else {
        // Image is taller - crop height
        sourceHeight = img.width / targetAspect
        sourceY = (img.height - sourceHeight) / 2
      }

      // Draw cropped and resized image
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      )

      // Convert to blob URL for preview
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const processedUrl = URL.createObjectURL(blob)
            setProcessedUrl(processedUrl)
            setIsProcessing(false)
          }
        },
        "image/webp",
        0.8
      )
    }

    img.onerror = () => {
      console.error("Error loading image for preview")
      setIsProcessing(false)
    }

    img.src = url

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [file, aspectRatio])

  if (!file) {
    return null
  }

  if (isProcessing || !processedUrl) {
    return (
      <Card className="border-border/40 bg-card/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Processing image...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Image Preview</h3>
          <p className="text-sm text-muted-foreground">
            This is how your image will appear after processing (16:9 crop, resized to 1600x900px)
          </p>
        </div>

        {/* Preview Container */}
        <div className="relative w-full bg-muted rounded-lg overflow-hidden border border-border/40">
          <div className="relative" style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}>
            <img
              src={processedUrl}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Image Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            <span className="font-medium">File:</span> {file.name}
          </div>
          <div>
            <span className="font-medium">Size:</span> {(file.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Upload New Image
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Confirm Image
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Verify that the crop is correct. If not, click "Upload New Image" to choose another image.
        </p>
      </CardContent>
    </Card>
  )
}

