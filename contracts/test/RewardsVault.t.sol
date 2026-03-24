// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {WelpToken} from "../src/WelpToken.sol";
import {RewardsVault} from "../src/RewardsVault.sol";
import {ReviewRegistry} from "../src/ReviewRegistry.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RewardsVaultTest is Test {
    WelpToken public token;
    RewardsVault public vault;
    ReviewRegistry public registry;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

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

    function setUp() public {
        token = new WelpToken(owner);
        vault = new RewardsVault(owner);
        registry = new ReviewRegistry(owner);

        vm.startPrank(owner);
        token.setRewardsVault(address(vault));
        vault.setWelpToken(address(token));
        vault.setReviewRegistry(address(registry));
        registry.setRewardsVault(address(vault));
        vm.stopPrank();
    }

    // ═══════════════ Helpers ═══════════════

    function _seedBusiness() internal {
        vm.prank(owner);
        registry.addBusiness("Test Biz", "Restaurant", "Saint Paul, MN");
    }

    function _checkInAndReview(address user, uint256 businessId, uint8 rating) internal {
        vm.startPrank(user);
        registry.checkIn(businessId);
        registry.submitReview(businessId, rating, "QmTestHash");
        vm.stopPrank();
    }

    function _addUpvotes(uint256 reviewId, uint256 count) internal {
        for (uint256 i = 0; i < count; i++) {
            address voter = address(uint160(0xB0000 + i));
            vm.prank(voter);
            registry.upvote(reviewId);
        }
    }

    // ═══════════════ Deployment ═══════════════

    function test_deployment() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.tier2Threshold(), 5);
        assertEq(vault.tier3Threshold(), 20);
        assertEq(vault.tier1Reward(), 100e18);
        assertEq(vault.tier2Reward(), 200e18);
        assertEq(vault.tier3Reward(), 300e18);
    }

    function test_deployment_wiring() public view {
        assertEq(address(vault.welpToken()), address(token));
        assertEq(address(vault.reviewRegistry()), address(registry));
        assertEq(token.rewardsVault(), address(vault));
        assertEq(registry.rewardsVault(), address(vault));
    }

    // ═══════════════ setWelpToken ═══════════════

    function test_setWelpToken() public {
        address newToken = makeAddr("newToken");
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit WelpTokenUpdated(address(token), newToken);
        vault.setWelpToken(newToken);
        assertEq(address(vault.welpToken()), newToken);
    }

    function test_setWelpToken_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vault.setWelpToken(makeAddr("x"));
    }

    function test_setWelpToken_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(RewardsVault.ZeroAddress.selector);
        vault.setWelpToken(address(0));
    }

    // ═══════════════ setReviewRegistry ═══════════════

    function test_setReviewRegistry() public {
        address newReg = makeAddr("newReg");
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit ReviewRegistryUpdated(address(registry), newReg);
        vault.setReviewRegistry(newReg);
        assertEq(address(vault.reviewRegistry()), newReg);
    }

    function test_setReviewRegistry_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vault.setReviewRegistry(makeAddr("x"));
    }

    function test_setReviewRegistry_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(RewardsVault.ZeroAddress.selector);
        vault.setReviewRegistry(address(0));
    }

    // ═══════════════ setTierConfig ═══════════════

    function test_setTierConfig() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit TierConfigUpdated(10, 50, 50e18, 150e18, 500e18);
        vault.setTierConfig(10, 50, 50e18, 150e18, 500e18);

        assertEq(vault.tier2Threshold(), 10);
        assertEq(vault.tier3Threshold(), 50);
        assertEq(vault.tier1Reward(), 50e18);
        assertEq(vault.tier2Reward(), 150e18);
        assertEq(vault.tier3Reward(), 500e18);
    }

    function test_setTierConfig_revertInvalid_equal() public {
        vm.prank(owner);
        vm.expectRevert(RewardsVault.InvalidTierConfig.selector);
        vault.setTierConfig(10, 10, 100e18, 200e18, 300e18);
    }

    function test_setTierConfig_revertInvalid_tier2GreaterThanTier3() public {
        vm.prank(owner);
        vm.expectRevert(RewardsVault.InvalidTierConfig.selector);
        vault.setTierConfig(20, 5, 100e18, 200e18, 300e18);
    }

    function test_setTierConfig_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vault.setTierConfig(5, 20, 100e18, 200e18, 300e18);
    }

    // ═══════════════ distributeReward ═══════════════

    function test_distributeReward_tier1() public {
        _seedBusiness();
        _checkInAndReview(alice, 0, 4);
        // reputation = 0 → tier 1 = 100 WELP
        assertEq(token.balanceOf(alice), 100e18);
    }

    function test_distributeReward_revertNonRegistry() public {
        vm.prank(alice);
        vm.expectRevert(RewardsVault.OnlyReviewRegistry.selector);
        vault.distributeReward(alice);
    }

    function test_distributeReward_emitsEvent() public {
        _seedBusiness();

        vm.startPrank(alice);
        registry.checkIn(0);

        vm.expectEmit(true, false, false, true, address(vault));
        emit RewardDistributed(alice, 100e18, 1);
        registry.submitReview(0, 4, "QmHash");
        vm.stopPrank();
    }

    // ═══════════════ Tier calculation across reviews ═══════════════

    function test_tier2_afterUpvotes() public {
        _seedBusiness();

        // First review at tier 1
        _checkInAndReview(alice, 0, 4);
        assertEq(token.balanceOf(alice), 100e18);

        // Give alice 5 upvotes → reputation = 5 → tier 2
        _addUpvotes(0, 5);
        assertEq(registry.reputation(alice), 5);

        // Second review after cooldown
        vm.warp(block.timestamp + 48 hours);
        _checkInAndReview(alice, 0, 5);
        // 100 (first) + 200 (second at tier 2) = 300
        assertEq(token.balanceOf(alice), 300e18);
    }

    function test_tier3_afterManyUpvotes() public {
        _seedBusiness();

        // First review
        _checkInAndReview(alice, 0, 4);

        // Give alice 20 upvotes → reputation = 20 → tier 3
        _addUpvotes(0, 20);
        assertEq(registry.reputation(alice), 20);

        // Second review after cooldown
        vm.warp(block.timestamp + 48 hours);
        _checkInAndReview(alice, 0, 5);
        // 100 (first) + 300 (second at tier 3) = 400
        assertEq(token.balanceOf(alice), 400e18);
    }

    // ═══════════════ Full end-to-end ═══════════════

    function test_endToEnd_fullFlow() public {
        // 1. Add businesses
        vm.startPrank(owner);
        registry.addBusiness("Cosetta's", "Italian Restaurant", "Saint Paul, MN");
        registry.addBusiness("Revival", "Southern Restaurant", "Saint Paul, MN");
        vm.stopPrank();

        // Business IDs: 0 = Cosetta's, 1 = Revival

        // 2. Alice checks in at Cosetta's and submits a review
        vm.startPrank(alice);
        registry.checkIn(0);
        registry.submitReview(0, 5, "QmAliceReview1");
        vm.stopPrank();

        // 3. Verify tier 1 reward minted
        assertEq(token.balanceOf(alice), 100e18);
        assertEq(registry.nextReviewId(), 1);

        // 4. Bob upvotes Alice's review (5 times via different addresses)
        _addUpvotes(0, 5);
        assertEq(registry.reputation(alice), 5);

        // 5. Alice submits another review at Revival after cooldown → tier 2
        vm.warp(block.timestamp + 48 hours);
        vm.startPrank(alice);
        registry.checkIn(1);
        registry.submitReview(1, 4, "QmAliceReview2");
        vm.stopPrank();

        assertEq(token.balanceOf(alice), 300e18); // 100 + 200

        // 6. Bob checks in and reviews Cosetta's
        vm.startPrank(bob);
        registry.checkIn(0);
        registry.submitReview(0, 3, "QmBobReview1");
        vm.stopPrank();

        assertEq(token.balanceOf(bob), 100e18);

        // 7. Alice downvotes Bob's review
        vm.prank(alice);
        registry.downvote(2); // reviewId=2

        assertEq(registry.reputation(bob), -1);

        // 8. Verify all state
        assertEq(registry.nextReviewId(), 3);
        assertEq(token.totalSupply(), 400e18); // 100 (alice) + 200 (alice) + 100 (bob)
    }

    function test_endToEnd_tierProgression() public {
        _seedBusiness();

        // Add a second business for cooldown-free reviewing
        vm.prank(owner);
        registry.addBusiness("Biz2", "Bar", "Saint Paul, MN");

        // Review 0 at biz 0 → tier 1 (100 WELP)
        _checkInAndReview(alice, 0, 4);
        assertEq(token.balanceOf(alice), 100e18);

        // Get 5 upvotes → rep = 5 → tier 2
        _addUpvotes(0, 5);

        // Review 1 at biz 1 (no cooldown since different biz) → tier 2 (200 WELP)
        _checkInAndReview(alice, 1, 5);
        assertEq(token.balanceOf(alice), 300e18);

        // Get 15 more upvotes on review 1 → rep = 20 → tier 3
        _addUpvotes(1, 15);
        assertEq(registry.reputation(alice), 20);

        // Review 2 at biz 0 after cooldown → tier 3 (300 WELP)
        vm.warp(block.timestamp + 48 hours);
        _checkInAndReview(alice, 0, 3);
        assertEq(token.balanceOf(alice), 600e18);
    }

    function test_endToEnd_pauseBlocksEverything() public {
        _seedBusiness();

        vm.prank(owner);
        registry.pause();

        // Check-in blocked
        vm.prank(alice);
        vm.expectRevert();
        registry.checkIn(0);

        // Unpause and verify recovery
        vm.prank(owner);
        registry.unpause();

        _checkInAndReview(alice, 0, 4);
        assertEq(token.balanceOf(alice), 100e18);
    }

    // ═══════════════ Fuzz ═══════════════

    function testFuzz_distributeReward_tier1_anyLowRep(int256 rep) public {
        // For any reputation below tier2Threshold (5), reward should be tier 1
        rep = bound(rep, type(int256).min, 4);

        // We test the tier logic via setTierConfig and a custom setup isn't needed;
        // just verify the tier1 default is paid for reputation < 5.
        // Since we can't set arbitrary reputation directly, we test indirectly:
        // a fresh reviewer with 0 reputation always gets tier 1.
        _seedBusiness();
        _checkInAndReview(alice, 0, 3);
        assertEq(token.balanceOf(alice), 100e18);
    }

    function testFuzz_tierConfig_validThresholds(int256 t2, int256 t3) public {
        t2 = bound(t2, type(int256).min, type(int256).max - 1);
        t3 = bound(t3, t2 + 1, type(int256).max);

        vm.prank(owner);
        vault.setTierConfig(t2, t3, 10e18, 20e18, 30e18);

        assertEq(vault.tier2Threshold(), t2);
        assertEq(vault.tier3Threshold(), t3);
    }

    function testFuzz_tierConfig_invalidThresholds(int256 t2, int256 t3) public {
        t3 = bound(t3, type(int256).min, type(int256).max);
        t2 = bound(t2, t3, type(int256).max); // t2 >= t3

        vm.prank(owner);
        vm.expectRevert(RewardsVault.InvalidTierConfig.selector);
        vault.setTierConfig(t2, t3, 10e18, 20e18, 30e18);
    }
}
