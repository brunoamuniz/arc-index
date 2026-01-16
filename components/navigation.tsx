"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wallet, Droplet, Menu, X } from "lucide-react"
import { useWallet } from "@/lib/wallet/hooks"
import { useUserRole } from "@/lib/auth/use-user-role"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

export function Navigation() {
  const { isConnected, address, isLoading, error, connect, disconnect } = useWallet()
  const { isCuratorOrAdmin, isLoading: isLoadingRole, refetch: refetchRole } = useUserRole()
  const { toast } = useToast()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleConnect = async () => {
    if (isLoading) {
      return
    }

    try {
      await connect()
      setTimeout(() => {
        refetchRole()
        if (isConnected && address) {
          toast({
            title: "Wallet connected",
            description: "Successfully connected to your wallet",
          })
        }
      }, 500)
    } catch (err: any) {
      const isUserCancellation =
        err.message?.includes("cancelled") ||
        err.message?.includes("Signature request was cancelled")

      if (isUserCancellation) {
        toast({
          title: "Signature cancelled",
          description: "You cancelled the signature request. Please try again when ready.",
          variant: "default",
        })
      } else {
        toast({
          title: "Connection failed",
          description: err.message || error || "Failed to connect wallet",
          variant: "destructive",
        })
      }
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    refetchRole()
    toast({
      title: "Wallet disconnected",
      description: "You have been disconnected",
    })
  }

  const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""

  const navLinks = [
    { href: "/explore", label: "Explore" },
    { href: "/submit", label: "Submit Project" },
    { href: "/my-projects", label: "My Projects" },
  ]

  return (
    <nav className="fixed top-0 z-50 w-full">
      {/* Glass background */}
      <div className="absolute inset-0 border-b border-border/30 bg-background/60 backdrop-blur-xl" />

      {/* Gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30 transition-all duration-300 group-hover:bg-primary/25 group-hover:ring-primary/50">
              <span className="font-display text-sm font-bold text-primary">AI</span>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">Arc Index</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="relative z-10">{link.label}</span>
                <div className="absolute inset-0 rounded-lg bg-muted/0 transition-colors hover:bg-muted/50" />
              </Link>
            ))}
            {!isLoadingRole && isCuratorOrAdmin && (
              <Link
                href="/review"
                className="relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="relative z-10">Review</span>
                <div className="absolute inset-0 rounded-lg bg-muted/0 transition-colors hover:bg-muted/50" />
              </Link>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Faucet link */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden gap-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <Link href="https://easyfaucetarc.xyz/" target="_blank" rel="noopener noreferrer">
              <Droplet className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Need Faucet?</span>
            </Link>
          </Button>

          {/* Wallet button */}
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              size="sm"
              className="gap-2 rounded-lg px-4 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
              disabled={isLoading}
            >
              <Wallet className="h-4 w-4" />
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg border-border/50 bg-card/50 px-4 backdrop-blur-sm hover:border-primary/50 hover:bg-card/80"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {displayAddress}
            </Button>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`absolute left-0 right-0 top-full border-b border-border/30 bg-background/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
          isMobileMenuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            {!isLoadingRole && isCuratorOrAdmin && (
              <Link
                href="/review"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                Review
              </Link>
            )}
            <Link
              href="https://easyfaucetarc.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Droplet className="h-4 w-4" />
              Need Faucet?
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
