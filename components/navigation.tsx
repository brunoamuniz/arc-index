"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useWallet } from "@/lib/wallet/hooks"
import { useUserRole } from "@/lib/auth/use-user-role"
import { useToast } from "@/hooks/use-toast"

export function Navigation() {
  const { isConnected, address, isLoading, error, connect, disconnect } = useWallet()
  const { isCuratorOrAdmin, isLoading: isLoadingRole, refetch: refetchRole } = useUserRole()
  const { toast } = useToast()

  const handleConnect = async () => {
    // Prevent multiple clicks
    if (isLoading) {
      return;
    }
    
    try {
      await connect()
      // Success toast will be shown by checking state after a brief delay
      // This allows the state to update before showing the toast
      setTimeout(() => {
        // Refresh user role after connection
        refetchRole();
        if (isConnected && address) {
          toast({
            title: "Wallet connected",
            description: "Successfully connected to your wallet",
          })
        }
      }, 500) // Increased delay to ensure state is updated
    } catch (err: any) {
      // Error is already handled in the hook and shown in state
      toast({
        title: "Connection failed",
        description: err.message || error || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    // Refresh user role after disconnection
    refetchRole();
    toast({
      title: "Wallet disconnected",
      description: "You have been disconnected",
    })
  }

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ""

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
            {/* Only show Review link for curators and admins */}
            {!isLoadingRole && isCuratorOrAdmin && (
              <Link href="/review" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Review
              </Link>
            )}
          </div>
        </div>
        <div>
          {!isConnected ? (
            <Button 
              onClick={handleConnect} 
              size="sm" 
              className="gap-2"
              disabled={isLoading}
            >
              <Wallet className="h-4 w-4" />
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </Button>
          ) : (
            <Button 
              onClick={handleDisconnect} 
              variant="outline" 
              size="sm" 
              className="gap-2 bg-transparent"
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
              {displayAddress}
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
