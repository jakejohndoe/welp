// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PriceFeed} from "../src/PriceFeed.sol";

contract DeployPriceFeed is Script {
    function run() external {
        vm.startBroadcast();

        // Sepolia ETH/USD Chainlink feed
        address sepoliaEthUsdFeed = 0x694AA1769357215DE4FAC081bf1f309aDC325306;

        PriceFeed priceFeed = new PriceFeed(sepoliaEthUsdFeed);

        console.log("PriceFeed deployed at:", address(priceFeed));
        console.log("ETH/USD feed:", sepoliaEthUsdFeed);
        console.log("Default WELP/ETH rate:", priceFeed.welpPerEth());

        vm.stopBroadcast();
    }
}