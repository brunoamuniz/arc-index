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
  const { toast } = useToast()
  const { isConnected, address } = useWallet()
  const { isCuratorOrAdmin } = useUserRole()

  const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5042002', 10)

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

  useEffect(() => {
    // Check if current user is the owner
    if (project && address) {
      setIsOwner(project.owner_wallet.toLowerCase() === address.toLowerCase())
    } else {
      setIsOwner(false)
    }
  }, [project, address])

  async function loadProject() {
    try {
      setIsLoading(true)
      const response = await projectsAPI.get(projectId)
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
    const url = typeof window !== "undefined" ? window.location.href : ""
    if (platform === "twitter") {
      // Create an engaging tweet with hashtags
      const projectName = project?.name || "this project"
      
      const tweetText = encodeURIComponent(
        `🚀 ${projectName}\n\n` +
        `Check it out on @arc #ARCTestnet\n\n` +
        `${url}\n\n` +
        `#arc #web3 #defi`
      )
      
      window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}`,
        "_blank",
      )
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url)
      toast({
        title: "Link copied!",
        description: "Project URL has been copied to clipboard",
      })
    } else if (platform === "discord") {
      navigator.clipboard.writeText(url)
      toast({
        title: "Link copied!",
        description: "Share this link in Discord",
      })
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
      loadProject() // Reload to update funding stats
    } catch (error: any) {
      console.error("Error donating:", error)
      toast({
        title: "Donation failed",
        description: error.message || "Failed to process donation",
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

      loadProject() // Reload to update rating stats
    } catch (error: any) {
      console.error("Error rating:", error)
      
      // Provide more specific error messages
      let errorMessage = error.message || "Failed to submit rating"
      let errorTitle = "Rating failed"
      
      if (error.status === 400) {
        if (error.error?.includes('not registered on-chain') || error.details?.includes('not been registered')) {
          errorTitle = "Project not ready"
          errorMessage = error.details || "This project has been approved but hasn't been registered on-chain yet. Please wait for the on-chain registration to complete."
        } else if (error.error?.includes('Transaction failed') || error.details?.includes('reverted')) {
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
      } else if (error.message?.includes('User rejected')) {
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

      // Step 1: Create project on-chain if needed
      if (response.createTxData) {
        toast({
          title: "Creating project on-chain...",
          description: "Please confirm the transaction to create the project",
        })

        const createHash = await walletClient.sendTransaction({
          account: address as Address,
          to: response.createTxData.to as Address,
          data: response.createTxData.data as `0x${string}`,
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash })
        
        // Check if transaction was successful
        if (receipt.status === 'reverted') {
          throw new Error(`Project creation transaction failed. Transaction was reverted. Check: https://testnet.arcscan.app/tx/${createHash}`)
        }
        
        console.log('Project creation receipt:', {
          hash: receipt.transactionHash,
          status: receipt.status,
          blockNumber: receipt.blockNumber,
        })

        // Extract project_id from ProjectCreated event in the receipt
        const projectCreatedEventAbi = parseAbi([
          'event ProjectCreated(uint256 indexed projectId, address indexed owner, string metadataUri)',
        ])

        let onChainProjectId: bigint | null = null
        
        // Try to decode the event from logs
        try {
          const logs = receipt.logs
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: projectCreatedEventAbi,
                data: log.data,
                topics: log.topics,
              })
              
              if (decoded.eventName === 'ProjectCreated') {
                onChainProjectId = decoded.args.projectId as bigint
                break
              }
            } catch (e) {
              // Not the event we're looking for, continue
            }
          }
        } catch (e) {
          console.error('Error decoding event:', e)
        }

        if (!onChainProjectId) {
          // Fallback: try to read nextProjectId from contract before creation
          // This is not ideal but works if event decoding fails
          throw new Error('Could not extract project_id from transaction. Please try again or wait for the indexer to process.')
        }

        const onChainProjectIdNumber = Number(onChainProjectId)
        
        toast({
          title: "Project created on-chain!",
          description: `Project ID: #${onChainProjectIdNumber}. Proceeding with approval...`,
        })

        // Update project_id in database directly (don't wait for indexer)
        // Note: The update API might not support project_id, so we'll let the indexer handle it
        // But we can continue with the on-chain operations using the extracted project_id

        // Now proceed with approval and NFT minting
        const metadataUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/api/metadata/${project.id}`
        const PROJECT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_PROJECT_REGISTRY_ADDRESS as Address
        const APPROVAL_NFT_ADDRESS = process.env.NEXT_PUBLIC_APPROVAL_NFT_ADDRESS as Address
        
        const projectRegistryAbi = parseAbi([
          'function submit(uint256 projectId) external',
          'function approve(uint256 projectId) external',
          'function mintApprovalNFT(uint256 projectId, address to, string memory tokenURI) external returns (uint256)',
          'function getProject(uint256 projectId) external view returns (address owner, uint8 status, string memory metadataUri)',
        ])
        
        // Check current status on-chain and owner
        let currentStatus: number
        let onChainOwner: Address | null = null
        try {
          const [owner, status] = await publicClient.readContract({
            address: PROJECT_REGISTRY_ADDRESS,
            abi: projectRegistryAbi,
            functionName: 'getProject',
            args: [onChainProjectId],
          })
          currentStatus = Number(status)
          onChainOwner = owner as Address
          console.log('Project on-chain - Status:', currentStatus, 'Owner:', onChainOwner, 'Current user:', address)
        } catch (e) {
          console.error('Error checking project status:', e)
          currentStatus = 0 // Draft
        }
        
        // Step 2: Submit project on-chain if it's still Draft (status 0)
        // Note: submit() requires onlyOwner modifier, so only the on-chain owner can submit
        if (currentStatus === 0) {
          // Check if current user is the on-chain owner
          if (onChainOwner && onChainOwner.toLowerCase() !== address.toLowerCase()) {
            throw new Error(`Cannot submit project. Only the on-chain owner (${onChainOwner}) can submit the project. The project was created by a different address. Please ask the owner to submit the project first, or recreate the project with your wallet.`)
          }
          
          // Simulate the transaction first to catch errors early
          let simulationError: string | null = null
          try {
            await publicClient.simulateContract({
              address: PROJECT_REGISTRY_ADDRESS,
              abi: projectRegistryAbi,
              functionName: 'submit',
              args: [onChainProjectId],
              account: address as Address,
            })
          } catch (simError: any) {
            simulationError = simError.message || simError.shortMessage || 'Unknown error'
            console.error('Submit simulation error:', simError)
            
            // Provide specific error messages based on common revert reasons
            if (simError.message?.includes('Not owner') || simError.shortMessage?.includes('Not owner')) {
              throw new Error(`Cannot submit project. You are not the on-chain owner (${onChainOwner}). Only the address that created the project can submit it.`)
            } else if (simError.message?.includes('Invalid status') || simError.shortMessage?.includes('Invalid status')) {
              throw new Error(`Cannot submit project. Project status is not Draft or Rejected. Current status: ${currentStatus}.`)
            } else {
              throw new Error(`Cannot submit project. Simulation failed: ${simulationError}`)
            }
          }
          
          const submitData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'submit',
            args: [onChainProjectId],
          })

          toast({
            title: "Submitting project on-chain...",
            description: "Please confirm the submission transaction",
          })

          const submitHash = await walletClient.sendTransaction({
            account: address as Address,
            to: PROJECT_REGISTRY_ADDRESS,
            data: submitData,
          })

          const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submitHash })
          
          console.log('Submit receipt:', {
            hash: submitReceipt.transactionHash,
            status: submitReceipt.status,
            blockNumber: submitReceipt.blockNumber,
            logs: submitReceipt.logs.length,
          })
          
          // Check if transaction was successful
          if (submitReceipt.status === 'reverted') {
            // Try to decode revert reason if possible
            let revertReason = ''
            try {
              // Check if it's a permission error
              if (onChainOwner && onChainOwner.toLowerCase() !== address.toLowerCase()) {
                revertReason = ` You are not the on-chain owner (${onChainOwner}). Only the owner can submit.`
              } else {
                revertReason = ' This might be because you are not the on-chain owner of the project, or the project status is not Draft/Rejected.'
              }
            } catch (e) {
              // Ignore
            }
            throw new Error(`Submission transaction failed. Transaction was reverted.${revertReason} Check: https://testnet.arcscan.app/tx/${submitHash}`)
          }
          
          toast({
            title: "Project submitted on-chain!",
            description: "Project status updated to Submitted. Proceeding with approval...",
          })
          
          // Verify status was updated to Submitted (1)
          try {
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait a bit for state to update
            const [ownerAfterSubmit, statusAfterSubmit] = await publicClient.readContract({
              address: PROJECT_REGISTRY_ADDRESS,
              abi: projectRegistryAbi,
              functionName: 'getProject',
              args: [onChainProjectId],
            })
            const newStatus = Number(statusAfterSubmit)
            console.log('Status after submit:', newStatus)
            
            if (newStatus !== 1) {
              throw new Error(`Project submission completed but status is still not "Submitted". Current status: ${newStatus}. Please try again.`)
            }
          } catch (verifyError: any) {
            if (verifyError.message?.includes('status is still not')) {
              throw verifyError
            }
            console.warn('Could not verify submit status, but continuing:', verifyError)
          }
        }
        
        // Step 3: Approve project on-chain (only if status is Submitted, skip if already Approved)
        // Re-check status before approving
        let statusBeforeApprove: number
        try {
          const [owner, status] = await publicClient.readContract({
            address: PROJECT_REGISTRY_ADDRESS,
            abi: projectRegistryAbi,
            functionName: 'getProject',
            args: [onChainProjectId],
          })
          statusBeforeApprove = Number(status)
          console.log('Status before approve:', statusBeforeApprove, '(0=Draft, 1=Submitted, 2=Approved, 3=Rejected)')
        } catch (e) {
          console.error('Error checking status before approve:', e)
          statusBeforeApprove = currentStatus
        }
        
        // If already approved on-chain, skip approval step
        if (statusBeforeApprove === 2) {
          console.log('Project is already approved on-chain, skipping approval step')
          toast({
            title: "Project already approved on-chain",
            description: "Proceeding to mint NFT...",
          })
        } else if (statusBeforeApprove === 1) {
          // Project is Submitted, need to approve
          // Only curators can approve, but if project is already approved off-chain,
          // we should allow the owner to proceed (but they can't approve on-chain)
          // So we'll check if user is curator, if not, show a helpful message
          if (!isCuratorOrAdmin) {
            throw new Error(`Project needs to be approved on-chain, but only curators can approve. The project is currently in "Submitted" status on-chain. Please ask a curator to approve it, or if you are a curator, make sure your wallet is connected.`)
          }
          
          // Simulate the approval transaction first to catch errors early
          try {
            await publicClient.simulateContract({
              address: PROJECT_REGISTRY_ADDRESS,
              abi: projectRegistryAbi,
              functionName: 'approve',
              args: [onChainProjectId],
              account: address as Address,
            })
          } catch (simError: any) {
            const errorMsg = simError.message || simError.shortMessage || 'Unknown error'
            console.error('Approve simulation error:', simError)
            
            // Provide specific error messages based on common revert reasons
            if (errorMsg.includes('Not curator') || errorMsg.includes('Not admin')) {
              throw new Error(`Cannot approve project. You are not a curator. Only curators can approve projects on-chain.`)
            } else if (errorMsg.includes('Not submitted')) {
              throw new Error(`Cannot approve project. Project status is ${statusBeforeApprove} (expected 1 = Submitted). Please ensure the project has been submitted on-chain first.`)
            } else {
              throw new Error(`Cannot approve project. Simulation failed: ${errorMsg}`)
            }
          }
          
          const approveData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'approve',
            args: [onChainProjectId],
          })

          toast({
            title: "Approving project on-chain...",
            description: "Please confirm the approval transaction",
          })

          const approveHash = await walletClient.sendTransaction({
            account: address as Address,
            to: PROJECT_REGISTRY_ADDRESS,
            data: approveData,
          })

          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash })
          
          // Check if transaction was successful
          if (approveReceipt.status === 'reverted') {
            throw new Error(`Approval transaction failed. Transaction was reverted. The project must be in "Submitted" status to be approved. Check: https://testnet.arcscan.app/tx/${approveHash}`)
          }
          
          toast({
            title: "Project approved on-chain!",
            description: "Proceeding to mint NFT...",
          })
        } else if (statusBeforeApprove !== 0) {
          // Status is neither Draft, Submitted, nor Approved
          throw new Error(`Cannot proceed. Project status on-chain is ${statusBeforeApprove} (0=Draft, 1=Submitted, 2=Approved, 3=Rejected). Expected Submitted (1) or Approved (2).`)
        }

        // Step 4: Mint NFT through ProjectRegistry (which calls ApprovalNFT)
        // First verify the function exists by checking if we can encode it
        let mintData: `0x${string}`
        try {
          mintData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'mintApprovalNFT',
            args: [onChainProjectId, project.owner_wallet as Address, metadataUrl],
          })
        } catch (encodeError: any) {
          throw new Error(`Failed to prepare NFT mint transaction. The ProjectRegistry contract may not have the 'mintApprovalNFT' function. This requires redeploying the contract with the updated code. Error: ${encodeError.message}`)
        }

        toast({
          title: "Minting approval NFT...",
          description: "Please confirm the NFT minting transaction",
        })

        const nftHash = await walletClient.sendTransaction({
          account: address as Address,
          to: PROJECT_REGISTRY_ADDRESS,
          data: mintData,
        })

        const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftHash })
        
        // Check if NFT mint transaction was successful
        if (nftReceipt.status === 'reverted') {
          // Try to get revert reason if possible
          let revertReason = ''
          try {
            // Check if it's a function not found error
            const code = await publicClient.getBytecode({ address: PROJECT_REGISTRY_ADDRESS })
            if (code && !code.includes('mintApprovalNFT'.slice(0, 8))) {
              revertReason = '\n\n⚠️ The ProjectRegistry contract does not have the "mintApprovalNFT" function. The contract needs to be redeployed with the updated code.'
            }
          } catch (e) {
            // Ignore errors when checking bytecode
          }
          
          throw new Error(`NFT mint transaction failed. Transaction was reverted.${revertReason}\n\nCheck transaction: https://testnet.arcscan.app/tx/${nftHash}`)
        }

        toast({
          title: "Project registered on-chain!",
          description: "Project has been created, approved, and NFT minted successfully",
        })
        
        // Reload project to get updated data (project_id, nft_token_id)
        await loadProject()
      } else if (response.approveTxData) {
        // Project exists but may need submit and/or approval
        const projectRegistryAbi = parseAbi([
          'function submit(uint256 projectId) external',
          'function approve(uint256 projectId) external',
          'function getProject(uint256 projectId) external view returns (address owner, uint8 status, string memory metadataUri)',
        ])
        
        // Check current status
        let currentStatus: number
        try {
          const [owner, status] = await publicClient.readContract({
            address: response.approveTxData.to as Address,
            abi: projectRegistryAbi,
            functionName: 'getProject',
            args: [BigInt(project.project_id || 0)],
          })
          currentStatus = Number(status)
        } catch (e) {
          console.error('Error checking project status:', e)
          currentStatus = 0 // Assume Draft
        }
        
        // If Draft (0), submit first
        if (currentStatus === 0) {
          const submitData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'submit',
            args: [BigInt(project.project_id || 0)],
          })

          toast({
            title: "Submitting project on-chain...",
            description: "Please confirm the submission transaction",
          })

          const submitHash = await walletClient.sendTransaction({
            account: address as Address,
            to: response.approveTxData.to as Address,
            data: submitData,
          })

          const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submitHash })
          
          if (submitReceipt.status === 'reverted') {
            throw new Error(`Submission transaction failed. Transaction was reverted. Check: https://testnet.arcscan.app/tx/${submitHash}`)
          }
          
          // Update currentStatus after submit
          try {
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for state to update
            const [ownerAfterSubmit, statusAfterSubmit] = await publicClient.readContract({
              address: response.approveTxData.to as Address,
              abi: projectRegistryAbi,
              functionName: 'getProject',
              args: [BigInt(project.project_id || 0)],
            })
            currentStatus = Number(statusAfterSubmit)
            console.log('Status after submit:', currentStatus)
          } catch (e) {
            console.warn('Could not verify status after submit, assuming Submitted:', e)
            currentStatus = 1 // Assume Submitted
          }
        }
        
        // Now approve (only if status is Submitted, skip if already Approved)
        if (currentStatus === 1) {
          // Project is Submitted, need to approve
          // Only curators can approve
          if (!isCuratorOrAdmin) {
            throw new Error(`Project needs to be approved on-chain, but only curators can approve. The project is currently in "Submitted" status on-chain. Please ask a curator to approve it, or if you are a curator, make sure your wallet is connected.`)
          }
          
          // Simulate first to catch errors early
          try {
            await publicClient.simulateContract({
              address: response.approveTxData.to as Address,
              abi: projectRegistryAbi,
              functionName: 'approve',
              args: [BigInt(project.project_id || 0)],
              account: address as Address,
            })
          } catch (simError: any) {
            const errorMsg = simError.message || simError.shortMessage || 'Unknown error'
            console.error('Approve simulation error:', simError)
            
            if (errorMsg.includes('Not curator') || errorMsg.includes('Not admin')) {
              throw new Error(`Cannot approve project. You are not a curator. Only curators can approve projects on-chain.`)
            } else if (errorMsg.includes('Not submitted')) {
              throw new Error(`Cannot approve project. Project status is ${currentStatus} (expected 1 = Submitted).`)
            } else {
              throw new Error(`Cannot approve project. Simulation failed: ${errorMsg}`)
            }
          }
          
          toast({
            title: "Approving project on-chain...",
            description: "Please confirm the approval transaction",
          })

          const approveData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'approve',
            args: [BigInt(project.project_id || 0)],
          })

          const approveHash = await walletClient.sendTransaction({
            account: address as Address,
            to: response.approveTxData.to as Address,
            data: approveData,
          })

          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash })
          
          // Check if transaction was successful
          if (approveReceipt.status === 'reverted') {
            throw new Error(`Approval transaction failed. Transaction was reverted. The project must be in "Submitted" status to be approved. Check: https://testnet.arcscan.app/tx/${approveHash}`)
          }
          
          toast({
            title: "Project approved on-chain!",
            description: "Proceeding to mint NFT...",
          })
        } else if (currentStatus === 2) {
          // Already approved, skip approval
          console.log('Project is already approved on-chain, skipping approval step')
          toast({
            title: "Project already approved on-chain",
            description: "Proceeding to mint NFT...",
          })
        } else if (currentStatus !== 0) {
          throw new Error(`Cannot proceed. Project status on-chain is ${currentStatus} (0=Draft, 1=Submitted, 2=Approved, 3=Rejected). Expected Submitted (1) or Approved (2).`)
        }

        // Mint NFT through ProjectRegistry
        if (response.nftTxData) {
          toast({
            title: "Minting approval NFT...",
            description: "Please confirm the NFT minting transaction",
          })

          const nftHash = await walletClient.sendTransaction({
            account: address as Address,
            to: response.nftTxData.to as Address,
            data: response.nftTxData.data as `0x${string}`,
          })

          const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftHash })
          
          // Check if NFT mint transaction was successful
          if (nftReceipt.status === 'reverted') {
            // Try to get revert reason if possible
            let revertReason = ''
            try {
              const code = await publicClient.getBytecode({ address: response.nftTxData.to as Address })
              if (code && !code.includes('mintApprovalNFT'.slice(0, 8))) {
                revertReason = '\n\n⚠️ The ProjectRegistry contract does not have the "mintApprovalNFT" function. The contract needs to be redeployed with the updated code.'
              }
            } catch (e) {
              // Ignore errors when checking bytecode
            }
            
            throw new Error(`NFT mint transaction failed. Transaction was reverted.${revertReason}\n\nCheck transaction: https://testnet.arcscan.app/tx/${nftHash}`)
          }
        }

        toast({
          title: "Project registered on-chain!",
          description: "Project has been approved and NFT minted successfully",
        })
        
        // Reload project to get updated data
        await loadProject()
      } else if (response.nftTxData) {
        // Project already approved, just mint NFT through ProjectRegistry
        toast({
          title: "Minting approval NFT...",
          description: "Please confirm the NFT minting transaction",
        })

        const nftHash = await walletClient.sendTransaction({
          account: address as Address,
          to: response.nftTxData.to as Address,
          data: response.nftTxData.data as `0x${string}`,
        })

        const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftHash })
        
        // Check if NFT mint transaction was successful
        if (nftReceipt.status === 'reverted') {
          // Try to get revert reason if possible
          let revertReason = ''
          try {
            const code = await publicClient.getBytecode({ address: response.nftTxData.to as Address })
            if (code && !code.includes('mintApprovalNFT'.slice(0, 8))) {
              revertReason = '\n\n⚠️ The ProjectRegistry contract does not have the "mintApprovalNFT" function. The contract needs to be redeployed with the updated code.'
            }
          } catch (e) {
            // Ignore errors when checking bytecode
          }
          
          throw new Error(`NFT mint transaction failed. Transaction was reverted.${revertReason}\n\nCheck transaction: https://testnet.arcscan.app/tx/${nftHash}`)
        }

        toast({
          title: "NFT minted successfully!",
          description: "Your approval NFT has been minted and sent to your wallet",
        })
        
        // Reload project to get updated data
        await loadProject()
      }
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

  function formatUSDC(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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
                    {formatUSDC(Number(project.funding_agg?.total_usdc || 0))}
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
            </CardContent>
          </Card>

          {/* Donation Card */}
          <Card className="mb-6 border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle>Support this Project</CardTitle>
            </CardHeader>
            <CardContent>
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
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? "Donations are sent directly to the project owner (on-chain funding coming soon)"
                    : "Connect your wallet to support projects"}
                </p>
              </div>
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
    </div>
  )
}
