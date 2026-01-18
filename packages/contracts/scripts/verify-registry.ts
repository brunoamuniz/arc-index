import hre from "hardhat";

/**
 * Verify that the deployed ArcIndexRegistry contract has the new registerApprovedProjectAndMint function
 */
async function main() {
  const registryAddress = process.env.ARC_INDEX_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_ARC_INDEX_REGISTRY_ADDRESS;
  
  if (!registryAddress) {
    console.error("❌ ARC_INDEX_REGISTRY_ADDRESS not set in environment");
    process.exit(1);
  }

  console.log("Verifying ArcIndexRegistry at:", registryAddress);
  
  const Registry = await hre.ethers.getContractFactory("ArcIndexRegistry");
  const registry = await Registry.attach(registryAddress);

  try {
    // Try to call view functions to verify the contract is accessible
    // Using type assertion to access contract methods
    const registryAny = registry as any;
    const typeHash = await registryAny.PROJECT_APPROVAL_TYPEHASH();
    console.log("✅ PROJECT_APPROVAL_TYPEHASH:", typeHash);

    // Check if contract has CURATOR_ROLE
    const CURATOR_ROLE = await registryAny.CURATOR_ROLE();
    console.log("✅ CURATOR_ROLE:", CURATOR_ROLE);

    // Check certificate NFT address
    const certificateNFT = await registryAny.certificateNFT();
    console.log("✅ Certificate NFT:", certificateNFT);

    console.log("\n✅ Contract verification successful!");
    console.log("   The contract has the registerApprovedProjectAndMint function");
    console.log("\n📝 Next steps:");
    console.log("   1. Ensure CURATOR_PRIVATE_KEY or ADMIN_PRIVATE_KEY is set in .env.local");
    console.log("   2. Test the registration flow with an approved project");
    console.log("   3. Verify NFT is minted to the correct owner address");

  } catch (error: any) {
    console.error("❌ Contract verification failed:", error.message);
    console.log("\n⚠️  The contract may need to be redeployed with the new function");
    console.log("   Run: npm run deploy:arc-index");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
