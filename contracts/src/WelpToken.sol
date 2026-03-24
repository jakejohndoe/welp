// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract WelpToken is ERC20, Ownable2Step, Pausable {
    address public rewardsVault;

    event RewardsVaultUpdated(address indexed oldVault, address indexed newVault);

    error OnlyRewardsVault();
    error ZeroAddress();

    modifier onlyRewardsVault() {
        if (msg.sender != rewardsVault) revert OnlyRewardsVault();
        _;
    }

    constructor(address initialOwner) ERC20("Welp", "WELP") Ownable(initialOwner) {}

    function setRewardsVault(address newVault) external onlyOwner {
        if (newVault == address(0)) revert ZeroAddress();
        address oldVault = rewardsVault;
        rewardsVault = newVault;
        emit RewardsVaultUpdated(oldVault, newVault);
    }

    function mint(address to, uint256 amount) external onlyRewardsVault whenNotPaused {
        _mint(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
