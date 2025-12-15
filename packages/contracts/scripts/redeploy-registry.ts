import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, "../../.env.local") });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Redeploying ProjectRegistry with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const oldProjectRegistryAddress = process.env.PROJECT_REGISTRY_ADDRESS;
  const approvalNFTAddress = process.env.APPROVAL_NFT_ADDRESS;

  if (!approvalNFTAddress) {
    console.error("❌ APPROVAL_NFT_ADDRESS must be set in .env.local");
    process.exit(1);
  }

  console.log("\n⚠️  WARNING: This will deploy a NEW ProjectRegistry contract.");
  console.log("Old ProjectRegistry:", oldProjectRegistryAddress);
  console.log("ApprovalNFT:", approvalNFTAddress);
  console.log("\nAll existing projects in the old registry will NOT be migrated.");
  console.log("You will need to update PROJECT_REGISTRY_ADDRESS in .env.local after deployment.\n");

  // Deploy new ProjectRegistry
  console.log("Deploying new ProjectRegistry...");
  const ProjectRegistry = await ethers.getContractFactory("ProjectRegistry");
  const projectRegistry = await ProjectRegistry.deploy();
  await projectRegistry.waitForDeployment();
  const projectRegistryAddress = await projectRegistry.getAddress();
  console.log("✅ New ProjectRegistry deployed to:", projectRegistryAddress);

  // Set ApprovalNFT address
  console.log("\nSetting ApprovalNFT address...");
  const setTx = await projectRegistry.setApprovalNFT(approvalNFTAddress);
  await setTx.wait();
  console.log("✅ ApprovalNFT address set");

  // Add curators if specified
  const curatorWallets = process.env.CURATOR_WALLETS?.split(",").map((w) => w.trim()) || [];
  if (curatorWallets.length > 0) {
    console.log("\nAdding curators...");
    for (const curator of curatorWallets) {
      if (curator && curator !== deployer.address) {
        try {
          const tx = await projectRegistry.addCurator(curator);
          await tx.wait();
          console.log(`✅ Added curator: ${curator}`);
        } catch (error) {
          console.error(`❌ Failed to add curator ${curator}:`, error);
        }
      }
    }
  }

  // Add deployer as curator if not already
  try {
    const isCurator = await projectRegistry.isCurator(deployer.address);
    if (!isCurator) {
      const tx = await projectRegistry.addCurator(deployer.address);
      await tx.wait();
      console.log("✅ Added deployer as curator");
    }
  } catch (error) {
    console.error("⚠️  Could not add deployer as curator:", error);
  }

  console.log("\n✅ Redeployment complete!");
  console.log("\n📋 IMPORTANT: Update your .env.local with the new address:");
  console.log(`PROJECT_REGISTRY_ADDRESS=${projectRegistryAddress}`);
  console.log("\n⚠️  Note: You may also need to update the ApprovalNFT's registry address");
  console.log("   if it's hardcoded. Check the ApprovalNFT contract.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

