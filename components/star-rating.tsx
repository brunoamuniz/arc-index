"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
}

export function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  return (
    <div className="flex gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          disabled={readonly}
          className={cn(
            "transition-colors",
            !readonly && "cursor-pointer hover:scale-110",
            readonly && "cursor-default",
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= value ? "fill-primary text-primary" : "fill-none text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  )
}
