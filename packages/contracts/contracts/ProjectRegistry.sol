// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IApprovalNFT {
    function mintForProject(address to, uint256 projectId, string memory tokenURI) external returns (uint256);
}

/**
 * @title ProjectRegistry
 * @notice Manages project lifecycle: Draft -> Submitted -> Approved/Rejected
 */
contract ProjectRegistry {
    enum ProjectStatus {
        Draft,
        Submitted,
        Approved,
        Rejected
    }

    struct Project {
        address owner;
        ProjectStatus status;
        string metadataUri;
    }

    mapping(uint256 => Project) public projects;
    mapping(address => bool) public isCurator;
    address public admin;
    uint256 public nextProjectId;
    address public approvalNFT;

    event ProjectCreated(uint256 indexed projectId, address indexed owner, string metadataUri);
    event ProjectMetadataUpdated(uint256 indexed projectId, string metadataUri);
    event ProjectSubmitted(uint256 indexed projectId);
    event ProjectApproved(uint256 indexed projectId);
    event ProjectRejected(uint256 indexed projectId, uint8 reasonCode, string reasonText);
    event CuratorAdded(address indexed curator);
    event CuratorRemoved(address indexed curator);
    event ApprovalNFTUpdated(address indexed newApprovalNFT);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyCurator() {
        require(isCurator[msg.sender] || msg.sender == admin, "Not curator");
        _;
    }

    modifier onlyOwner(uint256 projectId) {
        require(projects[projectId].owner == msg.sender, "Not owner");
        _;
    }

    constructor() {
        admin = msg.sender;
        isCurator[msg.sender] = true;
    }

    function setApprovalNFT(address _approvalNFT) external onlyAdmin {
        approvalNFT = _approvalNFT;
        emit ApprovalNFTUpdated(_approvalNFT);
    }

    function createProject(string memory metadataUri) external returns (uint256) {
        uint256 projectId = nextProjectId++;
        projects[projectId] = Project({
            owner: msg.sender,
            status: ProjectStatus.Draft,
            metadataUri: metadataUri
        });

        emit ProjectCreated(projectId, msg.sender, metadataUri);
        return projectId;
    }

    function updateMetadata(uint256 projectId, string memory metadataUri) 
        external 
        onlyOwner(projectId) 
    {
        Project storage project = projects[projectId];
        require(
            project.status == ProjectStatus.Draft || project.status == ProjectStatus.Rejected,
            "Cannot update metadata"
        );

        project.metadataUri = metadataUri;
        emit ProjectMetadataUpdated(projectId, metadataUri);
    }

    function submit(uint256 projectId) external onlyOwner(projectId) {
        Project storage project = projects[projectId];
        require(
            project.status == ProjectStatus.Draft || project.status == ProjectStatus.Rejected,
            "Invalid status for submission"
        );

        project.status = ProjectStatus.Submitted;
        emit ProjectSubmitted(projectId);
    }

    function approve(uint256 projectId) external onlyCurator {
        Project storage project = projects[projectId];
        require(project.status == ProjectStatus.Submitted, "Not submitted");

        project.status = ProjectStatus.Approved;
        emit ProjectApproved(projectId);
    }

    function mintApprovalNFT(uint256 projectId, address to, string memory tokenURI) 
        external 
        onlyCurator 
        returns (uint256) 
    {
        require(approvalNFT != address(0), "ApprovalNFT not set");
        Project storage project = projects[projectId];
        require(project.status == ProjectStatus.Approved, "Project not approved");
        
        return IApprovalNFT(approvalNFT).mintForProject(to, projectId, tokenURI);
    }

    function reject(uint256 projectId, uint8 reasonCode, string memory reasonText) 
        external 
        onlyCurator 
    {
        Project storage project = projects[projectId];
        require(project.status == ProjectStatus.Submitted, "Not submitted");

        project.status = ProjectStatus.Rejected;
        emit ProjectRejected(projectId, reasonCode, reasonText);
    }

    function addCurator(address curator) external onlyAdmin {
        isCurator[curator] = true;
        emit CuratorAdded(curator);
    }

    function removeCurator(address curator) external onlyAdmin {
        isCurator[curator] = false;
        emit CuratorRemoved(curator);
    }

    function getProject(uint256 projectId) external view returns (
        address owner,
        ProjectStatus status,
        string memory metadataUri
    ) {
        Project memory project = projects[projectId];
        return (project.owner, project.status, project.metadataUri);
    }
}
