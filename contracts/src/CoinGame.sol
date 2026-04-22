// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CoinGame
/// @notice Sidecar minigame that distributes pre-funded WELP to players.
/// @dev    No owner, admin, pause, or withdraw. Pure mechanism. Treasury is
///         funded by a one-shot ERC-20 transfer at deploy time and cannot be
///         recovered by anyone once sent. CEI pattern: cooldown timestamp is
///         written before the external transfer call.
contract CoinGame {
    IERC20 public immutable welpToken;

    uint256 public constant MIN_CLAIM = 5;
    uint256 public constant MAX_CLAIM = 10;
    uint256 public constant COOLDOWN = 1 hours;

    mapping(address => uint256) public lastClaim;

    error AmountOutOfRange();
    error Cooldown();

    event Claimed(address indexed user, uint256 amount, uint256 timestamp);

    constructor(address welpToken_) {
        welpToken = IERC20(welpToken_);
    }

    /// @notice Claim `amount` WELP (5..10) once per hour per address.
    /// @dev    Amount is whole tokens; contract scales by 1e18. Reverts on
    ///         out-of-range, active cooldown, or insufficient treasury.
    function claim(uint256 amount) external {
        if (amount < MIN_CLAIM || amount > MAX_CLAIM) revert AmountOutOfRange();
        if (block.timestamp < lastClaim[msg.sender] + COOLDOWN) revert Cooldown();

        lastClaim[msg.sender] = block.timestamp;
        emit Claimed(msg.sender, amount, block.timestamp);

        require(welpToken.transfer(msg.sender, amount * 1e18), "transfer failed");
    }

    function cooldownRemaining(address user) external view returns (uint256) {
        uint256 unlock = lastClaim[user] + COOLDOWN;
        if (block.timestamp >= unlock) return 0;
        return unlock - block.timestamp;
    }

    function treasuryBalance() external view returns (uint256) {
        return welpToken.balanceOf(address(this));
    }
}
