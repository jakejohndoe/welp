// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CoinGame} from "../src/CoinGame.sol";

/// @title DeployCoinGame
/// @notice Deploys the standalone CoinGame sidecar and one-shot funds its
///         treasury with 200 WELP from the broadcaster so players have a
///         pool to claim from. Treasury is non-recoverable by design.
contract DeployCoinGame is Script {
    address internal constant WELP_TOKEN = 0xDF76BdF11812E93f31BDF6363FE3CD1fE4078A52;
    uint256 internal constant TREASURY_FUND = 200 * 1e18;

    function run() external {
        vm.startBroadcast();

        CoinGame game = new CoinGame(WELP_TOKEN);
        console.log("CoinGame deployed:", address(game));

        IERC20(WELP_TOKEN).transfer(address(game), TREASURY_FUND);
        uint256 funded = IERC20(WELP_TOKEN).balanceOf(address(game));
        console.log("Treasury funded:", funded / 1e18, "WELP");

        vm.stopBroadcast();
    }
}
