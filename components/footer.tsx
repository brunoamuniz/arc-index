import Link from "next/link"
import { Github, Twitter, Linkedin, ArrowUpRight } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const productLinks = [
    { href: "/explore", label: "Explore Projects" },
    { href: "/submit", label: "Submit Project" },
    { href: "/my-projects", label: "My Projects" },
  ]

  const resourceLinks = [
    { href: "#", label: "Documentation" },
    { href: "https://www.arc.network/", label: "Arc Network", external: true },
    { href: "#", label: "FAQ" },
  ]

  const socialLinks = [
    {
      href: "https://x.com/0xbrunoamuniz",
      icon: Twitter,
      label: "Twitter",
    },
    {
      href: "https://github.com/brunoamuniz/arc-index",
      icon: Github,
      label: "GitHub",
    },
    {
      href: "https://www.linkedin.com/in/brunoamuniz/",
      icon: Linkedin,
      label: "LinkedIn",
    },
  ]

  return (
    <footer className="relative border-t border-border/30 bg-card/20">
      {/* Gradient line at top */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Background effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -bottom-1/2 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30 transition-all duration-300 group-hover:bg-primary/25 group-hover:ring-primary/50">
                <span className="font-display text-sm font-bold text-primary">AI</span>
              </div>
              <span className="font-display text-xl font-semibold tracking-tight">
                Arc Index
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The curated project index for Arc Network. Discover, certify, and support innovative blockchain projects with on-chain verification.
            </p>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-10 w-10 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:justify-end">
            {/* Product */}
            <div>
              <h3 className="mb-4 font-display text-sm font-semibold tracking-tight">
                Product
              </h3>
              <ul className="space-y-3">
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="mb-4 font-display text-sm font-semibold tracking-tight">
                Resources
              </h3>
              <ul className="space-y-3">
                {resourceLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                      {link.external && (
                        <ArrowUpRight className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Network */}
            <div>
              <h3 className="mb-4 font-display text-sm font-semibold tracking-tight">
                Network
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="https://www.arc.network/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Arc Network
                    <ArrowUpRight className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://easyfaucetarc.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Testnet Faucet
                    <ArrowUpRight className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} Arc Index. Built on Arc Network.
          </p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Made with</span>
            <span className="mx-1 text-primary">&#9829;</span>
            <span>for the Arc community</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
