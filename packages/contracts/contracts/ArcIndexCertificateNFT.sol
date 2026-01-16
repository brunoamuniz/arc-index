// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IArcIndexCertificateNFT.sol";

/**
 * @title ArcIndexCertificateNFT
 * @notice Soulbound ERC-721 NFT representing project certification on Arc Index
 * @dev Tokens cannot be transferred after minting (soulbound). Only mint and burn are allowed.
 */
contract ArcIndexCertificateNFT is ERC721URIStorage, AccessControl, IArcIndexCertificateNFT {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Mapping from project ID to token ID
    mapping(uint256 => uint256) public projectIdToTokenId;

    /// @notice Mapping from token ID to project ID
    mapping(uint256 => uint256) public tokenIdToProjectId;

    /// @notice Counter for token IDs
    uint256 private _nextTokenId;

    /// @notice Emitted when a certificate is minted
    event CertificateMinted(
        uint256 indexed projectId,
        uint256 indexed tokenId,
        address indexed to
    );

    /// @notice Emitted when a certificate is burned
    event CertificateBurned(
        uint256 indexed projectId,
        uint256 indexed tokenId
    );

    /// @dev Custom errors
    error AlreadyMinted(uint256 projectId);
    error SoulboundToken();
    error TokenNotFound(uint256 tokenId);
    error InvalidAddress();

    constructor() ERC721("Arc Index Certificate", "ARCC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Mints a certificate NFT for an approved project
     * @param to The address to mint the NFT to (project owner)
     * @param projectId The ID of the approved project
     * @param uri The metadata URI for the token
     * @return tokenId The ID of the minted token
     */
    function mintCertificate(
        address to,
        uint256 projectId,
        string memory uri
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (to == address(0)) revert InvalidAddress();
        if (projectIdToTokenId[projectId] != 0) revert AlreadyMinted(projectId);

        uint256 tokenId = ++_nextTokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        projectIdToTokenId[projectId] = tokenId;
        tokenIdToProjectId[tokenId] = projectId;

        emit CertificateMinted(projectId, tokenId, to);

        return tokenId;
    }

    /**
     * @notice Burns a certificate NFT
     * @dev Only admin can burn tokens
     * @param tokenId The ID of the token to burn
     */
    function burn(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) revert TokenNotFound(tokenId);

        uint256 projectId = tokenIdToProjectId[tokenId];

        delete projectIdToTokenId[projectId];
        delete tokenIdToProjectId[tokenId];

        _burn(tokenId);

        emit CertificateBurned(projectId, tokenId);
    }

    /**
     * @notice Gets the token ID for a given project ID
     * @param projectId The project ID
     * @return The token ID (0 if not minted)
     */
    function getTokenIdForProject(uint256 projectId) external view returns (uint256) {
        return projectIdToTokenId[projectId];
    }

    /**
     * @notice Gets the project ID for a given token ID
     * @param tokenId The token ID
     * @return The project ID
     */
    function getProjectIdForToken(uint256 tokenId) external view returns (uint256) {
        return tokenIdToProjectId[tokenId];
    }

    /**
     * @dev Override _update to make tokens soulbound (non-transferable)
     * Allows minting (from == address(0)) and burning (to == address(0)) only
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == 0) and burning (to == 0), block transfers
        if (from != address(0) && to != address(0)) {
            revert SoulboundToken();
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Required override for AccessControl + ERC721
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
