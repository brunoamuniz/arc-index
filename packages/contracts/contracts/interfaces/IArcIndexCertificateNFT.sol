// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArcIndexCertificateNFT
 * @notice Interface for the Arc Index Certificate NFT contract
 */
interface IArcIndexCertificateNFT {
    /**
     * @notice Mints a certificate NFT for an approved project
     * @param to The address to mint the NFT to (project owner)
     * @param projectId The ID of the approved project
     * @param tokenURI The metadata URI for the token
     * @return tokenId The ID of the minted token
     */
    function mintCertificate(
        address to,
        uint256 projectId,
        string memory tokenURI
    ) external returns (uint256 tokenId);

    /**
     * @notice Burns a certificate NFT
     * @param tokenId The ID of the token to burn
     */
    function burn(uint256 tokenId) external;

    /**
     * @notice Gets the token ID for a given project ID
     * @param projectId The project ID
     * @return tokenId The token ID (0 if not minted)
     */
    function getTokenIdForProject(uint256 projectId) external view returns (uint256 tokenId);

    /**
     * @notice Gets the project ID for a given token ID
     * @param tokenId The token ID
     * @return projectId The project ID
     */
    function getProjectIdForToken(uint256 tokenId) external view returns (uint256 projectId);
}
