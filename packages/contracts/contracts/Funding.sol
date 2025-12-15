// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ProjectRegistry.sol";

/**
 * @title Funding
 * @notice USDC donation system for approved projects
 */
contract Funding {
    using SafeERC20 for IERC20;

    ProjectRegistry public projectRegistry;
    IERC20 public usdc;

    mapping(uint256 => uint256) public totalFunding; // projectId => total USDC received
    mapping(uint256 => uint256) public fundingCount; // projectId => number of donations

    event Funded(uint256 indexed projectId, address indexed funder, uint256 amount);

    constructor(address _projectRegistry, address _usdc) {
        projectRegistry = ProjectRegistry(_projectRegistry);
        usdc = IERC20(_usdc);
    }

    function fund(uint256 projectId, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        // Check if project is approved using public mapping getter
        (address owner, ProjectRegistry.ProjectStatus status, ) = projectRegistry.projects(projectId);
        require(status == ProjectRegistry.ProjectStatus.Approved, "Project not approved");
        require(owner != address(0), "Project does not exist");

        address funder = msg.sender;

        // Transfer USDC from funder to project owner
        usdc.safeTransferFrom(funder, owner, amount);

        // Update aggregates
        totalFunding[projectId] += amount;
        fundingCount[projectId]++;

        emit Funded(projectId, funder, amount);
    }

    function getTotalFunding(uint256 projectId) external view returns (uint256) {
        return totalFunding[projectId];
    }

    function getFundingCount(uint256 projectId) external view returns (uint256) {
        return fundingCount[projectId];
    }
}

