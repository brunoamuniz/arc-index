import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, "../../.env.local") });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Updating ApprovalNFT registry address with account:", deployer.address);
  
  const projectRegistryAddress = process.env.PROJECT_REGISTRY_ADDRESS;
  const approvalNFTAddress = process.env.APPROVAL_NFT_ADDRESS;

  if (!projectRegistryAddress || !approvalNFTAddress) {
    console.error("❌ PROJECT_REGISTRY_ADDRESS and APPROVAL_NFT_ADDRESS must be set in .env.local");
    process.exit(1);
  }

  console.log("New ProjectRegistry:", projectRegistryAddress);
  console.log("ApprovalNFT:", approvalNFTAddress);

  // Get the ApprovalNFT contract instance
  const ApprovalNFT = await ethers.getContractFactory("ApprovalNFT");
  const approvalNFT = ApprovalNFT.attach(approvalNFTAddress);

  // Check current registry address
  try {
    const currentRegistry = await approvalNFT.projectRegistry();
    console.log("\nCurrent registry address:", currentRegistry);
    
    if (currentRegistry.toLowerCase() === projectRegistryAddress.toLowerCase()) {
      console.log("✅ ApprovalNFT already points to the correct ProjectRegistry address");
      return;
    }
  } catch (error) {
    console.error("⚠️  Could not read current registry address:", error);
  }

  // Update registry address
  try {
    console.log("\nUpdating ApprovalNFT registry address...");
    const tx = await approvalNFT.updateRegistry(projectRegistryAddress);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ ApprovalNFT registry address updated successfully!");
    
    // Verify
    const newRegistry = await approvalNFT.projectRegistry();
    console.log("Verified new registry address:", newRegistry);
    
    if (newRegistry.toLowerCase() === projectRegistryAddress.toLowerCase()) {
      console.log("✅ Verification successful!");
    } else {
      console.error("❌ Verification failed! Addresses don't match.");
    }
  } catch (error: any) {
    if (error.message?.includes("Not owner") || error.message?.includes("Ownable")) {
      console.error("\n❌ ERROR: You are not the owner of the ApprovalNFT contract.");
      console.error("Only the owner can update the registry address.");
      console.error("Owner address needed to call updateRegistry()");
    } else {
      console.error("Error:", error);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

