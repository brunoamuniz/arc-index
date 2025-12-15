// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProjectRegistry.sol";

/**
 * @title Ratings
 * @notice On-chain rating system for approved projects (1-5 stars)
 */
contract Ratings {
    ProjectRegistry public projectRegistry;
    
    mapping(uint256 => mapping(address => uint8)) public ratings; // projectId => rater => stars
    mapping(uint256 => uint256) public totalRatings; // projectId => count
    mapping(uint256 => uint256) public totalStars; // projectId => sum of all stars

    event Rated(uint256 indexed projectId, address indexed rater, uint8 stars);

    constructor(address _projectRegistry) {
        projectRegistry = ProjectRegistry(_projectRegistry);
    }

    function rate(uint256 projectId, uint8 stars) external {
        require(stars >= 1 && stars <= 5, "Stars must be 1-5");
        
        // Check if project is approved using public mapping getter
        (address owner, ProjectRegistry.ProjectStatus status, ) = projectRegistry.projects(projectId);
        require(status == ProjectRegistry.ProjectStatus.Approved, "Project not approved");
        require(owner != address(0), "Project does not exist");

        address rater = msg.sender;
        uint8 previousStars = ratings[projectId][rater];

        // Update rating
        ratings[projectId][rater] = stars;

        // Update aggregates
        if (previousStars == 0) {
            // New rating
            totalRatings[projectId]++;
        } else {
            // Update existing rating
            totalStars[projectId] = totalStars[projectId] - previousStars + stars;
        }

        if (previousStars == 0) {
            totalStars[projectId] += stars;
        }

        emit Rated(projectId, rater, stars);
    }

    function getRating(uint256 projectId, address rater) external view returns (uint8) {
        return ratings[projectId][rater];
    }

    function getAverageRating(uint256 projectId) external view returns (uint256) {
        uint256 count = totalRatings[projectId];
        if (count == 0) return 0;
        return totalStars[projectId] * 100 / count; // Returns as integer (e.g., 450 = 4.50)
    }

    function getTotalRatings(uint256 projectId) external view returns (uint256) {
        return totalRatings[projectId];
    }
}

