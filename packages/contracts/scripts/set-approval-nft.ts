import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, "../../.env.local") });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting ApprovalNFT address with account:", deployer.address);
  
  const projectRegistryAddress = process.env.PROJECT_REGISTRY_ADDRESS;
  const approvalNFTAddress = process.env.APPROVAL_NFT_ADDRESS;

  if (!projectRegistryAddress || !approvalNFTAddress) {
    console.error("❌ PROJECT_REGISTRY_ADDRESS and APPROVAL_NFT_ADDRESS must be set in .env.local");
    process.exit(1);
  }

  console.log("ProjectRegistry:", projectRegistryAddress);
  console.log("ApprovalNFT:", approvalNFTAddress);

  // Get the contract instance
  const ProjectRegistry = await ethers.getContractFactory("ProjectRegistry");
  const projectRegistry = ProjectRegistry.attach(projectRegistryAddress) as any;

  // Check if the function exists (will fail if contract doesn't have it)
  try {
    console.log("\nSetting ApprovalNFT address...");
    const tx = await projectRegistry.setApprovalNFT(approvalNFTAddress);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ ApprovalNFT address set successfully!");

    // Verify
    const setAddress = await projectRegistry.approvalNFT();
    console.log("Verified ApprovalNFT address:", setAddress);
  } catch (error: any) {
    if (error.message?.includes("setApprovalNFT")) {
      console.error("\n❌ ERROR: The deployed ProjectRegistry contract doesn't have the 'setApprovalNFT' function.");
      console.error("This means the contract needs to be redeployed with the updated code.");
      console.error("\nTo fix this:");
      console.error("1. Redeploy ProjectRegistry with the new code that includes 'mintApprovalNFT' function");
      console.error("2. Update PROJECT_REGISTRY_ADDRESS in .env.local");
      console.error("3. Run this script again to set the ApprovalNFT address");
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

