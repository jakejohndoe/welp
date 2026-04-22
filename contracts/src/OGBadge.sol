// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title OGBadge
/// @notice Soulbound ERC-721 issued to the first 100 Welp contributors who burn
///         100 WELP to mint. Burn is performed by transferring to 0x...dEaD
///         because the deployed WelpToken MVP does not implement ERC20Burnable.
///         A WelpToken v2 with Burnable + Permit is roadmapped post-graduation;
///         this contract is written to stay useful against either version.
/// @dev    Soulbound enforcement is implemented by overriding _update so that
///         any transfer between two non-zero addresses reverts. Mint
///         (from == 0) and burn (to == 0) are allowed but there is no
///         burn entrypoint exposed externally.
contract OGBadge is ERC721, Ownable {
    /// @notice WELP token used as the mint currency. Immutable after deploy.
    IERC20 public immutable welpToken;

    /// @notice Cost to mint one badge, in WELP (18 decimals).
    uint256 public constant MINT_PRICE = 100 * 10 ** 18;

    /// @notice Hard cap on badge supply. Enforced in mintBadge.
    uint256 public constant MAX_SUPPLY = 100;

    /// @notice Sink address for the burn. Tokens sent here are permanently
    ///         locked. totalSupply of WELP is unchanged by this transfer.
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    /// @notice Next tokenId to be minted. Starts at 1 so tokenId 0 is unused
    ///         and _ownerOf(0) returning the zero address is unambiguous.
    uint256 public nextTokenId = 1;

    /// @dev Single base URI shared by every minted token. All badges have
    ///      identical artwork -- they are membership credentials, not
    ///      per-token collectibles.
    string private _baseTokenURI;

    /// @notice Emitted when a user successfully mints a badge.
    event BadgeMinted(address indexed to, uint256 indexed tokenId);

    constructor(address _welpToken, address initialOwner)
        ERC721("Welp OG Badge", "OGWELP")
        Ownable(initialOwner)
    {
        welpToken = IERC20(_welpToken);
    }

    /// @notice Burn 100 WELP to mint one OG Badge. Caller must approve this
    ///         contract for at least MINT_PRICE on WelpToken first.
    /// @dev    Checks: caller holds no badge yet; supply remaining. Then
    ///         effects: bump nextTokenId. Then interactions: transferFrom
    ///         then _safeMint. _safeMint is ok last because a reentrant
    ///         onERC721Received cannot re-enter mintBadge (the caller would
    ///         already own a token by the time onERC721Received runs).
    function mintBadge() external {
        require(balanceOf(msg.sender) == 0, "already minted");
        require(nextTokenId <= MAX_SUPPLY, "sold out");

        uint256 tokenId = nextTokenId;
        unchecked {
            nextTokenId = tokenId + 1;
        }

        // Burn via dead-address transfer. WelpToken MVP has no burn().
        require(welpToken.transferFrom(msg.sender, DEAD, MINT_PRICE), "WELP transfer failed");

        _safeMint(msg.sender, tokenId);
        emit BadgeMinted(msg.sender, tokenId);
    }

    /// @notice Owner-settable base URI. All tokens share this URI.
    function setTokenURI(string calldata uri) external onlyOwner {
        _baseTokenURI = uri;
    }

    /// @notice Returns the shared metadata URI for any minted token.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "nonexistent token");
        return _baseTokenURI;
    }

    /// @dev Soulbound: block any transfer where both from and to are
    ///      non-zero. Mint (from == 0) and burn (to == 0) remain possible,
    ///      but no external burn entrypoint is exposed so in practice only
    ///      mint is reachable.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }
}
