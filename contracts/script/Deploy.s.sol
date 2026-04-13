// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {WelpToken} from "../src/WelpToken.sol";
import {RewardsVault} from "../src/RewardsVault.sol";
import {ReviewRegistry} from "../src/ReviewRegistry.sol";
import {PriceFeed} from "../src/PriceFeed.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;

        // ── Deploy contracts ────────────────────────
        WelpToken token = new WelpToken(deployer);
        RewardsVault vault = new RewardsVault(deployer);
        ReviewRegistry registry = new ReviewRegistry(deployer);

        // Sepolia ETH/USD Chainlink feed
        address sepoliaEthUsdFeed = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
        PriceFeed priceFeed = new PriceFeed(sepoliaEthUsdFeed);

        // ── Wire together ───────────────────────────
        token.setRewardsVault(address(vault));
        vault.setWelpToken(address(token));
        vault.setReviewRegistry(address(registry));
        registry.setRewardsVault(address(vault));

        // ── Seed Saint Paul businesses ──────────────
        registry.addBusiness("Cosetta's", "Italian Restaurant", "Saint Paul, MN");
        registry.addBusiness("Revival", "Southern Restaurant", "Saint Paul, MN");
        registry.addBusiness("Brunson's Pub", "Bar & Grill", "Saint Paul, MN");
        registry.addBusiness("Golden Thyme Coffee", "Coffee Shop", "Saint Paul, MN");
        registry.addBusiness("Hmongtown Marketplace", "Market", "Saint Paul, MN");
        registry.addBusiness("Can Can Wonderland", "Entertainment", "Saint Paul, MN");
        registry.addBusiness("Keg and Case Market", "Food Hall", "Saint Paul, MN");
        registry.addBusiness("Summit Brewing Company", "Brewery", "Saint Paul, MN");
        registry.addBusiness("Ox Cart Ale House", "Bar", "Saint Paul, MN");
        registry.addBusiness("Tongue in Cheek", "Restaurant", "Saint Paul, MN");

        // ── Log addresses ───────────────────────────
        console.log("WelpToken:", address(token));
        console.log("RewardsVault:", address(vault));
        console.log("ReviewRegistry:", address(registry));
        console.log("PriceFeed:", address(priceFeed));

        vm.stopBroadcast();
    }
}
