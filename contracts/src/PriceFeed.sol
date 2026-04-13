// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceFeed
 * @author Welp Protocol
 * @notice Provides WELP/USD price by combining Chainlink ETH/USD feed with admin-set WELP/ETH rate
 * @dev Uses Chainlink oracle for ETH/USD price on Sepolia testnet
 */
contract PriceFeed is Ownable2Step {
    AggregatorV3Interface public immutable ethUsdPriceFeed;

    uint256 public welpPerEth = 10000e18; // Default: 10,000 WELP per ETH
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour

    event WelpPerEthUpdated(uint256 oldRate, uint256 newRate);

    error PriceFeedStale();
    error InvalidWelpPerEth();

    /**
     * @notice Initializes the PriceFeed with Chainlink ETH/USD aggregator
     * @param _ethUsdPriceFeed Address of Chainlink ETH/USD aggregator on Sepolia
     */
    constructor(address _ethUsdPriceFeed) Ownable(msg.sender) {
        require(_ethUsdPriceFeed != address(0), "Invalid price feed");
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
    }

    /**
     * @notice Sets the WELP per ETH exchange rate
     * @dev Only callable by owner
     * @param _welpPerEth New WELP/ETH rate (must be > 0)
     */
    function setWelpPerEth(uint256 _welpPerEth) external onlyOwner {
        if (_welpPerEth == 0) revert InvalidWelpPerEth();

        uint256 oldRate = welpPerEth;
        welpPerEth = _welpPerEth;

        emit WelpPerEthUpdated(oldRate, _welpPerEth);
    }

    /**
     * @notice Gets the current ETH price in USD from Chainlink
     * @dev Reverts if price data is stale (older than 1 hour)
     * @return ethPriceUsd ETH price in USD with 8 decimals
     */
    function getEthPriceUsd() public view returns (uint256 ethPriceUsd) {
        (
            /* uint80 roundId */,
            int256 price,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = ethUsdPriceFeed.latestRoundData();

        // Check for stale price data
        if (block.timestamp - updatedAt > PRICE_STALENESS_THRESHOLD) {
            revert PriceFeedStale();
        }

        // Price should always be positive for ETH/USD
        require(price > 0, "Invalid price");

        return uint256(price);
    }

    /**
     * @notice Calculates WELP price in USD
     * @dev Combines ETH/USD from Chainlink with admin-set WELP/ETH rate
     * @return welpPriceUsd WELP price in USD with 8 decimals
     */
    function getWelpPriceUsd() external view returns (uint256 welpPriceUsd) {
        uint256 ethPriceUsd = getEthPriceUsd(); // 8 decimals

        // Calculate WELP/USD
        // ethPriceUsd has 8 decimals, welpPerEth has 18 decimals
        // Result should have 8 decimals
        // Formula: (ethPriceUsd * 1e18) / welpPerEth
        welpPriceUsd = (ethPriceUsd * 1e18) / welpPerEth;

        return welpPriceUsd;
    }

    /**
     * @notice Gets the number of decimals for the ETH/USD price feed
     * @return decimals Number of decimals (should be 8 for USD feeds)
     */
    function getDecimals() external view returns (uint8) {
        return ethUsdPriceFeed.decimals();
    }

    /**
     * @notice Gets the latest round data from the Chainlink feed
     * @dev Exposed for debugging and monitoring purposes
     * @return roundId The round ID
     * @return price The price value
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp when round was updated
     * @return answeredInRound The round ID in which answer was computed
     */
    function getLatestRoundData() external view returns (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return ethUsdPriceFeed.latestRoundData();
    }
}