import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, "../../.env.local") });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy ProjectRegistry
  console.log("\nDeploying ProjectRegistry...");
  const ProjectRegistry = await ethers.getContractFactory("ProjectRegistry");
  const projectRegistry = await ProjectRegistry.deploy();
  await projectRegistry.waitForDeployment();
  const projectRegistryAddress = await projectRegistry.getAddress();
  console.log("ProjectRegistry deployed to:", projectRegistryAddress);

  // Deploy ApprovalNFT
  console.log("\nDeploying ApprovalNFT...");
  const ApprovalNFT = await ethers.getContractFactory("ApprovalNFT");
  const approvalNFT = await ApprovalNFT.deploy(projectRegistryAddress);
  await approvalNFT.waitForDeployment();
  const approvalNFTAddress = await approvalNFT.getAddress();
  console.log("ApprovalNFT deployed to:", approvalNFTAddress);

  // Set ApprovalNFT address in ProjectRegistry
  console.log("\nSetting ApprovalNFT address in ProjectRegistry...");
  try {
    const setTx = await projectRegistry.setApprovalNFT(approvalNFTAddress);
    await setTx.wait();
    console.log("✅ ApprovalNFT address set in ProjectRegistry");
  } catch (error: any) {
    console.error("⚠️  Could not set ApprovalNFT address:", error.message);
    console.log("You may need to set it manually using the setApprovalNFT function");
  }

  // Deploy Ratings
  console.log("\nDeploying Ratings...");
  const Ratings = await ethers.getContractFactory("Ratings");
  const ratings = await Ratings.deploy(projectRegistryAddress);
  await ratings.waitForDeployment();
  const ratingsAddress = await ratings.getAddress();
  console.log("Ratings deployed to:", ratingsAddress);

  // Deploy Funding (requires USDC address)
  const usdcAddress = process.env.USDC_ADDRESS;
  let fundingAddress: string | undefined;
  if (!usdcAddress) {
    console.log("\n⚠️  USDC_ADDRESS not set, skipping Funding deployment");
  } else {
    console.log("\nDeploying Funding...");
    const Funding = await ethers.getContractFactory("Funding");
    const funding = await Funding.deploy(projectRegistryAddress, usdcAddress);
    await funding.waitForDeployment();
    fundingAddress = await funding.getAddress();
    console.log("Funding deployed to:", fundingAddress);
  }

  // Add curators if specified
  const curatorWallets = process.env.CURATOR_WALLETS?.split(",").map((w) => w.trim()) || [];
  if (curatorWallets.length > 0) {
    console.log("\nAdding curators...");
    for (const curator of curatorWallets) {
      if (curator && curator !== deployer.address) {
        try {
          const tx = await projectRegistry.addCurator(curator);
          await tx.wait();
          console.log(`Added curator: ${curator}`);
        } catch (error) {
          console.error(`Failed to add curator ${curator}:`, error);
        }
      }
    }
  }

  console.log("\n✅ Deployment complete!");
  console.log("\n📋 Contract addresses (add to .env.local):");
  console.log("PROJECT_REGISTRY_ADDRESS=", projectRegistryAddress);
  console.log("APPROVAL_NFT_ADDRESS=", approvalNFTAddress);
  console.log("RATINGS_ADDRESS=", ratingsAddress);
  if (fundingAddress) {
    console.log("FUNDING_ADDRESS=", fundingAddress);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

