/**
 * NFT Metadata Validation Test Script
 * 
 * This script validates that minted NFTs have correct metadata and images
 * that will render properly in wallets and explorers.
 * 
 * Usage:
 *   npx tsx packages/contracts/scripts/test-nft-metadata.ts [tokenId]
 * 
 * If tokenId is provided, it will test that existing token.
 * Otherwise, it will attempt to mint a new test token (requires MINTER_ROLE).
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { createPublicClient, http, parseAbi, type Address } from "viem";

// Load .env.local from project root (3 levels up from packages/contracts/scripts/)
dotenv.config({ path: resolve(__dirname, "../../../.env.local") });

// Arc Testnet Configuration
const ARC_TESTNET_RPC = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
const CHAIN_ID = 5042002;

// Contract addresses from environment (same logic as lib/contracts/index.ts)
function getContractAddresses() {
  return {
    certificateNFT: (process.env.ARC_INDEX_CERTIFICATE_NFT_ADDRESS ||
                     process.env.NEXT_PUBLIC_ARC_INDEX_CERTIFICATE_NFT_ADDRESS) as Address | undefined,
    registry: (process.env.ARC_INDEX_REGISTRY_ADDRESS ||
               process.env.NEXT_PUBLIC_ARC_INDEX_REGISTRY_ADDRESS) as Address | undefined,
  };
}

// Test project UUID (you can change this to test a different project)
const TEST_PROJECT_UUID = process.env.TEST_PROJECT_UUID || "7785b375-b193-44dd-945b-f9a79bd3b576";
// Allow overriding the base URL for local testing
// Defaults to localhost:3000 if not set and tokenURI points to arcindex.xyz
const OVERRIDE_BASE_URL = process.env.TEST_BASE_URL || 
  (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.includes('localhost') 
    ? process.env.NEXT_PUBLIC_APP_URL 
    : undefined);

// ABI for certificate NFT
const CERTIFICATE_NFT_ABI = parseAbi([
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getProjectIdForToken(uint256 tokenId) view returns (uint256)",
  "function mintCertificate(address to, uint256 projectId, string memory uri) returns (uint256)",
  "function projectIdToTokenId(uint256 projectId) view returns (uint256)",
]);

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Fetch and validate metadata JSON
 */
async function validateMetadata(tokenURI: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
  };

  console.log(`\n📋 Fetching metadata from: ${tokenURI}`);

  try {
    let metadataText: string;
    let metadata: any;

    // If OVERRIDE_BASE_URL is set, replace the base URL in tokenURI for local testing
    let actualTokenURI = tokenURI;
    if (OVERRIDE_BASE_URL && (tokenURI.startsWith("http://") || tokenURI.startsWith("https://"))) {
      try {
        const url = new URL(tokenURI);
        const overrideUrl = new URL(OVERRIDE_BASE_URL);
        actualTokenURI = tokenURI.replace(url.origin, overrideUrl.origin);
        console.log(`   🔄 Overriding base URL: ${url.origin} → ${overrideUrl.origin}`);
      } catch (e) {
        // Invalid URL, use original
      }
    }

    // Handle data URI
    if (actualTokenURI.startsWith("data:application/json")) {
      const base64Match = actualTokenURI.match(/^data:application\/json;base64,(.+)$/);
      if (!base64Match) {
        result.passed = false;
        result.errors.push("Invalid data URI format - expected base64 encoding");
        return result;
      }

      try {
        metadataText = Buffer.from(base64Match[1], "base64").toString("utf-8");
        console.log(`   Decoded metadata: ${metadataText.substring(0, 200)}...`);
      } catch (e: any) {
        result.passed = false;
        result.errors.push(`Failed to decode base64: ${e.message}`);
        return result;
      }
    } else {
      // HTTP/HTTPS URL
      const response = await fetch(actualTokenURI, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        result.passed = false;
        result.errors.push(`HTTP ${response.status}: ${response.statusText}`);
        return result;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        result.warnings.push(`Content-Type is ${contentType}, expected application/json`);
      }

      metadataText = await response.text();
    }

    // Parse JSON
    try {
      metadata = JSON.parse(metadataText);
    } catch (e: any) {
      result.passed = false;
      result.errors.push(`Invalid JSON: ${e.message}`);
      return result;
    }

    console.log(`   ✅ Valid JSON parsed`);

    // Validate required fields
    const requiredFields = ["name", "description", "image"];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        result.passed = false;
        result.errors.push(`Missing required field: ${field}`);
      } else {
        console.log(`   ✅ ${field}: ${typeof metadata[field] === "string" ? metadata[field].substring(0, 60) + "..." : JSON.stringify(metadata[field])}`);
      }
    }

    // Validate attributes (optional but recommended)
    if (!metadata.attributes || !Array.isArray(metadata.attributes)) {
      result.warnings.push("Missing or invalid 'attributes' array (optional but recommended)");
    } else {
      console.log(`   ✅ attributes: ${metadata.attributes.length} items`);
    }

    // Validate image field
    if (metadata.image) {
      const imageResult = await validateImage(metadata.image);
      if (!imageResult.passed) {
        result.passed = false;
        result.errors.push(...imageResult.errors);
      }
      result.warnings.push(...imageResult.warnings);
    }

    return result;
  } catch (error: any) {
    result.passed = false;
    result.errors.push(`Failed to fetch metadata: ${error.message}`);
    return result;
  }
}

/**
 * Validate image URI and content
 */
async function validateImage(imageURI: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
  };

  // If OVERRIDE_BASE_URL is set, replace the base URL for local testing
  let actualImageURI = imageURI;
  if (OVERRIDE_BASE_URL && (imageURI.startsWith("http://") || imageURI.startsWith("https://"))) {
    try {
      const url = new URL(imageURI);
      const overrideUrl = new URL(OVERRIDE_BASE_URL);
      // Only override if the original URL is not localhost
      if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        actualImageURI = imageURI.replace(url.origin, overrideUrl.origin);
        console.log(`   🔄 Overriding image base URL: ${url.origin} → ${overrideUrl.origin}`);
      }
    } catch (e) {
      // Invalid URL, use original
    }
  }

  console.log(`\n🖼️  Validating image: ${actualImageURI}`);

  try {
    let imageContent: string;
    let isSVG = false;

    // Handle data URI
    if (actualImageURI.startsWith("data:image/svg+xml")) {
      const base64Match = actualImageURI.match(/^data:image\/svg\+xml;base64,(.+)$/);
      if (base64Match) {
        try {
          imageContent = Buffer.from(base64Match[1], "base64").toString("utf-8");
          isSVG = true;
          console.log(`   ✅ Decoded SVG from data URI`);
        } catch (e: any) {
          result.passed = false;
          result.errors.push(`Failed to decode SVG base64: ${e.message}`);
          return result;
        }
      } else {
        // URL-encoded SVG
        const urlMatch = actualImageURI.match(/^data:image\/svg\+xml;charset=utf-8,(.+)$/);
        if (urlMatch) {
          imageContent = decodeURIComponent(urlMatch[1]);
          isSVG = true;
          console.log(`   ✅ Decoded SVG from URL-encoded data URI`);
        } else {
          result.passed = false;
          result.errors.push("Invalid SVG data URI format");
          return result;
        }
      }
    } else if (actualImageURI.startsWith("ipfs://")) {
      // Convert IPFS to gateway URL
      const ipfsHash = actualImageURI.replace("ipfs://", "");
      const gatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
      console.log(`   Converting IPFS to gateway: ${gatewayUrl}`);

      const response = await fetch(gatewayUrl);
      if (!response.ok) {
        result.passed = false;
        result.errors.push(`Failed to fetch IPFS content: HTTP ${response.status}`);
        return result;
      }

      imageContent = await response.text();
      isSVG = imageContent.trim().startsWith("<svg");
    } else if (actualImageURI.startsWith("http://") || actualImageURI.startsWith("https://")) {
      // HTTP/HTTPS URL
      try {
        const response = await fetch(actualImageURI, {
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        if (!response.ok) {
          result.passed = false;
          const errorText = await response.text().catch(() => '');
          result.errors.push(`Failed to fetch image: HTTP ${response.status} ${response.statusText}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`);
          return result;
        }

        const contentType = response.headers.get("content-type");
        console.log(`   Content-Type: ${contentType}`);

        if (contentType?.includes("image/svg+xml")) {
          imageContent = await response.text();
          isSVG = true;
        } else if (contentType?.includes("image/png") || contentType?.includes("image/jpeg")) {
          // Binary image - just validate it exists
          const buffer = await response.arrayBuffer();
          console.log(`   ✅ Binary image (${contentType}): ${buffer.byteLength} bytes`);
          return result;
        } else {
          result.warnings.push(`Unexpected Content-Type: ${contentType}`);
          imageContent = await response.text();
          isSVG = imageContent.trim().startsWith("<svg");
        }
      } catch (fetchError: any) {
        result.passed = false;
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
          result.errors.push(`Image fetch timeout after 10 seconds`);
        } else if (fetchError.code === 'ECONNREFUSED' || fetchError.message?.includes('ECONNREFUSED')) {
          result.errors.push(`Connection refused - is the server running at ${actualImageURI}?`);
        } else if (fetchError.message?.includes('fetch failed')) {
          result.errors.push(`Fetch failed - ${fetchError.message}. Check if server is running and accessible.`);
          result.errors.push(`   Tried URL: ${actualImageURI}`);
        } else {
          result.errors.push(`Failed to fetch image: ${fetchError.message || fetchError.toString()}`);
          if (fetchError.cause) {
            result.errors.push(`   Cause: ${fetchError.cause}`);
          }
        }
        return result;
      }
    } else {
      result.passed = false;
      result.errors.push(`Unsupported image URI format: ${actualImageURI.substring(0, 50)}`);
      return result;
    }

    // Validate SVG content
    if (isSVG) {
      if (!imageContent.trim().startsWith("<svg")) {
        result.passed = false;
        result.errors.push("SVG content does not start with <svg tag");
        return result;
      }

      if (!imageContent.includes("xmlns")) {
        result.warnings.push("SVG missing xmlns attribute (may not render in all viewers)");
      }

      if (!imageContent.includes("viewBox") && !imageContent.includes("width") && !imageContent.includes("height")) {
        result.warnings.push("SVG missing viewBox/width/height (may not size correctly)");
      }

      console.log(`   ✅ Valid SVG (${imageContent.length} chars)`);
      console.log(`   Preview: ${imageContent.substring(0, 200).replace(/\n/g, " ")}...`);
    }

    return result;
  } catch (error: any) {
    result.passed = false;
    result.errors.push(`Failed to validate image: ${error.message}`);
    return result;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log("🧪 NFT Metadata Validation Test");
  console.log("=" .repeat(60));

  // Get contract addresses
  const addresses = getContractAddresses();
  const CERTIFICATE_NFT_ADDRESS = addresses.certificateNFT;
  const REGISTRY_ADDRESS = addresses.registry;

  // Check environment
  if (!CERTIFICATE_NFT_ADDRESS) {
    console.error("❌ CERTIFICATE_NFT_ADDRESS not set in environment");
    console.error("   Set ARC_INDEX_CERTIFICATE_NFT_ADDRESS or NEXT_PUBLIC_ARC_INDEX_CERTIFICATE_NFT_ADDRESS");
    process.exit(1);
  }

  if (!REGISTRY_ADDRESS) {
    console.error("❌ REGISTRY_ADDRESS not set in environment");
    console.error("   Set ARC_INDEX_REGISTRY_ADDRESS or NEXT_PUBLIC_ARC_INDEX_REGISTRY_ADDRESS");
    process.exit(1);
  }

  console.log(`   Certificate NFT: ${CERTIFICATE_NFT_ADDRESS}`);
  console.log(`   Registry: ${REGISTRY_ADDRESS}`);

  // Get tokenId from command line or find one
  const tokenIdArg = process.argv[2];
  let tokenId: bigint;

  const publicClient = createPublicClient({
    transport: http(ARC_TESTNET_RPC),
  });

  const nftContract = {
    address: CERTIFICATE_NFT_ADDRESS,
    abi: CERTIFICATE_NFT_ABI,
  } as const;

  if (tokenIdArg) {
    // Test existing token
    tokenId = BigInt(tokenIdArg);
    console.log(`\n📌 Testing existing token ID: ${tokenId}`);
  } else {
    // Try to find a token by checking common project IDs
    console.log(`\n📌 No tokenId provided. Attempting to find existing tokens...`);
    
    // Try to find tokens by checking projectIdToTokenId for common project IDs
    let foundTokenId: bigint | null = null;
    
    // Check project IDs 1-10 for tokens
    for (let projectId = 1; projectId <= 10; projectId++) {
      try {
        const tokenIdResult = await publicClient.readContract({
          ...nftContract,
          functionName: "projectIdToTokenId",
          args: [BigInt(projectId)],
        });
        
        if (tokenIdResult && tokenIdResult > 0n) {
          foundTokenId = tokenIdResult;
          console.log(`   ✅ Found token ID ${foundTokenId} for project ID ${projectId}`);
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    if (foundTokenId) {
      tokenId = foundTokenId;
      console.log(`\n📌 Using token ID: ${tokenId}`);
    } else {
      console.log("   ⚠️  No tokens found. Please provide a tokenId as argument:");
      console.log("   Usage: npm run test:nft-metadata <tokenId>");
      console.log("\n   You can find tokenIds by:");
      console.log("   1. Checking ArcScan for CertificateMinted events");
      console.log("   2. Using the registry contract's certificateTokenId for a project");
      console.log("   3. Querying the NFT contract's projectIdToTokenId mapping");
      process.exit(1);
    }
  }

  try {
    // Read tokenURI
    const tokenURI = await publicClient.readContract({
      ...nftContract,
      functionName: "tokenURI",
      args: [tokenId],
    });

    console.log(`\n✅ Token URI: ${tokenURI}`);

    // Get owner
    const owner = await publicClient.readContract({
      ...nftContract,
      functionName: "ownerOf",
      args: [tokenId],
    });

    console.log(`   Owner: ${owner}`);

    // Get project ID
    const projectId = await publicClient.readContract({
      ...nftContract,
      functionName: "getProjectIdForToken",
      args: [tokenId],
    });

    console.log(`   Project ID: ${projectId}`);

    // Validate metadata
    const metadataResult = await validateMetadata(tokenURI as string);

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("📊 VALIDATION RESULTS");
    console.log("=".repeat(60));

    if (metadataResult.passed) {
      console.log("✅ PASS - NFT metadata is valid and should render correctly");
    } else {
      console.log("❌ FAIL - NFT metadata has errors");
    }

    if (metadataResult.errors.length > 0) {
      console.log("\n❌ Errors:");
      metadataResult.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
    }

    if (metadataResult.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      metadataResult.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Token ID: ${tokenId}`);
    console.log(`Token URI: ${tokenURI}`);
    console.log(`Owner: ${owner}`);
    console.log(`Project ID: ${projectId}`);
    console.log("=".repeat(60));

    process.exit(metadataResult.passed ? 0 : 1);
  } catch (error: any) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
