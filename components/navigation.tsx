"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useState } from "react"

export function Navigation() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState("")

  const handleConnect = () => {
    // Mock wallet connection
    setIsConnected(true)
    setAddress("0x742d...5f3e")
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setAddress("")
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
              <span className="font-mono text-sm font-bold text-primary">AI</span>
            </div>
            <span className="font-mono text-lg font-semibold">Arc Index</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/explore" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Explore
            </Link>
            <Link href="/submit" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Submit Project
            </Link>
            <Link href="/my-projects" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              My Projects
            </Link>
          </div>
        </div>
        <div>
          {!isConnected ? (
            <Button onClick={handleConnect} size="sm" className="gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="outline" size="sm" className="gap-2 bg-transparent">
              <div className="h-2 w-2 rounded-full bg-primary" />
              {address}
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
