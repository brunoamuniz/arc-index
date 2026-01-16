import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying Arc Index contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Configuration from environment
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const FEE_BPS = parseInt(process.env.FEE_BPS || "250", 10); // Default 2.5%
  const CURATOR_WALLETS = process.env.CURATOR_WALLETS?.split(",").filter(Boolean) || [];

  console.log("\nConfiguration:");
  console.log("- Treasury:", TREASURY_ADDRESS);
  console.log("- Fee BPS:", FEE_BPS);
  console.log("- Curators:", CURATOR_WALLETS.length > 0 ? CURATOR_WALLETS.join(", ") : "None (deployer only)");

  // 1. Deploy ArcIndexCertificateNFT
  console.log("\n1. Deploying ArcIndexCertificateNFT...");
  const CertificateNFT = await ethers.getContractFactory("ArcIndexCertificateNFT");
  const certificateNFT = await CertificateNFT.deploy();
  await certificateNFT.waitForDeployment();
  const certificateNFTAddress = await certificateNFT.getAddress();
  console.log("   ArcIndexCertificateNFT deployed to:", certificateNFTAddress);

  // 2. Deploy ArcIndexRegistry
  console.log("\n2. Deploying ArcIndexRegistry...");
  const Registry = await ethers.getContractFactory("ArcIndexRegistry");
  const registry = await Registry.deploy(
    certificateNFTAddress,
    TREASURY_ADDRESS,
    FEE_BPS
  );
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   ArcIndexRegistry deployed to:", registryAddress);

  // 3. Grant MINTER_ROLE to Registry on CertificateNFT
  console.log("\n3. Granting MINTER_ROLE to Registry...");
  const MINTER_ROLE = await certificateNFT.MINTER_ROLE();
  const grantTx = await certificateNFT.grantRole(MINTER_ROLE, registryAddress);
  await grantTx.wait();
  console.log("   MINTER_ROLE granted to Registry");

  // 4. Add curators from environment
  if (CURATOR_WALLETS.length > 0) {
    console.log("\n4. Adding curators...");
    for (const curator of CURATOR_WALLETS) {
      const trimmedCurator = curator.trim();
      if (ethers.isAddress(trimmedCurator)) {
        const addCuratorTx = await registry.addCurator(trimmedCurator);
        await addCuratorTx.wait();
        console.log("   Added curator:", trimmedCurator);
      } else {
        console.log("   Skipping invalid address:", curator);
      }
    }
  } else {
    console.log("\n4. No additional curators to add");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  ArcIndexCertificateNFT:", certificateNFTAddress);
  console.log("  ArcIndexRegistry:      ", registryAddress);
  console.log("\nNetwork Info:");
  const network = await ethers.provider.getNetwork();
  console.log("  Chain ID:", network.chainId.toString());
  console.log("  Network:", network.name);
  console.log("\nNext Steps:");
  console.log("  1. Update frontend with new contract addresses");
  console.log("  2. Verify contracts on block explorer (if available)");
  console.log("  3. Test project submission and approval flow");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
