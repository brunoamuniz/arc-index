// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IArcIndexCertificateNFT.sol";

/**
 * @title ArcIndexRegistry
 * @notice Main registry for Arc Index projects with curation, ratings, and donations
 * @dev Uses AccessControl for role management, Pausable for emergency stops
 */
contract ArcIndexRegistry is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    /// @notice USDC token address on Arc Testnet
    address public constant USDC = 0x3600000000000000000000000000000000000000;

    /// @notice Maximum fee in basis points (100% = 10000)
    uint16 public constant MAX_FEE_BPS = 10000;

    /// @notice Project status enum
    enum Status {
        None,
        Pending,
        Approved,
        Rejected
    }

    /// @notice Project data structure
    struct Project {
        address owner;
        Status status;
        string metadataURI;
        uint64 submittedAt;
        uint64 approvedAt;
        address approvedBy;
        uint256 certificateTokenId;
        uint32 ratingCount;
        uint32 ratingSum;
        uint256 totalDonatedUSDC6;
    }

    /// @notice Certificate NFT contract
    IArcIndexCertificateNFT public certificateNFT;

    /// @notice Treasury address for fee collection
    address public treasury;

    /// @notice Fee in basis points (e.g., 250 = 2.5%)
    uint16 public feeBps;

    /// @notice Next project ID counter
    uint256 public nextProjectId;

    /// @notice Mapping of project ID to Project data
    mapping(uint256 => Project) public projects;

    /// @notice Mapping of user address to project ID to their rating (0 = not rated)
    mapping(address => mapping(uint256 => uint8)) public userRatings;

    // Events
    event ProjectSubmitted(
        uint256 indexed projectId,
        address indexed owner,
        string metadataURI
    );

    event ProjectMetadataUpdated(
        uint256 indexed projectId,
        string metadataURI
    );

    event CuratorAdded(address indexed curator);

    event CuratorRemoved(address indexed curator);

    event ProjectApproved(
        uint256 indexed projectId,
        address indexed curator,
        uint256 certificateTokenId
    );

    event ProjectRejected(
        uint256 indexed projectId,
        address indexed curator,
        string reason
    );

    event ProjectRated(
        uint256 indexed projectId,
        address indexed rater,
        uint8 stars,
        uint32 newRatingCount,
        uint32 newRatingSum
    );

    event ProjectDonated(
        uint256 indexed projectId,
        address indexed donor,
        uint256 amount,
        uint256 fee
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    event FeeBpsUpdated(uint16 oldFeeBps, uint16 newFeeBps);

    // Custom Errors
    error ProjectNotFound();
    error InvalidStatus();
    error NotProjectOwner();
    error InvalidRating();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidFeeBps();

    /**
     * @notice Constructor
     * @param _certificateNFT Address of the certificate NFT contract
     * @param _treasury Address of the treasury for fee collection
     * @param _feeBps Initial fee in basis points
     */
    constructor(
        address _certificateNFT,
        address _treasury,
        uint16 _feeBps
    ) {
        if (_certificateNFT == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidFeeBps();

        certificateNFT = IArcIndexCertificateNFT(_certificateNFT);
        treasury = _treasury;
        feeBps = _feeBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CURATOR_ROLE, msg.sender);

        // Start project IDs at 1 so 0 can represent "not found"
        nextProjectId = 1;
    }

    // ============ Project Submission ============

    /**
     * @notice Submit a new project for curation
     * @param metadataURI IPFS URI containing project metadata
     * @return projectId The ID of the newly created project
     */
    function submitProject(string calldata metadataURI)
        external
        whenNotPaused
        returns (uint256)
    {
        uint256 projectId = nextProjectId++;

        projects[projectId] = Project({
            owner: msg.sender,
            status: Status.Pending,
            metadataURI: metadataURI,
            submittedAt: uint64(block.timestamp),
            approvedAt: 0,
            approvedBy: address(0),
            certificateTokenId: 0,
            ratingCount: 0,
            ratingSum: 0,
            totalDonatedUSDC6: 0
        });

        emit ProjectSubmitted(projectId, msg.sender, metadataURI);

        return projectId;
    }

    /**
     * @notice Update project metadata (owner only, Pending/Rejected status only)
     * @param projectId The project ID
     * @param metadataURI New metadata URI
     */
    function updateProjectMetadata(uint256 projectId, string calldata metadataURI)
        external
        whenNotPaused
    {
        Project storage project = projects[projectId];

        if (project.owner == address(0)) revert ProjectNotFound();
        if (project.owner != msg.sender) revert NotProjectOwner();
        if (project.status != Status.Pending && project.status != Status.Rejected) {
            revert InvalidStatus();
        }

        project.metadataURI = metadataURI;

        emit ProjectMetadataUpdated(projectId, metadataURI);
    }

    // ============ Curation ============

    /**
     * @notice Approve a project and mint certificate NFT
     * @param projectId The project ID to approve
     */
    function approveProject(uint256 projectId)
        external
        onlyRole(CURATOR_ROLE)
        whenNotPaused
    {
        Project storage project = projects[projectId];

        if (project.owner == address(0)) revert ProjectNotFound();
        if (project.status != Status.Pending) revert InvalidStatus();

        project.status = Status.Approved;
        project.approvedAt = uint64(block.timestamp);
        project.approvedBy = msg.sender;

        // Mint certificate NFT to project owner
        uint256 tokenId = certificateNFT.mintCertificate(
            project.owner,
            projectId,
            project.metadataURI
        );
        project.certificateTokenId = tokenId;

        emit ProjectApproved(projectId, msg.sender, tokenId);
    }

    /**
     * @notice Reject a project
     * @param projectId The project ID to reject
     * @param reason Reason for rejection
     */
    function rejectProject(uint256 projectId, string calldata reason)
        external
        onlyRole(CURATOR_ROLE)
        whenNotPaused
    {
        Project storage project = projects[projectId];

        if (project.owner == address(0)) revert ProjectNotFound();
        if (project.status != Status.Pending) revert InvalidStatus();

        project.status = Status.Rejected;

        emit ProjectRejected(projectId, msg.sender, reason);
    }

    // ============ Ratings ============

    /**
     * @notice Rate a project (1-5 stars)
     * @dev Users can update their rating, aggregates are adjusted accordingly
     * @param projectId The project ID to rate
     * @param stars Rating from 1 to 5
     */
    function rateProject(uint256 projectId, uint8 stars)
        external
        whenNotPaused
    {
        if (stars < 1 || stars > 5) revert InvalidRating();

        Project storage project = projects[projectId];

        if (project.owner == address(0)) revert ProjectNotFound();
        if (project.status != Status.Approved) revert InvalidStatus();

        uint8 previousRating = userRatings[msg.sender][projectId];

        if (previousRating == 0) {
            // New rating
            project.ratingCount++;
            project.ratingSum += stars;
        } else {
            // Update existing rating - adjust sum
            project.ratingSum = project.ratingSum - previousRating + stars;
        }

        userRatings[msg.sender][projectId] = stars;

        emit ProjectRated(
            projectId,
            msg.sender,
            stars,
            project.ratingCount,
            project.ratingSum
        );
    }

    // ============ Donations ============

    /**
     * @notice Donate USDC to a project
     * @dev Fee is deducted and sent to treasury, remainder goes to project owner
     * @param projectId The project ID to donate to
     * @param amount Amount of USDC (6 decimals) to donate
     */
    function donateToProject(uint256 projectId, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert InvalidAmount();

        Project storage project = projects[projectId];

        if (project.owner == address(0)) revert ProjectNotFound();
        if (project.status != Status.Approved) revert InvalidStatus();

        // Calculate fee
        uint256 fee = (amount * feeBps) / MAX_FEE_BPS;
        uint256 toProject = amount - fee;

        // Transfer USDC from donor
        IERC20 usdc = IERC20(USDC);
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Send fee to treasury
        if (fee > 0) {
            usdc.safeTransfer(treasury, fee);
        }

        // Send remainder to project owner
        usdc.safeTransfer(project.owner, toProject);

        project.totalDonatedUSDC6 += amount;

        emit ProjectDonated(projectId, msg.sender, amount, fee);
    }

    // ============ Admin Functions ============

    /**
     * @notice Add a curator
     * @param curator Address to grant curator role
     */
    function addCurator(address curator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (curator == address(0)) revert InvalidAddress();
        _grantRole(CURATOR_ROLE, curator);
        emit CuratorAdded(curator);
    }

    /**
     * @notice Remove a curator
     * @param curator Address to revoke curator role from
     */
    function removeCurator(address curator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _revokeRole(CURATOR_ROLE, curator);
        emit CuratorRemoved(curator);
    }

    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (newTreasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Update fee basis points
     * @param newFeeBps New fee in basis points
     */
    function setFeeBps(uint16 newFeeBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFeeBps();
        uint16 oldFeeBps = feeBps;
        feeBps = newFeeBps;
        emit FeeBpsUpdated(oldFeeBps, newFeeBps);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get project details
     * @param projectId The project ID
     * @return owner Project owner address
     * @return status Project status
     * @return metadataURI Project metadata URI
     * @return submittedAt Submission timestamp
     * @return approvedAt Approval timestamp (0 if not approved)
     * @return approvedBy Curator who approved (address(0) if not approved)
     * @return certificateTokenId NFT token ID (0 if not minted)
     * @return ratingCount Number of ratings
     * @return ratingSum Sum of all ratings
     * @return totalDonatedUSDC6 Total USDC donated (6 decimals)
     */
    function getProject(uint256 projectId)
        external
        view
        returns (
            address owner,
            Status status,
            string memory metadataURI,
            uint64 submittedAt,
            uint64 approvedAt,
            address approvedBy,
            uint256 certificateTokenId,
            uint32 ratingCount,
            uint32 ratingSum,
            uint256 totalDonatedUSDC6
        )
    {
        Project memory project = projects[projectId];
        return (
            project.owner,
            project.status,
            project.metadataURI,
            project.submittedAt,
            project.approvedAt,
            project.approvedBy,
            project.certificateTokenId,
            project.ratingCount,
            project.ratingSum,
            project.totalDonatedUSDC6
        );
    }

    /**
     * @notice Get a user's rating for a project
     * @param user User address
     * @param projectId Project ID
     * @return rating The user's rating (0 = not rated)
     */
    function getUserRating(address user, uint256 projectId)
        external
        view
        returns (uint8)
    {
        return userRatings[user][projectId];
    }

    /**
     * @notice Calculate the average rating for a project
     * @param projectId Project ID
     * @return average Average rating multiplied by 100 (e.g., 450 = 4.50 stars)
     */
    function getAverageRating(uint256 projectId)
        external
        view
        returns (uint256)
    {
        Project memory project = projects[projectId];
        if (project.ratingCount == 0) return 0;
        return (uint256(project.ratingSum) * 100) / project.ratingCount;
    }
}
