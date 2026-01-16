import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  ArcIndexRegistry,
  ArcIndexCertificateNFT,
  MockUSDC,
} from "../typechain-types";

describe("ArcIndexRegistry", function () {
  const FEE_BPS = 250; // 2.5%
  const METADATA_URI = "ipfs://QmTest123";
  const UPDATED_METADATA_URI = "ipfs://QmUpdated456";

  async function deployFixture() {
    const [admin, curator, user1, user2, treasury] = await ethers.getSigners();

    // Deploy Certificate NFT
    const CertificateNFT = await ethers.getContractFactory(
      "ArcIndexCertificateNFT"
    );
    const certificateNFT = await CertificateNFT.deploy();
    await certificateNFT.waitForDeployment();

    // Deploy Mock USDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy Registry
    const Registry = await ethers.getContractFactory("ArcIndexRegistry");
    const registry = await Registry.deploy(
      await certificateNFT.getAddress(),
      treasury.address,
      FEE_BPS
    );
    await registry.waitForDeployment();

    // Grant MINTER_ROLE to Registry on Certificate NFT
    const MINTER_ROLE = await certificateNFT.MINTER_ROLE();
    await certificateNFT.grantRole(MINTER_ROLE, await registry.getAddress());

    // Add curator
    await registry.addCurator(curator.address);

    return {
      registry,
      certificateNFT,
      mockUSDC,
      admin,
      curator,
      user1,
      user2,
      treasury,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct certificate NFT address", async function () {
      const { registry, certificateNFT } = await loadFixture(deployFixture);
      expect(await registry.certificateNFT()).to.equal(
        await certificateNFT.getAddress()
      );
    });

    it("Should set the correct treasury", async function () {
      const { registry, treasury } = await loadFixture(deployFixture);
      expect(await registry.treasury()).to.equal(treasury.address);
    });

    it("Should set the correct fee", async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.feeBps()).to.equal(FEE_BPS);
    });

    it("Should grant admin role to deployer", async function () {
      const { registry, admin } = await loadFixture(deployFixture);
      const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be
        .true;
    });

    it("Should grant curator role to deployer", async function () {
      const { registry, admin } = await loadFixture(deployFixture);
      const CURATOR_ROLE = await registry.CURATOR_ROLE();
      expect(await registry.hasRole(CURATOR_ROLE, admin.address)).to.be.true;
    });

    it("Should start project IDs at 1", async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.nextProjectId()).to.equal(1);
    });

    it("Should revert with invalid certificate NFT address", async function () {
      const [, , , , treasury] = await ethers.getSigners();
      const Registry = await ethers.getContractFactory("ArcIndexRegistry");
      await expect(
        Registry.deploy(ethers.ZeroAddress, treasury.address, FEE_BPS)
      ).to.be.revertedWithCustomError(Registry, "InvalidAddress");
    });

    it("Should revert with invalid treasury address", async function () {
      const { certificateNFT } = await loadFixture(deployFixture);
      const Registry = await ethers.getContractFactory("ArcIndexRegistry");
      await expect(
        Registry.deploy(
          await certificateNFT.getAddress(),
          ethers.ZeroAddress,
          FEE_BPS
        )
      ).to.be.revertedWithCustomError(Registry, "InvalidAddress");
    });

    it("Should revert with invalid fee bps", async function () {
      const { certificateNFT, treasury } = await loadFixture(deployFixture);
      const Registry = await ethers.getContractFactory("ArcIndexRegistry");
      await expect(
        Registry.deploy(
          await certificateNFT.getAddress(),
          treasury.address,
          10001 // > MAX_FEE_BPS
        )
      ).to.be.revertedWithCustomError(Registry, "InvalidFeeBps");
    });
  });

  describe("Project Submission", function () {
    it("Should submit a project successfully", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      await expect(registry.connect(user1).submitProject(METADATA_URI))
        .to.emit(registry, "ProjectSubmitted")
        .withArgs(1, user1.address, METADATA_URI);

      const project = await registry.getProject(1);
      expect(project.owner).to.equal(user1.address);
      expect(project.status).to.equal(1); // Pending
      expect(project.metadataURI).to.equal(METADATA_URI);
    });

    it("Should increment project ID", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      expect(await registry.nextProjectId()).to.equal(2);

      await registry.connect(user1).submitProject(METADATA_URI);
      expect(await registry.nextProjectId()).to.equal(3);
    });

    it("Should not submit when paused", async function () {
      const { registry, admin, user1 } = await loadFixture(deployFixture);

      await registry.connect(admin).pause();
      await expect(
        registry.connect(user1).submitProject(METADATA_URI)
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");
    });
  });

  describe("Update Project Metadata", function () {
    it("Should update metadata for pending project", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      await expect(
        registry.connect(user1).updateProjectMetadata(1, UPDATED_METADATA_URI)
      )
        .to.emit(registry, "ProjectMetadataUpdated")
        .withArgs(1, UPDATED_METADATA_URI);

      const project = await registry.getProject(1);
      expect(project.metadataURI).to.equal(UPDATED_METADATA_URI);
    });

    it("Should update metadata for rejected project", async function () {
      const { registry, curator, user1 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).rejectProject(1, "Needs improvement");

      await expect(
        registry.connect(user1).updateProjectMetadata(1, UPDATED_METADATA_URI)
      ).to.emit(registry, "ProjectMetadataUpdated");
    });

    it("Should revert for non-owner", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      await expect(
        registry.connect(user2).updateProjectMetadata(1, UPDATED_METADATA_URI)
      ).to.be.revertedWithCustomError(registry, "NotProjectOwner");
    });

    it("Should revert for approved project", async function () {
      const { registry, curator, user1 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await expect(
        registry.connect(user1).updateProjectMetadata(1, UPDATED_METADATA_URI)
      ).to.be.revertedWithCustomError(registry, "InvalidStatus");
    });

    it("Should revert for non-existent project", async function () {
      const { registry, user1 } = await loadFixture(deployFixture);

      await expect(
        registry.connect(user1).updateProjectMetadata(999, UPDATED_METADATA_URI)
      ).to.be.revertedWithCustomError(registry, "ProjectNotFound");
    });
  });

  describe("Project Approval", function () {
    it("Should approve a project and mint NFT", async function () {
      const { registry, certificateNFT, curator, user1 } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      const tx = await registry.connect(curator).approveProject(1);

      await expect(tx)
        .to.emit(registry, "ProjectApproved")
        .withArgs(1, curator.address, 1);

      const project = await registry.getProject(1);
      expect(project.status).to.equal(2); // Approved
      expect(project.approvedBy).to.equal(curator.address);
      expect(project.certificateTokenId).to.equal(1);

      // Verify NFT was minted
      expect(await certificateNFT.ownerOf(1)).to.equal(user1.address);
      expect(await certificateNFT.getProjectIdForToken(1)).to.equal(1);
    });

    it("Should revert for non-curator", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      await expect(
        registry.connect(user2).approveProject(1)
      ).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should revert for non-pending project", async function () {
      const { registry, curator, user1 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await expect(
        registry.connect(curator).approveProject(1)
      ).to.be.revertedWithCustomError(registry, "InvalidStatus");
    });

    it("Should revert for non-existent project", async function () {
      const { registry, curator } = await loadFixture(deployFixture);

      await expect(
        registry.connect(curator).approveProject(999)
      ).to.be.revertedWithCustomError(registry, "ProjectNotFound");
    });
  });

  describe("Project Rejection", function () {
    it("Should reject a project", async function () {
      const { registry, curator, user1 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      await expect(
        registry.connect(curator).rejectProject(1, "Insufficient detail")
      )
        .to.emit(registry, "ProjectRejected")
        .withArgs(1, curator.address, "Insufficient detail");

      const project = await registry.getProject(1);
      expect(project.status).to.equal(3); // Rejected
    });

    it("Should revert for non-curator", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      await expect(
        registry.connect(user2).rejectProject(1, "reason")
      ).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should revert for non-pending project", async function () {
      const { registry, curator, user1 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).rejectProject(1, "reason");

      await expect(
        registry.connect(curator).rejectProject(1, "reason again")
      ).to.be.revertedWithCustomError(registry, "InvalidStatus");
    });
  });

  describe("Ratings", function () {
    it("Should rate a project", async function () {
      const { registry, curator, user1, user2 } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await expect(registry.connect(user2).rateProject(1, 5))
        .to.emit(registry, "ProjectRated")
        .withArgs(1, user2.address, 5, 1, 5);

      const project = await registry.getProject(1);
      expect(project.ratingCount).to.equal(1);
      expect(project.ratingSum).to.equal(5);
    });

    it("Should allow rating update and adjust aggregates", async function () {
      const { registry, curator, user1, user2 } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      // First rating
      await registry.connect(user2).rateProject(1, 5);
      let project = await registry.getProject(1);
      expect(project.ratingCount).to.equal(1);
      expect(project.ratingSum).to.equal(5);

      // Update rating
      await expect(registry.connect(user2).rateProject(1, 3))
        .to.emit(registry, "ProjectRated")
        .withArgs(1, user2.address, 3, 1, 3);

      project = await registry.getProject(1);
      expect(project.ratingCount).to.equal(1); // Count should stay the same
      expect(project.ratingSum).to.equal(3); // Sum should be updated
    });

    it("Should track user ratings", async function () {
      const { registry, curator, user1, user2 } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await registry.connect(user2).rateProject(1, 4);
      expect(await registry.getUserRating(user2.address, 1)).to.equal(4);
    });

    it("Should calculate average rating", async function () {
      const { registry, curator, user1, user2, admin } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await registry.connect(user2).rateProject(1, 5);
      await registry.connect(admin).rateProject(1, 3);

      // Average = (5 + 3) / 2 = 4.00 = 400 (scaled by 100)
      expect(await registry.getAverageRating(1)).to.equal(400);
    });

    it("Should revert for invalid rating (0)", async function () {
      const { registry, curator, user1, user2 } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await expect(
        registry.connect(user2).rateProject(1, 0)
      ).to.be.revertedWithCustomError(registry, "InvalidRating");
    });

    it("Should revert for invalid rating (6)", async function () {
      const { registry, curator, user1, user2 } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await expect(
        registry.connect(user2).rateProject(1, 6)
      ).to.be.revertedWithCustomError(registry, "InvalidRating");
    });

    it("Should revert for non-approved project", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      await expect(
        registry.connect(user2).rateProject(1, 5)
      ).to.be.revertedWithCustomError(registry, "InvalidStatus");
    });
  });

  describe("Donations", function () {
    async function deployWithMockUSDC() {
      const fixture = await loadFixture(deployFixture);
      const { registry, mockUSDC, curator, user1, user2, treasury } = fixture;

      // Override USDC address in test by deploying a modified registry
      // For testing, we'll use impersonation to set code at USDC address
      // Since we can't easily change the constant, we'll test the logic differently

      return fixture;
    }

    it("Should revert for zero amount donation", async function () {
      const { registry, curator, user1, user2 } =
        await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);
      await registry.connect(curator).approveProject(1);

      await expect(
        registry.connect(user2).donateToProject(1, 0)
      ).to.be.revertedWithCustomError(registry, "InvalidAmount");
    });

    it("Should revert donation for non-approved project", async function () {
      const { registry, user1, user2 } = await loadFixture(deployFixture);

      await registry.connect(user1).submitProject(METADATA_URI);

      await expect(
        registry.connect(user2).donateToProject(1, 1000000)
      ).to.be.revertedWithCustomError(registry, "InvalidStatus");
    });

    it("Should revert donation for non-existent project", async function () {
      const { registry, user2 } = await loadFixture(deployFixture);

      await expect(
        registry.connect(user2).donateToProject(999, 1000000)
      ).to.be.revertedWithCustomError(registry, "ProjectNotFound");
    });
  });

  describe("Admin Functions", function () {
    describe("Curator Management", function () {
      it("Should add a curator", async function () {
        const { registry, admin, user2 } = await loadFixture(deployFixture);

        await expect(registry.connect(admin).addCurator(user2.address))
          .to.emit(registry, "CuratorAdded")
          .withArgs(user2.address);

        const CURATOR_ROLE = await registry.CURATOR_ROLE();
        expect(await registry.hasRole(CURATOR_ROLE, user2.address)).to.be.true;
      });

      it("Should remove a curator", async function () {
        const { registry, admin, curator } = await loadFixture(deployFixture);

        await expect(registry.connect(admin).removeCurator(curator.address))
          .to.emit(registry, "CuratorRemoved")
          .withArgs(curator.address);

        const CURATOR_ROLE = await registry.CURATOR_ROLE();
        expect(await registry.hasRole(CURATOR_ROLE, curator.address)).to.be
          .false;
      });

      it("Should revert adding zero address curator", async function () {
        const { registry, admin } = await loadFixture(deployFixture);

        await expect(
          registry.connect(admin).addCurator(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(registry, "InvalidAddress");
      });

      it("Should revert non-admin adding curator", async function () {
        const { registry, user1, user2 } = await loadFixture(deployFixture);

        await expect(
          registry.connect(user1).addCurator(user2.address)
        ).to.be.revertedWithCustomError(
          registry,
          "AccessControlUnauthorizedAccount"
        );
      });
    });

    describe("Treasury Management", function () {
      it("Should update treasury", async function () {
        const { registry, admin, treasury, user2 } =
          await loadFixture(deployFixture);

        await expect(registry.connect(admin).setTreasury(user2.address))
          .to.emit(registry, "TreasuryUpdated")
          .withArgs(treasury.address, user2.address);

        expect(await registry.treasury()).to.equal(user2.address);
      });

      it("Should revert setting zero address treasury", async function () {
        const { registry, admin } = await loadFixture(deployFixture);

        await expect(
          registry.connect(admin).setTreasury(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(registry, "InvalidAddress");
      });

      it("Should revert non-admin setting treasury", async function () {
        const { registry, user1, user2 } = await loadFixture(deployFixture);

        await expect(
          registry.connect(user1).setTreasury(user2.address)
        ).to.be.revertedWithCustomError(
          registry,
          "AccessControlUnauthorizedAccount"
        );
      });
    });

    describe("Fee Management", function () {
      it("Should update fee", async function () {
        const { registry, admin } = await loadFixture(deployFixture);

        await expect(registry.connect(admin).setFeeBps(500))
          .to.emit(registry, "FeeBpsUpdated")
          .withArgs(FEE_BPS, 500);

        expect(await registry.feeBps()).to.equal(500);
      });

      it("Should revert setting fee above max", async function () {
        const { registry, admin } = await loadFixture(deployFixture);

        await expect(
          registry.connect(admin).setFeeBps(10001)
        ).to.be.revertedWithCustomError(registry, "InvalidFeeBps");
      });

      it("Should revert non-admin setting fee", async function () {
        const { registry, user1 } = await loadFixture(deployFixture);

        await expect(
          registry.connect(user1).setFeeBps(500)
        ).to.be.revertedWithCustomError(
          registry,
          "AccessControlUnauthorizedAccount"
        );
      });
    });

    describe("Pausable", function () {
      it("Should pause the contract", async function () {
        const { registry, admin } = await loadFixture(deployFixture);

        await registry.connect(admin).pause();
        expect(await registry.paused()).to.be.true;
      });

      it("Should unpause the contract", async function () {
        const { registry, admin } = await loadFixture(deployFixture);

        await registry.connect(admin).pause();
        await registry.connect(admin).unpause();
        expect(await registry.paused()).to.be.false;
      });

      it("Should block operations when paused", async function () {
        const { registry, admin, user1 } = await loadFixture(deployFixture);

        await registry.connect(admin).pause();

        await expect(
          registry.connect(user1).submitProject(METADATA_URI)
        ).to.be.revertedWithCustomError(registry, "EnforcedPause");
      });

      it("Should revert non-admin pausing", async function () {
        const { registry, user1 } = await loadFixture(deployFixture);

        await expect(
          registry.connect(user1).pause()
        ).to.be.revertedWithCustomError(
          registry,
          "AccessControlUnauthorizedAccount"
        );
      });
    });
  });
});
