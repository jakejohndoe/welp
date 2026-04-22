// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {OGBadge} from "../src/OGBadge.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Minimal mintable ERC20 for use as a stand-in for WelpToken in
///      OGBadge tests. Keeps test setup independent of the production
///      token's access-control.
contract MockWELP is ERC20 {
    constructor() ERC20("Mock WELP", "mWELP") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract OGBadgeTest is Test {
    OGBadge public badge;
    MockWELP public welp;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 internal constant MINT_PRICE = 100 * 10 ** 18;
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;
    string internal constant URI = "ipfs://bafkreif6n2iqh2ds457ucdxnmzvtr6klvfk2fugcnnnr2hwfin4at5bx5y";

    event BadgeMinted(address indexed to, uint256 indexed tokenId);

    function setUp() public {
        welp = new MockWELP();
        badge = new OGBadge(address(welp), owner);
        welp.mint(alice, MINT_PRICE);
        welp.mint(bob, MINT_PRICE);
    }

    // ──────────────── Constructor ────────────────

    function test_constructor_setsWelpTokenAndOwner() public view {
        assertEq(address(badge.welpToken()), address(welp));
        assertEq(badge.owner(), owner);
        assertEq(badge.name(), "Welp OG Badge");
        assertEq(badge.symbol(), "OGWELP");
        assertEq(badge.nextTokenId(), 1);
        assertEq(badge.MINT_PRICE(), MINT_PRICE);
        assertEq(badge.MAX_SUPPLY(), 100);
        assertEq(badge.DEAD(), DEAD);
    }

    // ──────────────── mintBadge: happy path ────────────────

    function test_mintBadge_succeeds() public {
        vm.prank(alice);
        welp.approve(address(badge), MINT_PRICE);

        vm.expectEmit(true, true, false, false);
        emit BadgeMinted(alice, 1);

        vm.prank(alice);
        badge.mintBadge();

        assertEq(badge.balanceOf(alice), 1);
        assertEq(badge.ownerOf(1), alice);
        assertEq(badge.nextTokenId(), 2);
        assertEq(welp.balanceOf(alice), 0);
        assertEq(welp.balanceOf(DEAD), MINT_PRICE);
    }

    // ──────────────── mintBadge: reverts ────────────────

    function test_mintBadge_revertsWithoutApproval() public {
        vm.prank(alice);
        vm.expectRevert();
        badge.mintBadge();
    }

    function test_mintBadge_revertsOnDoubleMint() public {
        vm.prank(alice);
        welp.approve(address(badge), MINT_PRICE);
        vm.prank(alice);
        badge.mintBadge();

        welp.mint(alice, MINT_PRICE);
        vm.prank(alice);
        welp.approve(address(badge), MINT_PRICE);
        vm.prank(alice);
        vm.expectRevert(bytes("already minted"));
        badge.mintBadge();
    }

    function test_mintBadge_revertsWhenSoldOut() public {
        for (uint256 i = 0; i < 100; i++) {
            address minter = address(uint160(uint256(keccak256(abi.encode("minter", i)))));
            welp.mint(minter, MINT_PRICE);
            vm.prank(minter);
            welp.approve(address(badge), MINT_PRICE);
            vm.prank(minter);
            badge.mintBadge();
        }

        assertEq(badge.nextTokenId(), 101);

        address lateMinter = makeAddr("late");
        welp.mint(lateMinter, MINT_PRICE);
        vm.prank(lateMinter);
        welp.approve(address(badge), MINT_PRICE);
        vm.prank(lateMinter);
        vm.expectRevert(bytes("sold out"));
        badge.mintBadge();
    }

    // ──────────────── Soulbound ────────────────

    function test_soulbound_transferFromReverts() public {
        _mintFor(alice);

        vm.prank(alice);
        vm.expectRevert(bytes("Soulbound: non-transferable"));
        badge.transferFrom(alice, bob, 1);
    }

    function test_soulbound_safeTransferFromReverts() public {
        _mintFor(alice);

        vm.prank(alice);
        vm.expectRevert(bytes("Soulbound: non-transferable"));
        badge.safeTransferFrom(alice, bob, 1);
    }

    function test_soulbound_approvedSpenderTransferReverts() public {
        _mintFor(alice);

        vm.prank(alice);
        badge.approve(bob, 1);

        vm.prank(bob);
        vm.expectRevert(bytes("Soulbound: non-transferable"));
        badge.transferFrom(alice, bob, 1);
    }

    // ──────────────── tokenURI ────────────────

    function test_tokenURI_returnsSetURI() public {
        vm.prank(owner);
        badge.setTokenURI(URI);

        _mintFor(alice);

        assertEq(badge.tokenURI(1), URI);
    }

    function test_tokenURI_revertsForNonexistent() public {
        vm.expectRevert(bytes("nonexistent token"));
        badge.tokenURI(42);
    }

    // ──────────────── setTokenURI ────────────────

    function test_setTokenURI_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        badge.setTokenURI(URI);
    }

    function test_setTokenURI_updatesForAllTokens() public {
        _mintFor(alice);
        _mintFor(bob);

        vm.prank(owner);
        badge.setTokenURI(URI);
        assertEq(badge.tokenURI(1), URI);
        assertEq(badge.tokenURI(2), URI);

        string memory newUri = "ipfs://new-cid";
        vm.prank(owner);
        badge.setTokenURI(newUri);
        assertEq(badge.tokenURI(1), newUri);
        assertEq(badge.tokenURI(2), newUri);
    }

    // ──────────────── helpers ────────────────

    function _mintFor(address user) internal {
        if (welp.balanceOf(user) < MINT_PRICE) {
            welp.mint(user, MINT_PRICE);
        }
        vm.prank(user);
        welp.approve(address(badge), MINT_PRICE);
        vm.prank(user);
        badge.mintBadge();
    }
}
