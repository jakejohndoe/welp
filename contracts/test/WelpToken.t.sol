// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {WelpToken} from "../src/WelpToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WelpTokenTest is Test {
    WelpToken public token;

    address public owner = makeAddr("owner");
    address public vault = makeAddr("vault");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    event RewardsVaultUpdated(address indexed oldVault, address indexed newVault);

    function setUp() public {
        token = new WelpToken(owner);
    }

    // ──────────────── Deployment ────────────────

    function test_deployment() public view {
        assertEq(token.name(), "Welp");
        assertEq(token.symbol(), "WELP");
        assertEq(token.totalSupply(), 0);
        assertEq(token.owner(), owner);
        assertEq(token.rewardsVault(), address(0));
    }

    // ──────────────── setRewardsVault ────────────────

    function test_setRewardsVault() public {
        vm.prank(owner);
        token.setRewardsVault(vault);
        assertEq(token.rewardsVault(), vault);
    }

    function test_setRewardsVault_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit RewardsVaultUpdated(address(0), vault);
        token.setRewardsVault(vault);
    }

    function test_setRewardsVault_updatesFromPrevious() public {
        vm.startPrank(owner);
        token.setRewardsVault(vault);
        address newVault = makeAddr("newVault");
        vm.expectEmit(true, true, false, false);
        emit RewardsVaultUpdated(vault, newVault);
        token.setRewardsVault(newVault);
        vm.stopPrank();
        assertEq(token.rewardsVault(), newVault);
    }

    function test_setRewardsVault_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        token.setRewardsVault(vault);
    }

    function test_setRewardsVault_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(WelpToken.ZeroAddress.selector);
        token.setRewardsVault(address(0));
    }

    // ──────────────── mint ────────────────

    function test_mint() public {
        vm.prank(owner);
        token.setRewardsVault(vault);

        vm.prank(vault);
        token.mint(alice, 1000e18);

        assertEq(token.balanceOf(alice), 1000e18);
        assertEq(token.totalSupply(), 1000e18);
    }

    function test_mint_revertNonVault() public {
        vm.prank(owner);
        token.setRewardsVault(vault);

        vm.prank(alice);
        vm.expectRevert(WelpToken.OnlyRewardsVault.selector);
        token.mint(alice, 100e18);
    }

    function test_mint_revertWhenPaused() public {
        vm.startPrank(owner);
        token.setRewardsVault(vault);
        token.pause();
        vm.stopPrank();

        vm.prank(vault);
        vm.expectRevert();
        token.mint(alice, 100e18);
    }

    function test_mint_worksAfterUnpause() public {
        vm.startPrank(owner);
        token.setRewardsVault(vault);
        token.pause();
        token.unpause();
        vm.stopPrank();

        vm.prank(vault);
        token.mint(alice, 50e18);
        assertEq(token.balanceOf(alice), 50e18);
    }

    // ──────────────── pause / unpause ────────────────

    function test_pause_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        token.pause();
    }

    function test_unpause_revertNonOwner() public {
        vm.prank(owner);
        token.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        token.unpause();
    }

    // ──────────────── Ownable2Step ────────────────

    function test_ownable2Step_transfer() public {
        vm.prank(owner);
        token.transferOwnership(alice);
        // still owner until accepted
        assertEq(token.owner(), owner);

        vm.prank(alice);
        token.acceptOwnership();
        assertEq(token.owner(), alice);
    }

    function test_ownable2Step_revertAcceptByWrongAddress() public {
        vm.prank(owner);
        token.transferOwnership(alice);

        vm.prank(bob);
        vm.expectRevert();
        token.acceptOwnership();
    }

    // ──────────────── Fuzz ────────────────

    function testFuzz_mint_anyAmount(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint128).max);

        vm.prank(owner);
        token.setRewardsVault(vault);

        vm.prank(vault);
        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);
    }
}
