import Link from "next/link"
import { Github, Twitter, MessageCircle } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
                <span className="font-mono text-sm font-bold text-primary">AI</span>
              </div>
              <span className="font-mono text-lg font-semibold">Arc Index</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Curated project index for the Arc Network. Submit, discover, and support innovative blockchain projects.
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/explore" className="text-sm text-muted-foreground hover:text-foreground">
                  Explore Projects
                </Link>
              </li>
              <li>
                <Link href="/submit" className="text-sm text-muted-foreground hover:text-foreground">
                  Submit Project
                </Link>
              </li>
              <li>
                <Link href="/my-projects" className="text-sm text-muted-foreground hover:text-foreground">
                  My Projects
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="https://www.arc.network/" className="text-sm text-muted-foreground hover:text-foreground">
                  Arc Network
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Community</h3>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                <Github className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Arc Index. Built on Arc Network.</p>
        </div>
      </div>
    </footer>
  )
}
