// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {PriceFeed} from "../src/PriceFeed.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockAggregator is AggregatorV3Interface {
    int256 public price;
    uint256 public updatedAt;
    uint8 public decimals = 8;

    function setPrice(int256 _price, uint256 _updatedAt) external {
        price = _price;
        updatedAt = _updatedAt;
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 _updatedAt,
        uint80 answeredInRound
    ) {
        return (1, price, block.timestamp, updatedAt, 1);
    }

    function getRoundData(uint80) external pure returns (
        uint80,
        int256,
        uint256,
        uint256,
        uint80
    ) {
        revert("Not implemented");
    }

    function version() external pure returns (uint256) {
        return 4;
    }

    function description() external pure returns (string memory) {
        return "ETH / USD";
    }
}

contract PriceFeedTest is Test {
    PriceFeed public priceFeed;
    MockAggregator public mockAggregator;

    address public owner = address(this);
    address public user = address(0x1);

    event WelpPerEthUpdated(uint256 oldRate, uint256 newRate);

    function setUp() public {
        mockAggregator = new MockAggregator();
        priceFeed = new PriceFeed(address(mockAggregator));

        // Set default price: $2000 with 8 decimals
        mockAggregator.setPrice(2000e8, block.timestamp);
    }

    function test_deployment() public view {
        assertEq(priceFeed.welpPerEth(), 10000e18);
        assertEq(address(priceFeed.ethUsdPriceFeed()), address(mockAggregator));
        assertEq(priceFeed.owner(), owner);
    }

    function test_getEthPriceUsd() public {
        uint256 ethPrice = priceFeed.getEthPriceUsd();
        assertEq(ethPrice, 2000e8); // $2000 with 8 decimals
    }

    function test_getWelpPriceUsd() public {
        // ETH = $2000, WELP/ETH = 10000
        // WELP price = $2000 / 10000 = $0.20
        uint256 welpPrice = priceFeed.getWelpPriceUsd();
        assertEq(welpPrice, 2e7); // $0.20 with 8 decimals
    }

    function test_setWelpPerEth() public {
        uint256 newRate = 5000e18; // 5000 WELP per ETH

        vm.expectEmit(true, true, false, true);
        emit WelpPerEthUpdated(10000e18, newRate);

        priceFeed.setWelpPerEth(newRate);
        assertEq(priceFeed.welpPerEth(), newRate);

        // Test new price calculation
        // ETH = $2000, WELP/ETH = 5000
        // WELP price = $2000 / 5000 = $0.40
        uint256 welpPrice = priceFeed.getWelpPriceUsd();
        assertEq(welpPrice, 4e7); // $0.40 with 8 decimals
    }

    function test_setWelpPerEth_revertNonOwner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        priceFeed.setWelpPerEth(5000e18);
    }

    function test_setWelpPerEth_revertZero() public {
        vm.expectRevert(PriceFeed.InvalidWelpPerEth.selector);
        priceFeed.setWelpPerEth(0);
    }

    function test_getEthPriceUsd_revertStale() public {
        // Advance time first to avoid underflow
        vm.warp(10000);

        // Set price with old timestamp
        mockAggregator.setPrice(2000e8, block.timestamp - 3601);

        vm.expectRevert(PriceFeed.PriceFeedStale.selector);
        priceFeed.getEthPriceUsd();
    }

    function test_getWelpPriceUsd_revertStale() public {
        // Advance time first to avoid underflow
        vm.warp(10000);

        // Set price with old timestamp
        mockAggregator.setPrice(2000e8, block.timestamp - 3601);

        vm.expectRevert(PriceFeed.PriceFeedStale.selector);
        priceFeed.getWelpPriceUsd();
    }

    function test_getEthPriceUsd_revertNegativePrice() public {
        mockAggregator.setPrice(-1, block.timestamp);

        vm.expectRevert("Invalid price");
        priceFeed.getEthPriceUsd();
    }

    function test_getDecimals() public view {
        assertEq(priceFeed.getDecimals(), 8);
    }

    function test_getLatestRoundData() public {
        // Advance time first to avoid underflow
        vm.warp(1000);

        mockAggregator.setPrice(2500e8, block.timestamp - 100);

        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.getLatestRoundData();

        assertEq(roundId, 1);
        assertEq(price, 2500e8);
        assertEq(startedAt, block.timestamp);
        assertEq(updatedAt, block.timestamp - 100);
        assertEq(answeredInRound, 1);
    }

    function testFuzz_setWelpPerEth(uint256 newRate) public {
        vm.assume(newRate > 0 && newRate < type(uint256).max / 1e18);

        priceFeed.setWelpPerEth(newRate);
        assertEq(priceFeed.welpPerEth(), newRate);
    }

    function testFuzz_getWelpPriceUsd_variousRates(uint256 welpPerEth, uint256 ethPrice) public {
        // Bound inputs to reasonable ranges
        welpPerEth = bound(welpPerEth, 1e18, 1e24); // 1 to 1M WELP per ETH
        ethPrice = bound(ethPrice, 1e8, 1e12); // $1 to $10,000

        mockAggregator.setPrice(int256(ethPrice), block.timestamp);
        priceFeed.setWelpPerEth(welpPerEth);

        uint256 welpPrice = priceFeed.getWelpPriceUsd();

        // Verify calculation
        uint256 expectedPrice = (ethPrice * 1e18) / welpPerEth;
        assertEq(welpPrice, expectedPrice);
    }

    function test_stalenessThreshold() public view {
        assertEq(priceFeed.PRICE_STALENESS_THRESHOLD(), 3600);
    }

    function test_ownable2Step_transfer() public {
        address newOwner = address(0x2);

        // Start transfer
        priceFeed.transferOwnership(newOwner);
        assertEq(priceFeed.owner(), owner); // Still old owner
        assertEq(priceFeed.pendingOwner(), newOwner);

        // Accept transfer
        vm.prank(newOwner);
        priceFeed.acceptOwnership();
        assertEq(priceFeed.owner(), newOwner);
        assertEq(priceFeed.pendingOwner(), address(0));
    }
}

// Fork test for live Sepolia feed
contract PriceFeedForkTest is Test {
    PriceFeed public priceFeed;
    address constant SEPOLIA_ETH_USD_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;

    function setUp() public {
        // Fork Sepolia
        string memory sepoliaUrl = vm.envString("SEPOLIA_RPC_URL");
        vm.createSelectFork(sepoliaUrl);

        priceFeed = new PriceFeed(SEPOLIA_ETH_USD_FEED);
    }

    function test_liveSepoliaFeed() public view {
        // Get live ETH price
        uint256 ethPrice = priceFeed.getEthPriceUsd();
        console2.log("Live ETH/USD price:", ethPrice);

        // Verify it's a reasonable value (between $100 and $10,000)
        assertGt(ethPrice, 100e8);
        assertLt(ethPrice, 10000e8);

        // Get WELP price
        uint256 welpPrice = priceFeed.getWelpPriceUsd();
        console2.log("Calculated WELP/USD price:", welpPrice);

        // Verify WELP price calculation
        uint256 expectedWelpPrice = (ethPrice * 1e18) / priceFeed.welpPerEth();
        assertEq(welpPrice, expectedWelpPrice);
    }

    function test_liveSepoliaDecimals() public view {
        assertEq(priceFeed.getDecimals(), 8);
    }

    function test_liveSepoliaRoundData() public view {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.getLatestRoundData();

        // Verify data is valid
        assertGt(roundId, 0);
        assertGt(price, 0);
        assertGt(updatedAt, 0);
        assertLe(updatedAt, block.timestamp);

        // Should not be stale
        assertLe(block.timestamp - updatedAt, 3600);
    }
}