// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {OGBadge} from "../src/OGBadge.sol";

/// @title DeployOGBadge
/// @notice Deploys the standalone OGBadge contract and sets its base URI in
///         one broadcast so the production metadata is wired up atomically.
/// @dev    Expects WELP_TOKEN_ADDRESS and OG_BADGE_TOKEN_URI env vars. Owner
///         of the badge is the broadcaster (deployer).
contract DeployOGBadge is Script {
    function run() external {
        address welpToken = vm.envAddress("WELP_TOKEN_ADDRESS");
        string memory tokenUri = vm.envString("OG_BADGE_TOKEN_URI");
        address deployer = msg.sender;

        vm.startBroadcast();

        OGBadge badge = new OGBadge(welpToken, deployer);
        badge.setTokenURI(tokenUri);

        vm.stopBroadcast();

        console.log("OGBadge deployed at:", address(badge));
        console.log("WelpToken:", welpToken);
        console.log("Owner:", deployer);
        console.log("Token URI:", tokenUri);
    }
}
