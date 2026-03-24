// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ReviewRegistry} from "../src/ReviewRegistry.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ReviewRegistryTest is Test {
    ReviewRegistry public registry;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public vaultAddr = makeAddr("vault");

    event BusinessAdded(uint256 indexed businessId, string name, string category, string location);
    event CheckedIn(uint256 indexed businessId, address indexed user, uint256 timestamp);
    event ReviewSubmitted(
        uint256 indexed reviewId,
        uint256 indexed businessId,
        address indexed reviewer,
        uint8 rating,
        string ipfsHash,
        uint256 timestamp
    );
    event VoteRecorded(uint256 indexed reviewId, address indexed voter, bool isUpvote);
    event ReputationUpdated(address indexed reviewer, int256 newReputation);
    event RewardsVaultUpdated(address indexed oldVault, address indexed newVault);

    function setUp() public {
        registry = new ReviewRegistry(owner);
        vm.prank(owner);
        registry.addBusiness("Test Biz", "Restaurant", "Saint Paul, MN");
    }

    // ═══════════════ Helpers ═══════════════

    function _checkInAndReview(address user, uint256 businessId, uint8 rating) internal {
        vm.startPrank(user);
        registry.checkIn(businessId);
        registry.submitReview(businessId, rating, "QmTestHash");
        vm.stopPrank();
    }

    // ═══════════════ Deployment ═══════════════

    function test_deployment() public view {
        assertEq(registry.owner(), owner);
        assertEq(registry.nextBusinessId(), 1); // one seeded in setUp
        assertEq(registry.nextReviewId(), 0);
        assertEq(registry.rewardsVault(), address(0));
        assertEq(registry.CHECKIN_WINDOW(), 24 hours);
        assertEq(registry.REVIEW_COOLDOWN(), 48 hours);
    }

    // ═══════════════ addBusiness ═══════════════

    function test_addBusiness() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit BusinessAdded(1, "Biz2", "Bar", "Minneapolis, MN");
        registry.addBusiness("Biz2", "Bar", "Minneapolis, MN");

        (uint256 id,,,, bool exists) = registry.businesses(1);
        assertEq(id, 1);
        assertTrue(exists);
        assertEq(registry.nextBusinessId(), 2);
    }

    function test_addBusiness_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        registry.addBusiness("Fail", "Cat", "Loc");
    }

    // ═══════════════ setRewardsVault ═══════════════

    function test_setRewardsVault() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit RewardsVaultUpdated(address(0), vaultAddr);
        registry.setRewardsVault(vaultAddr);
        assertEq(registry.rewardsVault(), vaultAddr);
    }

    function test_setRewardsVault_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(ReviewRegistry.ZeroAddress.selector);
        registry.setRewardsVault(address(0));
    }

    function test_setRewardsVault_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        registry.setRewardsVault(vaultAddr);
    }

    // ═══════════════ checkIn ═══════════════

    function test_checkIn() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit CheckedIn(0, alice, block.timestamp);
        registry.checkIn(0);

        assertEq(registry.lastCheckIn(0, alice), block.timestamp);
    }

    function test_checkIn_revertInvalidBusiness() public {
        vm.prank(alice);
        vm.expectRevert(ReviewRegistry.BusinessNotFound.selector);
        registry.checkIn(999);
    }

    function test_checkIn_revertWhenPaused() public {
        vm.prank(owner);
        registry.pause();

        vm.prank(alice);
        vm.expectRevert();
        registry.checkIn(0);
    }

    // ═══════════════ submitReview ═══════════════

    function test_submitReview() public {
        vm.startPrank(alice);
        registry.checkIn(0);

        vm.expectEmit(true, true, true, true);
        emit ReviewSubmitted(0, 0, alice, 4, "QmHash", block.timestamp);
        registry.submitReview(0, 4, "QmHash");
        vm.stopPrank();

        (uint256 id, uint256 bizId, address reviewer, uint8 rating,, uint256 ts,,) = registry.reviews(0);
        assertEq(id, 0);
        assertEq(bizId, 0);
        assertEq(reviewer, alice);
        assertEq(rating, 4);
        assertEq(ts, block.timestamp);
        assertEq(registry.nextReviewId(), 1);
    }

    function test_submitReview_revertInvalidBusiness() public {
        vm.prank(alice);
        vm.expectRevert(ReviewRegistry.BusinessNotFound.selector);
        registry.submitReview(999, 3, "QmHash");
    }

    function test_submitReview_revertRatingZero() public {
        vm.startPrank(alice);
        registry.checkIn(0);
        vm.expectRevert(ReviewRegistry.InvalidRating.selector);
        registry.submitReview(0, 0, "QmHash");
        vm.stopPrank();
    }

    function test_submitReview_revertRatingSix() public {
        vm.startPrank(alice);
        registry.checkIn(0);
        vm.expectRevert(ReviewRegistry.InvalidRating.selector);
        registry.submitReview(0, 6, "QmHash");
        vm.stopPrank();
    }

    function test_submitReview_revertNoCheckIn() public {
        vm.prank(alice);
        vm.expectRevert(ReviewRegistry.NotCheckedIn.selector);
        registry.submitReview(0, 3, "QmHash");
    }

    function test_submitReview_revertCheckinExpired() public {
        vm.prank(alice);
        registry.checkIn(0);

        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(alice);
        vm.expectRevert(ReviewRegistry.NotCheckedIn.selector);
        registry.submitReview(0, 3, "QmHash");
    }

    function test_submitReview_atExactCheckinBoundary() public {
        vm.prank(alice);
        registry.checkIn(0);

        vm.warp(block.timestamp + 24 hours);

        vm.prank(alice);
        registry.submitReview(0, 3, "QmHash"); // should succeed at exact boundary
    }

    function test_submitReview_revertCooldown() public {
        _checkInAndReview(alice, 0, 3);

        // check in again right away
        vm.startPrank(alice);
        registry.checkIn(0);
        vm.expectRevert(ReviewRegistry.ReviewCooldown.selector);
        registry.submitReview(0, 4, "QmHash2");
        vm.stopPrank();
    }

    function test_submitReview_afterCooldown() public {
        _checkInAndReview(alice, 0, 3);

        vm.warp(block.timestamp + 48 hours);

        vm.startPrank(alice);
        registry.checkIn(0);
        registry.submitReview(0, 5, "QmHash2");
        vm.stopPrank();

        assertEq(registry.nextReviewId(), 2);
    }

    function test_submitReview_revertWhenPaused() public {
        vm.prank(alice);
        registry.checkIn(0);

        vm.prank(owner);
        registry.pause();

        vm.prank(alice);
        vm.expectRevert();
        registry.submitReview(0, 3, "QmHash");
    }

    // ═══════════════ Voting ═══════════════

    function test_upvote() public {
        _checkInAndReview(alice, 0, 4);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit VoteRecorded(0, bob, true);
        registry.upvote(0);

        (,,,,,,uint256 upvotes, uint256 downvotes) = registry.reviews(0);
        assertEq(upvotes, 1);
        assertEq(downvotes, 0);
        assertEq(registry.reputation(alice), 1);
    }

    function test_downvote() public {
        _checkInAndReview(alice, 0, 4);

        vm.prank(bob);
        registry.downvote(0);

        (,,,,,,uint256 upvotes, uint256 downvotes) = registry.reviews(0);
        assertEq(upvotes, 0);
        assertEq(downvotes, 1);
        assertEq(registry.reputation(alice), -1);
    }

    function test_vote_emitsReputationUpdated() public {
        _checkInAndReview(alice, 0, 4);

        vm.prank(bob);
        vm.expectEmit(true, false, false, true);
        emit ReputationUpdated(alice, 1);
        registry.upvote(0);
    }

    function test_vote_revertAlreadyVoted() public {
        _checkInAndReview(alice, 0, 4);

        vm.startPrank(bob);
        registry.upvote(0);
        vm.expectRevert(ReviewRegistry.AlreadyVoted.selector);
        registry.upvote(0);
        vm.stopPrank();
    }

    function test_vote_revertAlreadyVotedDifferentDirection() public {
        _checkInAndReview(alice, 0, 4);

        vm.startPrank(bob);
        registry.upvote(0);
        vm.expectRevert(ReviewRegistry.AlreadyVoted.selector);
        registry.downvote(0);
        vm.stopPrank();
    }

    function test_vote_revertReviewNotFound() public {
        vm.prank(alice);
        vm.expectRevert(ReviewRegistry.ReviewNotFound.selector);
        registry.upvote(999);
    }

    function test_vote_revertWhenPaused() public {
        _checkInAndReview(alice, 0, 4);

        vm.prank(owner);
        registry.pause();

        vm.prank(bob);
        vm.expectRevert();
        registry.upvote(0);
    }

    function test_reputation_multipleVotes() public {
        _checkInAndReview(alice, 0, 4);

        vm.prank(bob);
        registry.upvote(0);
        vm.prank(carol);
        registry.upvote(0);

        assertEq(registry.reputation(alice), 2);
    }

    function test_reputation_mixedVotes() public {
        _checkInAndReview(alice, 0, 4);

        vm.prank(bob);
        registry.upvote(0);
        vm.prank(carol);
        registry.downvote(0);

        assertEq(registry.reputation(alice), 0);
    }

    function test_multipleVotersOnSameReview() public {
        _checkInAndReview(alice, 0, 4);

        // Three distinct voters should all succeed
        address dan = makeAddr("dan");
        vm.prank(bob);
        registry.upvote(0);
        vm.prank(carol);
        registry.upvote(0);
        vm.prank(dan);
        registry.downvote(0);

        (,,,,,,uint256 up, uint256 down) = registry.reviews(0);
        assertEq(up, 2);
        assertEq(down, 1);
        assertEq(registry.reputation(alice), 1);
    }

    // ═══════════════ pause / unpause ═══════════════

    function test_pause_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        registry.pause();
    }

    function test_unpause_revertNonOwner() public {
        vm.prank(owner);
        registry.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        registry.unpause();
    }

    // ═══════════════ Fuzz: rating ═══════════════

    function testFuzz_submitReview_invalidRating(uint8 rating) public {
        vm.assume(rating == 0 || rating > 5);

        vm.startPrank(alice);
        registry.checkIn(0);
        vm.expectRevert(ReviewRegistry.InvalidRating.selector);
        registry.submitReview(0, rating, "QmHash");
        vm.stopPrank();
    }

    function testFuzz_submitReview_validRating(uint8 rating) public {
        rating = uint8(bound(rating, 1, 5));

        vm.startPrank(alice);
        registry.checkIn(0);
        registry.submitReview(0, rating, "QmHash");
        vm.stopPrank();

        (,,,uint8 storedRating,,,,) = registry.reviews(0);
        assertEq(storedRating, rating);
    }

    // ═══════════════ Fuzz: check-in timing ═══════════════

    function testFuzz_submitReview_outsideCheckinWindow(uint256 delay) public {
        delay = bound(delay, 24 hours + 1, 365 days);

        vm.prank(alice);
        registry.checkIn(0);

        vm.warp(block.timestamp + delay);

        vm.prank(alice);
        vm.expectRevert(ReviewRegistry.NotCheckedIn.selector);
        registry.submitReview(0, 3, "QmHash");
    }

    function testFuzz_submitReview_insideCheckinWindow(uint256 delay) public {
        delay = bound(delay, 0, 24 hours);

        vm.prank(alice);
        registry.checkIn(0);

        vm.warp(block.timestamp + delay);

        vm.prank(alice);
        registry.submitReview(0, 3, "QmHash");
    }

    // ═══════════════ Fuzz: duplicate votes ═══════════════

    function testFuzz_vote_duplicateReverts(address voter) public {
        vm.assume(voter != address(0));

        _checkInAndReview(alice, 0, 4);

        vm.prank(voter);
        registry.upvote(0);

        vm.prank(voter);
        vm.expectRevert(ReviewRegistry.AlreadyVoted.selector);
        registry.upvote(0);
    }
}
