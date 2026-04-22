// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test} from "forge-std/Test.sol";
import {CoinGame} from "../src/CoinGame.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal mintable ERC-20 stand-in for WelpToken. Keeps CoinGame tests
///      independent of the production token's access-control so we can fund
///      arbitrary balances in setUp.
contract MockWELP is ERC20 {
    constructor() ERC20("Mock WELP", "mWELP") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract CoinGameTest is Test {
    CoinGame public game;
    MockWELP public welp;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 internal constant TREASURY = 1_000 * 1e18;

    event Claimed(address indexed user, uint256 amount, uint256 timestamp);

    function setUp() public {
        // Foundry starts block.timestamp at 1; warp past COOLDOWN so
        // first-time claimants aren't trapped by lastClaim[user] + COOLDOWN.
        // Real chains have block.timestamp well past this bound.
        vm.warp(1 hours + 1);

        welp = new MockWELP();
        game = new CoinGame(address(welp));
        welp.mint(address(game), TREASURY);
    }

    // ──────────────── Constructor ────────────────

    function test_Constructor_SetsWelpToken() public view {
        assertEq(address(game.welpToken()), address(welp));
    }

    function test_Constants() public view {
        assertEq(game.MIN_CLAIM(), 5);
        assertEq(game.MAX_CLAIM(), 10);
        assertEq(game.COOLDOWN(), 1 hours);
    }

    // ──────────────── Happy path ────────────────

    function test_Claim_AtMinAmount() public {
        vm.prank(alice);
        game.claim(5);
        assertEq(welp.balanceOf(alice), 5 * 1e18);
    }

    function test_Claim_AtMaxAmount() public {
        vm.prank(alice);
        game.claim(10);
        assertEq(welp.balanceOf(alice), 10 * 1e18);
    }

    function test_Claim_AtMidAmount() public {
        vm.prank(alice);
        game.claim(7);
        assertEq(welp.balanceOf(alice), 7 * 1e18);
    }

    function test_Claim_DecrementsTreasury() public {
        vm.prank(alice);
        game.claim(8);
        assertEq(welp.balanceOf(address(game)), TREASURY - 8 * 1e18);
        assertEq(game.treasuryBalance(), TREASURY - 8 * 1e18);
    }

    // ──────────────── Revert paths ────────────────

    function test_Claim_RevertWhen_AmountBelowMin() public {
        vm.prank(alice);
        vm.expectRevert(CoinGame.AmountOutOfRange.selector);
        game.claim(4);
    }

    function test_Claim_RevertWhen_AmountAboveMax() public {
        vm.prank(alice);
        vm.expectRevert(CoinGame.AmountOutOfRange.selector);
        game.claim(11);
    }

    function test_Claim_RevertWhen_AmountZero() public {
        vm.prank(alice);
        vm.expectRevert(CoinGame.AmountOutOfRange.selector);
        game.claim(0);
    }

    function test_Claim_RevertWhen_OnCooldown() public {
        vm.prank(alice);
        game.claim(5);

        vm.prank(alice);
        vm.expectRevert(CoinGame.Cooldown.selector);
        game.claim(5);
    }

    function test_Claim_RevertWhen_OnCooldownJustBeforeUnlock() public {
        vm.prank(alice);
        game.claim(5);

        vm.warp(block.timestamp + 1 hours - 1);

        vm.prank(alice);
        vm.expectRevert(CoinGame.Cooldown.selector);
        game.claim(5);
    }

    function test_Claim_AllowedAfterCooldown() public {
        vm.prank(alice);
        game.claim(5);

        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(alice);
        game.claim(6);
        assertEq(welp.balanceOf(alice), 11 * 1e18);
    }

    function test_Claim_IndependentCooldownsPerUser() public {
        vm.prank(alice);
        game.claim(5);

        // bob can still claim while alice is on cooldown
        vm.prank(bob);
        game.claim(10);
        assertEq(welp.balanceOf(bob), 10 * 1e18);

        // alice is still blocked
        vm.prank(alice);
        vm.expectRevert(CoinGame.Cooldown.selector);
        game.claim(5);
    }

    function test_Claim_RevertWhen_TreasuryEmpty() public {
        // drain the treasury by repeated claims from different users
        CoinGame emptyGame = new CoinGame(address(welp));
        // no funding at all

        vm.prank(alice);
        vm.expectRevert(); // OZ ERC20InsufficientBalance
        emptyGame.claim(5);
    }

    // ──────────────── Events & state ────────────────

    function test_Claim_EmitsClaimedEvent() public {
        vm.expectEmit(true, false, false, true, address(game));
        emit Claimed(alice, 7, block.timestamp);

        vm.prank(alice);
        game.claim(7);
    }

    function test_Claim_UpdatesLastClaimTimestamp() public {
        uint256 ts = block.timestamp;
        vm.prank(alice);
        game.claim(5);
        assertEq(game.lastClaim(alice), ts);
    }

    // ──────────────── Views ────────────────

    function test_CooldownRemaining_ReturnsZeroBeforeFirstClaim() public view {
        assertEq(game.cooldownRemaining(alice), 0);
    }

    function test_CooldownRemaining_ReturnsCorrectValueDuringCooldown() public {
        vm.prank(alice);
        game.claim(5);

        // immediately after claim -> full hour left
        assertEq(game.cooldownRemaining(alice), 1 hours);

        // partway through
        vm.warp(block.timestamp + 15 minutes);
        assertEq(game.cooldownRemaining(alice), 45 minutes);
    }

    function test_CooldownRemaining_ReturnsZeroAfterCooldownElapsed() public {
        vm.prank(alice);
        game.claim(5);

        vm.warp(block.timestamp + 1 hours);
        assertEq(game.cooldownRemaining(alice), 0);
    }

    function test_TreasuryBalance_ReturnsCorrectAmount() public {
        assertEq(game.treasuryBalance(), TREASURY);

        vm.prank(alice);
        game.claim(5);
        assertEq(game.treasuryBalance(), TREASURY - 5 * 1e18);
    }
}
