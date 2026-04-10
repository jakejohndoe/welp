// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IRewardsVault {
    function distributeReward(address reviewer) external;
    function setWelpToken(address token) external;
    function setReviewRegistry(address registry) external;
    function setTierConfig(
        int256 _tier2Threshold,
        int256 _tier3Threshold,
        uint256 _tier1Reward,
        uint256 _tier2Reward,
        uint256 _tier3Reward
    ) external;
}