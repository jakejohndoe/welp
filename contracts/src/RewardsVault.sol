// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRewardsVault} from "./interfaces/IRewardsVault.sol";

interface IWelpToken {
    function mint(address to, uint256 amount) external;
}

interface IReviewRegistry {
    function reputation(address reviewer) external view returns (int256);
}

contract RewardsVault is IRewardsVault, Ownable2Step, ReentrancyGuard {
    // ──────────────────── State ────────────────────

    IWelpToken public welpToken;
    IReviewRegistry public reviewRegistry;

    /// @dev Tier thresholds (reputation must be >= threshold to qualify)
    int256 public constant tier1Threshold = 0; // base tier (below this is impossible; everyone qualifies)
    int256 public tier2Threshold;
    int256 public tier3Threshold;

    /// @dev Reward amounts per tier (in wei, i.e. 100e18 = 100 WELP)
    uint256 public tier1Reward;
    uint256 public tier2Reward;
    uint256 public tier3Reward;

    // ──────────────────── Events ────────────────────

    event RewardDistributed(address indexed reviewer, uint256 amount, uint256 tier);
    event WelpTokenUpdated(address indexed oldToken, address indexed newToken);
    event ReviewRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event TierConfigUpdated(
        int256 tier2Threshold,
        int256 tier3Threshold,
        uint256 tier1Reward,
        uint256 tier2Reward,
        uint256 tier3Reward
    );

    // ──────────────────── Errors ────────────────────

    error ZeroAddress();
    error OnlyReviewRegistry();
    error TokenNotSet();
    error RegistryNotSet();
    error InvalidTierConfig();

    // ──────────────────── Constructor ────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {
        tier2Threshold = 5;
        tier3Threshold = 20;

        tier1Reward = 100e18;
        tier2Reward = 200e18;
        tier3Reward = 300e18;
    }

    // ──────────────────── Admin ────────────────────

    function setWelpToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        address old = address(welpToken);
        welpToken = IWelpToken(token);
        emit WelpTokenUpdated(old, token);
    }

    function setReviewRegistry(address registry) external onlyOwner {
        if (registry == address(0)) revert ZeroAddress();
        address old = address(reviewRegistry);
        reviewRegistry = IReviewRegistry(registry);
        emit ReviewRegistryUpdated(old, registry);
    }

    function setTierConfig(
        int256 _tier2Threshold,
        int256 _tier3Threshold,
        uint256 _tier1Reward,
        uint256 _tier2Reward,
        uint256 _tier3Reward
    ) external onlyOwner {
        if (_tier2Threshold >= _tier3Threshold) revert InvalidTierConfig();

        tier2Threshold = _tier2Threshold;
        tier3Threshold = _tier3Threshold;
        tier1Reward = _tier1Reward;
        tier2Reward = _tier2Reward;
        tier3Reward = _tier3Reward;

        emit TierConfigUpdated(_tier2Threshold, _tier3Threshold, _tier1Reward, _tier2Reward, _tier3Reward);
    }

    // ──────────────────── Core ────────────────────

    function distributeReward(address reviewer) external nonReentrant {
        if (msg.sender != address(reviewRegistry)) revert OnlyReviewRegistry();
        if (address(welpToken) == address(0)) revert TokenNotSet();
        if (address(reviewRegistry) == address(0)) revert RegistryNotSet();

        int256 rep = reviewRegistry.reputation(reviewer);
        (uint256 amount, uint256 tier) = _calculateReward(rep);

        welpToken.mint(reviewer, amount);

        emit RewardDistributed(reviewer, amount, tier);
    }

    // ──────────────────── Internal ────────────────────

    function _calculateReward(int256 rep) internal view returns (uint256 amount, uint256 tier) {
        if (rep >= tier3Threshold) {
            return (tier3Reward, 3);
        } else if (rep >= tier2Threshold) {
            return (tier2Reward, 2);
        } else {
            return (tier1Reward, 1);
        }
    }
}
