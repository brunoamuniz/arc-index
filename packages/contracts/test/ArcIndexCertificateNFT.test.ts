import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ArcIndexCertificateNFT } from "../typechain-types";

describe("ArcIndexCertificateNFT", function () {
  const TOKEN_URI = "ipfs://QmTest123";
  const UPDATED_TOKEN_URI = "ipfs://QmUpdated456";

  async function deployFixture() {
    const [admin, minter, user1, user2] = await ethers.getSigners();

    const CertificateNFT = await ethers.getContractFactory(
      "ArcIndexCertificateNFT"
    );
    const certificateNFT = await CertificateNFT.deploy();
    await certificateNFT.waitForDeployment();

    // Grant MINTER_ROLE to minter
    const MINTER_ROLE = await certificateNFT.MINTER_ROLE();
    await certificateNFT.grantRole(MINTER_ROLE, minter.address);

    return { certificateNFT, admin, minter, user1, user2, MINTER_ROLE };
  }

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      const { certificateNFT } = await loadFixture(deployFixture);
      expect(await certificateNFT.name()).to.equal("Arc Index Certificate");
      expect(await certificateNFT.symbol()).to.equal("ARCC");
    });

    it("Should grant admin role to deployer", async function () {
      const { certificateNFT, admin } = await loadFixture(deployFixture);
      const DEFAULT_ADMIN_ROLE = await certificateNFT.DEFAULT_ADMIN_ROLE();
      expect(await certificateNFT.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to
        .be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint certificate with correct data", async function () {
      const { certificateNFT, minter, user1 } =
        await loadFixture(deployFixture);

      const projectId = 1;
      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, projectId, TOKEN_URI);

      expect(await certificateNFT.ownerOf(1)).to.equal(user1.address);
      expect(await certificateNFT.tokenURI(1)).to.equal(TOKEN_URI);
      expect(await certificateNFT.projectIdToTokenId(projectId)).to.equal(1);
      expect(await certificateNFT.tokenIdToProjectId(1)).to.equal(projectId);
    });

    it("Should emit CertificateMinted event", async function () {
      const { certificateNFT, minter, user1 } =
        await loadFixture(deployFixture);

      await expect(
        certificateNFT
          .connect(minter)
          .mintCertificate(user1.address, 1, TOKEN_URI)
      )
        .to.emit(certificateNFT, "CertificateMinted")
        .withArgs(1, 1, user1.address);
    });

    it("Should increment token IDs", async function () {
      const { certificateNFT, minter, user1 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 1, TOKEN_URI);
      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 2, TOKEN_URI);

      expect(await certificateNFT.projectIdToTokenId(1)).to.equal(1);
      expect(await certificateNFT.projectIdToTokenId(2)).to.equal(2);
    });

    it("Should revert minting by non-minter", async function () {
      const { certificateNFT, user1, user2 } = await loadFixture(deployFixture);

      await expect(
        certificateNFT
          .connect(user1)
          .mintCertificate(user2.address, 1, TOKEN_URI)
      ).to.be.revertedWithCustomError(
        certificateNFT,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should revert minting to zero address", async function () {
      const { certificateNFT, minter } = await loadFixture(deployFixture);

      await expect(
        certificateNFT
          .connect(minter)
          .mintCertificate(ethers.ZeroAddress, 1, TOKEN_URI)
      ).to.be.revertedWithCustomError(certificateNFT, "InvalidAddress");
    });

    it("Should revert minting duplicate project ID", async function () {
      const { certificateNFT, minter, user1 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 1, TOKEN_URI);

      await expect(
        certificateNFT
          .connect(minter)
          .mintCertificate(user1.address, 1, TOKEN_URI)
      )
        .to.be.revertedWithCustomError(certificateNFT, "AlreadyMinted")
        .withArgs(1);
    });
  });

  describe("Soulbound (Non-Transferable)", function () {
    it("Should revert transfer", async function () {
      const { certificateNFT, minter, user1, user2 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 1, TOKEN_URI);

      await expect(
        certificateNFT
          .connect(user1)
          .transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWithCustomError(certificateNFT, "SoulboundToken");
    });

    it("Should revert safeTransferFrom", async function () {
      const { certificateNFT, minter, user1, user2 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 1, TOKEN_URI);

      await expect(
        certificateNFT
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](
            user1.address,
            user2.address,
            1
          )
      ).to.be.revertedWithCustomError(certificateNFT, "SoulboundToken");
    });

    it("Should revert safeTransferFrom with data", async function () {
      const { certificateNFT, minter, user1, user2 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 1, TOKEN_URI);

      await expect(
        certificateNFT
          .connect(user1)
          ["safeTransferFrom(address,address,uint256,bytes)"](
            user1.address,
            user2.address,
            1,
            "0x"
          )
      ).to.be.revertedWithCustomError(certificateNFT, "SoulboundToken");
    });
  });

  describe("Burning", function () {
    it("Should allow admin to burn", async function () {
      const { certificateNFT, admin, minter, user1 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 1, TOKEN_URI);

      await expect(certificateNFT.connect(admin).burn(1))
        .to.emit(certificateNFT, "CertificateBurned")
        .withArgs(1, 1);

      // Verify token is burned
      await expect(certificateNFT.ownerOf(1)).to.be.revertedWithCustomError(
        certificateNFT,
        "ERC721NonexistentToken"
      );

      // Verify mappings are cleared
      expect(await certificateNFT.projectIdToTokenId(1)).to.equal(0);
      expect(await certificateNFT.tokenIdToProjectId(1)).to.equal(0);
    });

    it("Should revert burn by non-admin", async function () {
      const { certificateNFT, minter, user1, user2 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 1, TOKEN_URI);

      await expect(
        certificateNFT.connect(user2).burn(1)
      ).to.be.revertedWithCustomError(
        certificateNFT,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should revert burn of non-existent token", async function () {
      const { certificateNFT, admin } = await loadFixture(deployFixture);

      await expect(certificateNFT.connect(admin).burn(999))
        .to.be.revertedWithCustomError(certificateNFT, "TokenNotFound")
        .withArgs(999);
    });
  });

  describe("View Functions", function () {
    it("Should return token ID for project", async function () {
      const { certificateNFT, minter, user1 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 42, TOKEN_URI);

      expect(await certificateNFT.getTokenIdForProject(42)).to.equal(1);
    });

    it("Should return 0 for unminted project", async function () {
      const { certificateNFT } = await loadFixture(deployFixture);

      expect(await certificateNFT.getTokenIdForProject(999)).to.equal(0);
    });

    it("Should return project ID for token", async function () {
      const { certificateNFT, minter, user1 } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(minter)
        .mintCertificate(user1.address, 42, TOKEN_URI);

      expect(await certificateNFT.getProjectIdForToken(1)).to.equal(42);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant minter role", async function () {
      const { certificateNFT, admin, user1, MINTER_ROLE } =
        await loadFixture(deployFixture);

      await certificateNFT.connect(admin).grantRole(MINTER_ROLE, user1.address);

      expect(await certificateNFT.hasRole(MINTER_ROLE, user1.address)).to.be
        .true;
    });

    it("Should allow admin to revoke minter role", async function () {
      const { certificateNFT, admin, minter, MINTER_ROLE } =
        await loadFixture(deployFixture);

      await certificateNFT
        .connect(admin)
        .revokeRole(MINTER_ROLE, minter.address);

      expect(await certificateNFT.hasRole(MINTER_ROLE, minter.address)).to.be
        .false;
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 interface", async function () {
      const { certificateNFT } = await loadFixture(deployFixture);
      // ERC721 interface ID
      expect(await certificateNFT.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      const { certificateNFT } = await loadFixture(deployFixture);
      // ERC721Metadata interface ID
      expect(await certificateNFT.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      const { certificateNFT } = await loadFixture(deployFixture);
      // AccessControl interface ID
      expect(await certificateNFT.supportsInterface("0x7965db0b")).to.be.true;
    });
  });
});
