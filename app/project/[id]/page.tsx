"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { StarRating } from "@/components/star-rating"
import {
  ArrowLeft,
  Shield,
  Github,
  Twitter,
  Linkedin,
  Globe,
  MessageCircle,
  Copy,
  ExternalLink,
  DollarSign,
  Calendar,
  Trash2,
  Edit,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { projectsAPI } from "@/lib/api/client"
import type { ProjectWithAggregates } from "@/packages/shared"
import { useWallet } from "@/lib/wallet/hooks"
import { useUserRole } from "@/lib/auth/use-user-role"
import { createWalletClient, createPublicClient, http, custom, parseUnits, encodeFunctionData, parseAbi, decodeEventLog, type Address } from "viem"

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [project, setProject] = useState<ProjectWithAggregates | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRating, setUserRating] = useState(0)
  const [donationAmount, setDonationAmount] = useState("")
  const [isRating, setIsRating] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [featureNotSupportedDialogOpen, setFeatureNotSupportedDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    full_description: '',
    category: '',
    website_url: '',
    x_url: '',
    github_url: '',
    linkedin_url: '',
    discord_url: '',
    discord_username: '',
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const { isConnected, address } = useWallet()
  const { isCuratorOrAdmin } = useUserRole()

  const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5042002', 10)

  // Helper function to ensure wallet is on the correct chain
  const ensureCorrectChain = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found')
    }

    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
    const currentChainIdNumber = parseInt(currentChainId, 16)
    
    if (currentChainIdNumber !== CHAIN_ID) {
      const rpcUrl = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'
      
      try {
        // Try to switch to the chain
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        })
      } catch (switchError: any) {
        // If the chain doesn't exist, add it
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: 'Arc Network Testnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [rpcUrl],
                blockExplorerUrls: ['https://testnet.arcscan.app'],
              }],
            })
          } catch (addError: any) {
            // User rejected adding the chain
            if (addError.code === 4001) {
              throw new Error('Please add Arc Network Testnet to your wallet to continue')
            }
            throw addError
          }
        } else if (switchError.code === 4001) {
          // User rejected switching chains
          throw new Error('Please switch to Arc Network Testnet to continue')
        } else {
          throw switchError
        }
      }
    }
  }

  useEffect(() => {
    loadProject()
  }, [projectId])

  useEffect(() => {
    // Check if current user is the owner
    if (project && address) {
      setIsOwner(project.owner_wallet.toLowerCase() === address.toLowerCase())
    } else {
      setIsOwner(false)
    }
  }, [project, address])

  // Initialize edit form when project loads or dialog opens
  useEffect(() => {
    if (project && editDialogOpen) {
      setEditFormData({
        name: project.name || '',
        description: project.description || '',
        full_description: project.full_description || '',
        category: project.category || '',
        website_url: project.website_url || '',
        x_url: project.x_url || '',
        github_url: project.github_url || '',
        linkedin_url: project.linkedin_url || '',
        discord_url: project.discord_url || '',
        discord_username: project.discord_username || '',
      })
      setValidationErrors({}) // Clear validation errors when opening dialog
    }
  }, [project, editDialogOpen])

  async function loadProject() {
    try {
      setIsLoading(true)
      // Add cache busting to ensure fresh data
      const response = await projectsAPI.get(projectId)
      console.log('Project loaded:', {
        id: response.project.id,
        rating_agg: response.project.rating_agg,
        funding_agg: response.project.funding_agg,
      });
      setProject(response.project)
    } catch (error: any) {
      console.error("Error loading project:", error)
      toast({
        title: "Error loading project",
        description: error.message || "Failed to load project",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = (platform: string) => {
    // Use production URL for sharing, fallback to current location for local development
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arcindex.xyz'
    const currentUrl = typeof window !== "undefined" ? window.location.href : ""
    const shareUrl = currentUrl.replace(/^https?:\/\/[^/]+/, baseUrl)
    
    if (platform === "twitter") {
      // Create an engaging tweet with hashtags
      const projectName = project?.name || "this project"
      
      const tweetText = encodeURIComponent(
        `🚀 ${projectName} is building on @arc\n\n` +
        `Discover this project live on #ARCTestnet and explore what they're creating in the Web3 ecosystem.\n\n` +
        `👉 ${shareUrl}\n\n` +
        `#arc #web3 #defi`
      )
      
      window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}`,
        "_blank",
      )
    } else if (platform === "copy") {
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied!",
        description: "Project URL has been copied to clipboard",
      })
    } else if (platform === "discord") {
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied!",
        description: "Share this link in Discord",
      })
    }
  }

  // Validate URL fields
  function validateUrl(url: string, fieldName: string): string | null {
    if (!url || url.trim() === '') return null;
    const trimmed = url.trim();
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null; // Invalid URL, will be set to null
    }
  }

  // Validate form before submission
  function validateForm(): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Validate required fields
    if (!editFormData.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!editFormData.description.trim()) {
      errors.description = 'Short description is required';
    }
    if (!editFormData.category.trim()) {
      errors.category = 'Category is required';
    }
    if (!editFormData.website_url.trim()) {
      errors.website_url = 'Website URL is required';
    } else {
      const validUrl = validateUrl(editFormData.website_url, 'website_url');
      if (!validUrl) {
        errors.website_url = 'Please enter a valid website URL (e.g., https://example.com)';
      }
    }

    // Validate optional URL fields
    if (editFormData.x_url.trim()) {
      const validUrl = validateUrl(editFormData.x_url, 'x_url');
      if (!validUrl) {
        errors.x_url = 'Please enter a valid Twitter URL (e.g., https://x.com/username)';
      }
    }
    if (editFormData.github_url.trim()) {
      const validUrl = validateUrl(editFormData.github_url, 'github_url');
      if (!validUrl) {
        errors.github_url = 'Please enter a valid GitHub URL (e.g., https://github.com/username)';
      }
    }
    if (editFormData.linkedin_url.trim()) {
      const validUrl = validateUrl(editFormData.linkedin_url, 'linkedin_url');
      if (!validUrl) {
        errors.linkedin_url = 'Please enter a valid LinkedIn URL (e.g., https://linkedin.com/company/name)';
      }
    }
    if (editFormData.discord_url.trim()) {
      const validUrl = validateUrl(editFormData.discord_url, 'discord_url');
      if (!validUrl) {
        errors.discord_url = 'Please enter a valid Discord URL (e.g., https://discord.gg/invite)';
      }
    }

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  async function handleAdminEdit() {
    if (!project) return

    // Validate form before submitting
    const validation = validateForm();
    if (!validation.isValid) {
      // Get list of fields with errors
      const errorFields = Object.keys(validation.errors);
      const errorMessages = errorFields.map(field => {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${fieldName}: ${validation.errors[field]}`;
      });
      
      toast({
        title: "Validation error",
        description: errorMessages.length > 0 
          ? errorMessages.join('\n')
          : "Please fix the errors in the form before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true)
      
      // Prepare update data - only include fields that changed
      // Normalize empty strings to null for optional fields
      const normalizeUrl = (url: string) => {
        const trimmed = url.trim();
        if (trimmed === '') return null;
        // Validate URL, if invalid return null
        try {
          new URL(trimmed);
          return trimmed;
        } catch {
          return null;
        }
      }
      
      const updateData: Record<string, string | null> = {}
      if (editFormData.name !== project.name) updateData.name = editFormData.name
      if (editFormData.description !== project.description) updateData.description = editFormData.description
      if (editFormData.full_description !== (project.full_description || '')) {
        updateData.full_description = normalizeUrl(editFormData.full_description)
      }
      if (editFormData.category !== project.category) updateData.category = editFormData.category
      if (editFormData.website_url !== (project.website_url || '')) {
        updateData.website_url = normalizeUrl(editFormData.website_url)
      }
      if (editFormData.x_url !== (project.x_url || '')) {
        updateData.x_url = normalizeUrl(editFormData.x_url)
      }
      if (editFormData.github_url !== (project.github_url || '')) {
        updateData.github_url = normalizeUrl(editFormData.github_url)
      }
      if (editFormData.linkedin_url !== (project.linkedin_url || '')) {
        updateData.linkedin_url = normalizeUrl(editFormData.linkedin_url)
      }
      if (editFormData.discord_url !== (project.discord_url || '')) {
        updateData.discord_url = normalizeUrl(editFormData.discord_url)
      }
      // discord_username is not a URL, just normalize empty strings to null
      const currentDiscordUsername = project.discord_username || ''
      const newDiscordUsername = editFormData.discord_username.trim()
      if (newDiscordUsername !== currentDiscordUsername) {
        updateData.discord_username = newDiscordUsername === '' ? null : newDiscordUsername
      }

      // Only send update if there are changes
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No changes",
          description: "No changes were made to the project",
        })
        setEditDialogOpen(false)
        return
      }

      console.log('Sending update data:', updateData);
      await projectsAPI.adminUpdate(projectId, updateData)
      
      toast({
        title: "Project updated",
        description: "The project has been updated successfully",
      })
      
      setEditDialogOpen(false)
      setValidationErrors({}) // Clear validation errors on success
      loadProject() // Reload to show updated data
    } catch (error: any) {
      console.error("Error updating project:", error)
      
      // Check if it's a validation error from the backend
      if (error?.responseData?.details && Array.isArray(error.responseData.details)) {
        const backendErrors: Record<string, string> = {};
        error.responseData.details.forEach((err: any) => {
          if (err.path && err.path.length > 0) {
            backendErrors[err.path[0]] = err.message || 'Invalid value';
          }
        });
        setValidationErrors(backendErrors);
        
        // Show specific error messages
        const errorFields = Object.keys(backendErrors);
        const errorMessages = errorFields.map(field => {
          const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `${fieldName}: ${backendErrors[field]}`;
        });
        
        toast({
          title: "Validation error",
          description: errorMessages.length > 0 
            ? errorMessages.join('\n')
            : "Please check the form for errors",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating project",
          description: error.message || "Failed to update project",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDonate = async () => {
    if (!donationAmount || Number.parseFloat(donationAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        variant: "destructive",
      })
      return
    }

    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to donate",
        variant: "destructive",
      })
      return
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to donate",
        variant: "destructive",
      })
      return
    }

    try {
      setIsFunding(true)

      // Ensure wallet is on the correct chain
      await ensureCorrectChain()

      // Get transaction data from API
      const { txData, approvalNeeded, approvalTxData } = await projectsAPI.fund(projectId, donationAmount)

      if (!txData) {
        throw new Error('Failed to get transaction data')
      }

      const walletClient = createWalletClient({
        transport: custom(window.ethereum),
        chain: {
          id: CHAIN_ID,
          name: 'Arc Network',
          network: 'arc-testnet',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'] },
          },
        },
      })

      const publicClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'),
      })

      // If approval needed, approve first
      if (approvalNeeded && approvalTxData) {
        const approvalHash = await walletClient.sendTransaction({
          account: address as Address,
          to: approvalTxData.to as Address,
          data: approvalTxData.data as `0x${string}`,
        })

        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash })
        
        // Check if approval transaction was successful
        if (approvalReceipt.status === 'reverted') {
          throw new Error(`Approval transaction failed. Transaction was reverted. Check: https://testnet.arcscan.app/tx/${approvalHash}`)
        }
        
        toast({
          title: "Approval confirmed",
          description: "Please confirm the donation transaction",
        })
      }

      // Send funding transaction
      const hash = await walletClient.sendTransaction({
        account: address as Address,
        to: txData.to as Address,
        data: txData.data as `0x${string}`,
      })

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      
      // Check if transaction was successful
      if (receipt.status === 'reverted') {
        throw new Error(`Donation transaction failed. Transaction was reverted. Check: https://testnet.arcscan.app/tx/${hash}`)
      }

      // Confirm with backend
      await projectsAPI.fund(projectId, donationAmount, receipt.transactionHash)

      toast({
        title: "Donation successful!",
        description: `You donated ${donationAmount} USDC to this project`,
      })

      setDonationAmount("")
      // Force reload with cache busting
      setTimeout(async () => {
        console.log('Reloading project after donation...');
        await loadProject();
        // Force a second reload after a bit more time to ensure aggregates are synced
        setTimeout(() => {
          console.log('Second reload to ensure aggregates are synced...');
          loadProject();
        }, 1000);
      }, 500)
    } catch (error: any) {
      console.error("Error donating:", error)

      let errorTitle = "Donation failed"
      let errorMessage = error.message || "Failed to process donation"

      // Check for specific error codes from API
      if (error.code === 'UNAUTHORIZED' || error.status === 401) {
        errorTitle = "Not signed in"
        errorMessage = "Please connect your wallet and sign in to donate to projects."
      } else if (error.code === 'PROJECT_NOT_ON_CHAIN' || error.error?.includes('not registered on-chain')) {
        errorTitle = "Project not on blockchain yet"
        errorMessage = "This project needs to be registered on the blockchain before it can receive donations. The project owner or a curator needs to complete the on-chain registration first."
      } else if (error.code === 'PROJECT_NOT_APPROVED_ON_CHAIN') {
        errorTitle = "Project not approved"
        errorMessage = "This project is not approved on the blockchain and cannot receive donations yet."
      } else if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
        errorTitle = "Transaction cancelled"
        errorMessage = "You cancelled the transaction. Please try again."
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsFunding(false)
    }
  }

  const handleRate = async (stars: number) => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to rate projects",
        variant: "destructive",
      })
      return
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to rate",
        variant: "destructive",
      })
      return
    }

    try {
      setIsRating(true)
      setUserRating(stars)

      // Ensure wallet is on the correct chain
      await ensureCorrectChain()

      // Get transaction data from API
      const { txData } = await projectsAPI.rate(projectId, stars)

      if (!txData) {
        throw new Error('Failed to get transaction data')
      }

      const walletClient = createWalletClient({
        transport: custom(window.ethereum),
        chain: {
          id: CHAIN_ID,
          name: 'Arc Network',
          network: 'arc-testnet',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'] },
          },
        },
      })

      const publicClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'),
      })

      // Send rating transaction
      const hash = await walletClient.sendTransaction({
        account: address as Address,
        to: txData.to as Address,
        data: txData.data as `0x${string}`,
      })

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      // Check if transaction was successful
      if (!receipt.status || receipt.status === 'reverted') {
        throw new Error(`Transaction failed or was reverted. Status: ${receipt.status}`)
      }

      console.log('Transaction confirmed:', {
        hash: receipt.transactionHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
      })

      // Confirm with backend
      await projectsAPI.rate(projectId, stars, receipt.transactionHash)

      toast({
        title: "Rating submitted!",
        description: `You rated this project ${stars} star${stars > 1 ? 's' : ''}`,
      })

      // Force reload with cache busting
      setTimeout(async () => {
        console.log('Reloading project after rating...');
        await loadProject();
        // Force a second reload after a bit more time to ensure aggregates are synced
        setTimeout(() => {
          console.log('Second reload to ensure aggregates are synced...');
          loadProject();
        }, 1000);
      }, 500)
    } catch (error: any) {
      console.error("Error rating:", error)

      // Provide more specific error messages
      let errorMessage = error.message || "Failed to submit rating"
      let errorTitle = "Rating failed"

      // Check for specific error codes from API
      if (error.code === 'UNAUTHORIZED' || error.status === 401) {
        errorTitle = "Not signed in"
        errorMessage = "Please connect your wallet and sign in to rate projects."
      } else if (error.code === 'PROJECT_NOT_ON_CHAIN' || error.error?.includes('not registered on-chain') || error.details?.includes('not been registered')) {
        errorTitle = "Project not on blockchain yet"
        errorMessage = "This project needs to be registered on the blockchain before it can be rated. The project owner or a curator needs to complete the on-chain registration first."
      } else if (error.code === 'PROJECT_NOT_APPROVED_ON_CHAIN' || error.error?.includes('not approved on-chain')) {
        errorTitle = "Project not approved"
        errorMessage = "This project is not approved on the blockchain and cannot be rated yet."
      } else if (error.status === 400) {
        if (error.error?.includes('Transaction failed') || error.details?.includes('reverted')) {
          errorTitle = "Transaction failed"
          errorMessage = error.details || error.error || errorMessage
        } else {
          errorTitle = "Rating not available"
          errorMessage = error.details || error.error || errorMessage
        }
      } else if (error.status === 500) {
        errorTitle = "Server error"
        errorMessage = error.details || "Failed to verify transaction on server"
      } else if (error.message?.includes('reverted')) {
        errorTitle = "Transaction reverted"
        errorMessage = "The transaction was reverted on-chain. Please check the transaction details."
      } else if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
        errorTitle = "Transaction cancelled"
        errorMessage = "You cancelled the transaction. Please try again."
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      })
      setUserRating(0)
    } finally {
      setIsRating(false)
    }
  }

  const handleRegisterOnChain = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to register project on-chain",
        variant: "destructive",
      })
      return
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to register on-chain",
        variant: "destructive",
      })
      return
    }

    if (!project) return

    try {
      setIsRegistering(true)

      // Ensure wallet is on the correct chain
      toast({
        title: "Switching network...",
        description: "Please approve the network switch to Arc Network if prompted",
      })
      await ensureCorrectChain()

      // Get transaction data from API
      const response = await projectsAPI.registerOnChain(projectId)

      const walletClient = createWalletClient({
        transport: custom(window.ethereum),
        chain: {
          id: CHAIN_ID,
          name: 'Arc Network',
          network: 'arc-testnet',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'] },
          },
        },
      })

      const publicClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'),
      })

      const projectRegistryAddress = process.env.NEXT_PUBLIC_ARC_INDEX_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_PROJECT_REGISTRY_ADDRESS as Address
      
      // Use the new atomic function: registerApprovedProjectAndMint
      // This function registers the project and mints NFT in one transaction
      // It uses EIP-712 signature to prove curator approval (no re-approval needed)
      if (!response.finalizeTxData) {
        throw new Error('Failed to get finalization transaction data from API')
      }

      toast({
        title: "Registering project on-chain...",
        description: "Please confirm the transaction. This will register the project and mint the NFT certificate to the project owner.",
      })

      const finalizeHash = await walletClient.sendTransaction({
        account: address as Address,
        to: response.finalizeTxData.to as Address,
        data: response.finalizeTxData.data as `0x${string}`,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: finalizeHash })
      
      // Check if transaction was successful
      if (receipt.status === 'reverted') {
        throw new Error(`Registration transaction failed. Transaction was reverted. Check: https://testnet.arcscan.app/tx/${finalizeHash}`)
      }
      
      console.log('Project finalization receipt:', {
        hash: receipt.transactionHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
      })

      // Extract project ID and NFT token ID from ProjectFinalized event
      const projectFinalizedEventAbi = parseAbi([
        'event ProjectFinalized(uint256 indexed projectId, address indexed owner, address indexed finalizer, uint256 certificateTokenId)',
        'event ProjectApproved(uint256 indexed projectId, address indexed curator, uint256 indexed certificateTokenId)',
      ])

      let onChainProjectId: bigint | null = null
      let certificateTokenId: bigint | null = null
      
      try {
        const logs = receipt.logs
        const projectRegistryLogs = logs.filter(log => 
          log.address.toLowerCase() === projectRegistryAddress.toLowerCase()
        )
        
        for (const log of projectRegistryLogs) {
          try {
            const decoded = decodeEventLog({
              abi: projectFinalizedEventAbi,
              data: log.data,
              topics: log.topics,
            })
            
            if (decoded.eventName === 'ProjectFinalized') {
              onChainProjectId = decoded.args.projectId as bigint
              certificateTokenId = decoded.args.certificateTokenId as bigint
              console.log('✅ Extracted from ProjectFinalized event:', {
                projectId: onChainProjectId,
                tokenId: certificateTokenId,
                owner: decoded.args.owner,
                finalizer: decoded.args.finalizer,
              })
              break
            } else if (decoded.eventName === 'ProjectApproved') {
              // Fallback to ProjectApproved event
              onChainProjectId = decoded.args.projectId as bigint
              certificateTokenId = decoded.args.certificateTokenId as bigint
              console.log('✅ Extracted from ProjectApproved event:', {
                projectId: onChainProjectId,
                tokenId: certificateTokenId,
              })
            }
          } catch (e) {
            // Not the event we're looking for, continue
          }
        }
      } catch (e) {
        console.error('Error decoding finalization event:', e)
      }

      // Update database with on-chain project_id and nft_token_id
      if (onChainProjectId && certificateTokenId) {
        try {
          // Call API to update database
          await projectsAPI.updateOnChain(projectId, finalizeHash);
          
          toast({
            title: "Project registered on-chain!",
            description: `Project ID: #${Number(onChainProjectId)}. NFT certificate #${Number(certificateTokenId)} has been minted to the project owner.`,
          });
        } catch (updateError: any) {
          console.error('Error updating database:', updateError);
          // Don't fail the whole flow - indexer will sync it
          toast({
            title: "Project registered on-chain!",
            description: `Project ID: #${Number(onChainProjectId)}. NFT certificate #${Number(certificateTokenId)} has been minted. Database will sync shortly via indexer.`,
          });
        }
      } else {
        // If we couldn't extract IDs from events, try to update anyway using the API
        try {
          await projectsAPI.updateOnChain(projectId, finalizeHash);
          toast({
            title: "Project registered on-chain!",
            description: "Project has been registered and NFT certificate has been minted to the project owner.",
          });
        } catch (updateError) {
          console.error('Error updating database:', updateError);
          toast({
            title: "Project registered on-chain!",
            description: "Project has been registered and NFT certificate has been minted. Database will sync via indexer.",
          });
        }
      }
      
      // Reload project to get updated data (project_id, nft_token_id)
      await loadProject()
    } catch (error: any) {
      console.error("Error registering on-chain:", error)
      
      let errorMessage = error.message || "Failed to register project on-chain"
      let errorTitle = "Registration failed"
      
      // Handle transaction revert errors
      if (error.message?.includes('reverted') || error.message?.includes('Transaction was reverted')) {
        errorTitle = "Transaction failed"
        errorMessage = error.message
        
        // Extract transaction hash if available
        const txHashMatch = error.message.match(/0x[a-fA-F0-9]{64}/)
        if (txHashMatch) {
          errorMessage += `\n\nView transaction: https://testnet.arcscan.app/tx/${txHashMatch[0]}`
        }
      } else if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
        errorTitle = "Transaction cancelled"
        errorMessage = "You cancelled the transaction. Please try again."
      } else if (error.status === 403) {
        errorTitle = "Access denied"
        errorMessage = "Only the project owner or curator can register it on-chain"
      } else if (error.status === 400) {
        errorTitle = "Cannot register"
        errorMessage = error.details || error.error || errorMessage
      } else if (error.message?.includes('mintApprovalNFT')) {
        errorTitle = "NFT mint failed"
        errorMessage = "The NFT mint transaction failed. This might be because:\n- The ProjectRegistry contract doesn't have the 'mintApprovalNFT' function (needs redeploy)\n- The ApprovalNFT address is not set in ProjectRegistry\n- The project is not approved on-chain\n\n" + (error.message || "Check the transaction details for more information.")
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  function formatUSDC(amount: number | string | null | undefined) {
    // Parse amount correctly - Supabase NUMERIC(18,6) returns as string
    const numAmount = typeof amount === 'string' 
      ? parseFloat(amount) 
      : typeof amount === 'number' 
      ? amount 
      : 0;
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-2xl font-bold">Project not found</h1>
            <Button asChild>
              <Link href="/explore">Back to Explore</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <Toaster />

      <main className="px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/explore" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Explore
            </Link>
          </Button>

          {/* Project Header */}
          <Card className="mb-6 border-border/40 bg-card/50">
            <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
              {project.image_url ? (
                <img src={project.image_url} alt={project.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No Image</div>
              )}
              {project.nft_token_id && (
                <div className="absolute top-4 right-4">
                  <Link href={`/project/${projectId}/nft`}>
                    <Badge className="gap-1.5 bg-primary/90 cursor-pointer hover:bg-primary transition-colors">
                      <Shield className="h-3.5 w-3.5" />
                      Certified NFT #{project.nft_token_id}
                    </Badge>
                  </Link>
                </div>
              )}
            </div>
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h1 className="mb-2 text-3xl font-bold">{project.name}</h1>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{project.category}</Badge>
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <p className="mb-4 text-lg font-medium text-foreground">{project.description}</p>
              
              {/* Full Description */}
              {project.full_description && (
                <div className="mb-6">
                  <p className="text-base text-muted-foreground whitespace-pre-wrap">
                    {project.full_description}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="mb-6 grid grid-cols-3 gap-4 border-t border-border/40 pt-6">
                <div className="text-center">
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <StarRating value={project.rating_agg?.avg_stars || 0} readonly size="sm" />
                  </div>
                  <div className="text-sm font-medium">
                    {project.rating_agg?.avg_stars.toFixed(1) || "0.0"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ({project.rating_agg?.ratings_count || 0} ratings)
                  </div>
                </div>
                <div className="text-center">
                  <DollarSign className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <div className="text-sm font-medium">
                    {formatUSDC(project.funding_agg?.total_usdc)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {project.funding_agg?.funding_count || 0} donations
                  </div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-sm font-medium">{formatAddress(project.owner_wallet)}</div>
                  <div className="text-xs text-muted-foreground">Owner</div>
                </div>
              </div>

              {/* Social Links - Only show links that are filled */}
              {(project.x_url || project.github_url || project.linkedin_url || project.discord_url || project.website_url) && (
                <div className="flex flex-wrap items-center gap-4 border-t border-border/40 pt-6">
                  {project.x_url && project.x_url.trim() && (
                    <a
                      href={project.x_url.startsWith('http') ? project.x_url : `https://${project.x_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {project.github_url && project.github_url.trim() && (
                    <a
                      href={project.github_url.startsWith('http') ? project.github_url : `https://${project.github_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {project.linkedin_url && project.linkedin_url.trim() && (
                    <a
                      href={project.linkedin_url.startsWith('http') ? project.linkedin_url : `https://${project.linkedin_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {project.discord_url && project.discord_url.trim() && (
                    <a
                      href={project.discord_url.startsWith('http') ? project.discord_url : `https://${project.discord_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Discord
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {project.website_url && project.website_url.trim() && (
                    <a
                      href={project.website_url.startsWith('http') ? project.website_url : `https://${project.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Edit Button */}
          {isCuratorOrAdmin && (
            <Card className="mb-6 border-primary/40 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1 text-lg font-semibold">Admin Edit</h3>
                    <p className="text-sm text-muted-foreground">
                      Edit project details as an administrator. Changes will be visible immediately.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(true)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Register On-Chain Card (Owner or Curator, if approved but not registered) */}
          {(isOwner || isCuratorOrAdmin) && project.status === 'Approved' && (!project.project_id || !project.nft_token_id) && (
            <Card className="mb-6 border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Register Project On-Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {!project.project_id
                      ? isOwner
                        ? "Your project has been approved! Register it on-chain to receive your approval NFT certificate."
                        : "This project has been approved. Register it on-chain to mint the approval NFT for the project owner."
                      : !project.nft_token_id
                      ? isOwner
                        ? "Your project is registered on-chain. Mint your approval NFT certificate now."
                        : "This project is registered on-chain. Mint the approval NFT for the project owner."
                      : ""}
                  </p>
                  <Button 
                    onClick={handleRegisterOnChain} 
                    disabled={!isConnected || isRegistering}
                    className="w-full"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {isRegistering 
                      ? "Processing..." 
                      : !project.project_id
                      ? "Create On-Chain & Mint NFT"
                      : "Mint Approval NFT"}
                  </Button>
                  {!isConnected && (
                    <p className="text-xs text-muted-foreground text-center">
                      Connect your wallet to register on-chain
                    </p>
                  )}
                  {isCuratorOrAdmin && !isOwner && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      The NFT will be minted to the project owner's wallet: {formatAddress(project.owner_wallet)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating Card */}
          <Card className="mb-6 border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle>Rate this Project</CardTitle>
            </CardHeader>
            <CardContent>
              {!project.project_id ? (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    This project hasn't been registered on the blockchain yet. Rating will be available once the project owner or a curator completes the on-chain registration.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <StarRating value={userRating} onChange={handleRate} size="lg" disabled={isRating} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRating
                      ? "Submitting rating on-chain..."
                      : isConnected
                      ? "Click on the stars to rate this project on-chain"
                      : "Connect your wallet to rate projects"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Donation Card */}
          <Card className="mb-6 border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle>Support this Project</CardTitle>
            </CardHeader>
            <CardContent>
              {!project.project_id ? (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    This project hasn't been registered on the blockchain yet. Donations will be available once the project owner or a curator completes the on-chain registration.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount in USDC"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleDonate} disabled={!isConnected || isFunding}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      {isFunding ? "Processing..." : "Donate"}
                    </Button>
                  </div>
                  {/* Fee breakdown when amount is entered */}
                  {donationAmount && Number.parseFloat(donationAmount) > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Donation amount:</span>
                        <span>{Number.parseFloat(donationAmount).toFixed(2)} USDC</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform fee (2.5%):</span>
                        <span>-{(Number.parseFloat(donationAmount) * 0.025).toFixed(2)} USDC</span>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-border/40 pt-2 font-medium">
                        <span>Project receives:</span>
                        <span className="text-primary">{(Number.parseFloat(donationAmount) * 0.975).toFixed(2)} USDC</span>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isConnected
                      ? "Donations are sent directly to the project owner on-chain. A 2.5% platform fee supports Arc Index operations."
                      : "Connect your wallet to support projects"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Share Card */}
          <Card className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle>Share Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleShare("twitter")} className="gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleShare("discord")} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Discord
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleShare("copy")} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delete Project (Owner only) */}
          {isOwner && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Delete this project permanently. This action cannot be undone and the project will no longer appear on Arc Index.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete Project"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project?.name}"? This action cannot be undone and the project will no longer appear on Arc Index.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  setDeleteDialogOpen(false)
                  setIsDeleting(true)
                  await projectsAPI.delete(projectId)
                  toast({
                    title: "Project deleted",
                    description: "The project has been deleted and will no longer appear on Arc Index.",
                  })
                  // Redirect to my projects after a delay
                  setTimeout(() => {
                    router.push("/my-projects")
                  }, 2000)
                } catch (error: any) {
                  console.error("Error deleting project:", error)
                  toast({
                    title: "Error deleting project",
                    description: error.message || "Failed to delete project",
                    variant: "destructive",
                  })
                } finally {
                  setIsDeleting(false)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feature Not Supported Dialog */}
      <AlertDialog open={featureNotSupportedDialogOpen} onOpenChange={setFeatureNotSupportedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Feature Not Available</AlertDialogTitle>
            <AlertDialogDescription>
              Feature not supported yet, wait for a few days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFeatureNotSupportedDialogOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project (Admin)</DialogTitle>
            <DialogDescription>
              Make changes to the project details. All changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Short Description *</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Short description (max 400 characters)"
                rows={3}
                maxLength={400}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-full-description">Full Description</Label>
              <Textarea
                id="edit-full-description"
                value={editFormData.full_description}
                onChange={(e) => setEditFormData({ ...editFormData, full_description: e.target.value })}
                placeholder="Full description (max 5000 characters)"
                rows={6}
                maxLength={5000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Input
                id="edit-category"
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                placeholder="Category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website URL *</Label>
              <Input
                id="edit-website"
                type="url"
                value={editFormData.website_url}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, website_url: e.target.value });
                  if (validationErrors.website_url) {
                    setValidationErrors({ ...validationErrors, website_url: '' });
                  }
                }}
                placeholder="https://example.com"
                className={validationErrors.website_url ? "border-destructive" : ""}
              />
              {validationErrors.website_url && (
                <p className="text-sm text-destructive">{validationErrors.website_url}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-x">Twitter URL</Label>
                <Input
                  id="edit-x"
                  type="url"
                  value={editFormData.x_url}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, x_url: e.target.value });
                    if (validationErrors.x_url) {
                      setValidationErrors({ ...validationErrors, x_url: '' });
                    }
                  }}
                  placeholder="https://x.com/username"
                  className={validationErrors.x_url ? "border-destructive" : ""}
                />
                {validationErrors.x_url && (
                  <p className="text-sm text-destructive">{validationErrors.x_url}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-github">GitHub URL</Label>
                <Input
                  id="edit-github"
                  type="url"
                  value={editFormData.github_url}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, github_url: e.target.value });
                    if (validationErrors.github_url) {
                      setValidationErrors({ ...validationErrors, github_url: '' });
                    }
                  }}
                  placeholder="https://github.com/username"
                  className={validationErrors.github_url ? "border-destructive" : ""}
                />
                {validationErrors.github_url && (
                  <p className="text-sm text-destructive">{validationErrors.github_url}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-linkedin">LinkedIn URL</Label>
                <Input
                  id="edit-linkedin"
                  type="url"
                  value={editFormData.linkedin_url}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, linkedin_url: e.target.value });
                    if (validationErrors.linkedin_url) {
                      setValidationErrors({ ...validationErrors, linkedin_url: '' });
                    }
                  }}
                  placeholder="https://linkedin.com/company/name"
                  className={validationErrors.linkedin_url ? "border-destructive" : ""}
                />
                {validationErrors.linkedin_url && (
                  <p className="text-sm text-destructive">{validationErrors.linkedin_url}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discord-url">Discord URL</Label>
                <Input
                  id="edit-discord-url"
                  type="url"
                  value={editFormData.discord_url}
                  onChange={(e) => setEditFormData({ ...editFormData, discord_url: e.target.value })}
                  placeholder="https://discord.gg/invite"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discord-username">Discord Username</Label>
              <Input
                id="edit-discord-username"
                value={editFormData.discord_username}
                onChange={(e) => setEditFormData({ ...editFormData, discord_username: e.target.value })}
                placeholder="username#1234"
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdminEdit}
              disabled={isSaving || !editFormData.name || !editFormData.description || !editFormData.category || !editFormData.website_url}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
