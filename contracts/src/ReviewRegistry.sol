// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRewardsVault {
    function distributeReward(address reviewer) external;
}

contract ReviewRegistry is Ownable2Step, Pausable, ReentrancyGuard {
    // ──────────────────── Structs ────────────────────

    struct Business {
        uint256 id;
        string name;
        string category;
        string location;
        bool exists;
    }

    struct Review {
        uint256 id;
        uint256 businessId;
        address reviewer;
        uint8 rating;
        string ipfsHash;
        uint256 timestamp;
        uint256 upvotes;
        uint256 downvotes;
    }

    // ──────────────────── Constants ────────────────────

    uint256 public constant CHECKIN_WINDOW = 24 hours;
    uint256 public constant REVIEW_COOLDOWN = 48 hours;

    // ──────────────────── State ────────────────────

    address public rewardsVault;

    uint256 public nextBusinessId;
    uint256 public nextReviewId;

    mapping(uint256 => Business) public businesses;
    mapping(uint256 => Review) public reviews;

    /// @dev businessId => user => timestamp of last check-in
    mapping(uint256 => mapping(address => uint256)) public lastCheckIn;

    /// @dev user => businessId => timestamp of last review
    mapping(address => mapping(uint256 => uint256)) public lastReviewTime;

    /// @dev reviewId => voter => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @dev reviewer => net reputation (upvotes − downvotes across all reviews)
    mapping(address => int256) public reputation;

    // ──────────────────── Events ────────────────────

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

    // ──────────────────── Errors ────────────────────

    error BusinessNotFound();
    error InvalidRating();
    error NotCheckedIn();
    error ReviewCooldown();
    error AlreadyVoted();
    error ReviewNotFound();
    error ZeroAddress();
    error RewardsVaultNotSet();

    // ──────────────────── Constructor ────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ──────────────────── Admin ────────────────────

    function addBusiness(string calldata name, string calldata category, string calldata location)
        external
        onlyOwner
    {
        uint256 id = nextBusinessId++;
        businesses[id] = Business({id: id, name: name, category: category, location: location, exists: true});
        emit BusinessAdded(id, name, category, location);
    }

    function setRewardsVault(address newVault) external onlyOwner {
        if (newVault == address(0)) revert ZeroAddress();
        address oldVault = rewardsVault;
        rewardsVault = newVault;
        emit RewardsVaultUpdated(oldVault, newVault);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ──────────────────── Check-in ────────────────────

    function checkIn(uint256 businessId) external whenNotPaused {
        if (!businesses[businessId].exists) revert BusinessNotFound();

        lastCheckIn[businessId][msg.sender] = block.timestamp;
        emit CheckedIn(businessId, msg.sender, block.timestamp);
    }

    // ──────────────────── Review ────────────────────

    function submitReview(uint256 businessId, uint8 rating, string calldata ipfsHash)
        external
        whenNotPaused
        nonReentrant
    {
        if (!businesses[businessId].exists) revert BusinessNotFound();
        if (rating < 1 || rating > 5) revert InvalidRating();

        uint256 checkInTime = lastCheckIn[businessId][msg.sender];
        if (checkInTime == 0 || block.timestamp > checkInTime + CHECKIN_WINDOW) {
            revert NotCheckedIn();
        }

        uint256 lastReview = lastReviewTime[msg.sender][businessId];
        if (lastReview != 0 && block.timestamp < lastReview + REVIEW_COOLDOWN) {
            revert ReviewCooldown();
        }

        uint256 reviewId = nextReviewId++;
        reviews[reviewId] = Review({
            id: reviewId,
            businessId: businessId,
            reviewer: msg.sender,
            rating: rating,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            upvotes: 0,
            downvotes: 0
        });

        lastReviewTime[msg.sender][businessId] = block.timestamp;

        emit ReviewSubmitted(reviewId, businessId, msg.sender, rating, ipfsHash, block.timestamp);

        if (rewardsVault != address(0)) {
            IRewardsVault(rewardsVault).distributeReward(msg.sender);
        }
    }

    // ──────────────────── Voting ────────────────────

    function upvote(uint256 reviewId) external whenNotPaused {
        _vote(reviewId, true);
    }

    function downvote(uint256 reviewId) external whenNotPaused {
        _vote(reviewId, false);
    }

    function _vote(uint256 reviewId, bool isUpvote) internal {
        Review storage r = reviews[reviewId];
        if (r.timestamp == 0) revert ReviewNotFound();
        if (hasVoted[reviewId][msg.sender]) revert AlreadyVoted();

        hasVoted[reviewId][msg.sender] = true;

        if (isUpvote) {
            r.upvotes++;
            reputation[r.reviewer] += 1;
        } else {
            r.downvotes++;
            reputation[r.reviewer] -= 1;
        }

        emit VoteRecorded(reviewId, msg.sender, isUpvote);
        emit ReputationUpdated(r.reviewer, reputation[r.reviewer]);
    }
}
