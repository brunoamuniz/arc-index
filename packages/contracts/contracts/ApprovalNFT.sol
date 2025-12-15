// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ApprovalNFT
 * @notice ERC-721 NFT minted when a project is approved
 */
contract ApprovalNFT is ERC721URIStorage, Ownable {
    address public projectRegistry;
    mapping(uint256 => uint256) public projectIdToTokenId;
    mapping(uint256 => uint256) public tokenIdToProjectId;
    uint256 private _nextTokenId;

    event ApprovalMinted(uint256 indexed projectId, uint256 indexed tokenId, address indexed to);

    modifier onlyRegistry() {
        require(msg.sender == projectRegistry, "Not registry");
        _;
    }

    constructor(address _projectRegistry) ERC721("Arc Index Approval", "ARCA") Ownable(msg.sender) {
        projectRegistry = _projectRegistry;
    }

    function mintForProject(address to, uint256 projectId, string memory tokenURI) 
        external 
        onlyRegistry 
        returns (uint256) 
    {
        require(projectIdToTokenId[projectId] == 0, "Already minted");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        projectIdToTokenId[projectId] = tokenId;
        tokenIdToProjectId[tokenId] = projectId;

        emit ApprovalMinted(projectId, tokenId, to);
        return tokenId;
    }

    function updateRegistry(address _projectRegistry) external onlyOwner {
        projectRegistry = _projectRegistry;
    }

    function getTokenIdForProject(uint256 projectId) external view returns (uint256) {
        return projectIdToTokenId[projectId];
    }

    function getProjectIdForToken(uint256 tokenId) external view returns (uint256) {
        return tokenIdToProjectId[tokenId];
    }
}

