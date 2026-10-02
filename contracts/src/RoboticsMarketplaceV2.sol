// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import "./interfaces/IAgentRegistry.sol";
import "./utils/Pausable.sol";
import "./libraries/SafeTransfer.sol";

/// @title RoboticsMarketplaceV2
/// @notice Dual-rail marketplace for listing and purchasing robotics training data, with fees.
/// @dev `purchaseWithAgent` follows checks-effects-interactions (state is finalized before any
///      token transfer) and is additionally guarded by `nonReentrant`. The guard uses transient
///      storage (`ReentrancyGuardTransient`), the same primitive `X402Facilitator` uses in this
///      repository, which requires the Cancun EVM target already configured in `foundry.toml`.
contract RoboticsMarketplaceV2 is Pausable, ReentrancyGuardTransient {
    using SafeTransfer for IERC20;

    /// @notice Upper bound on `batchListAssets` array length, to keep a single batch call within
    ///         a sane gas budget instead of letting the caller self-grief an unbounded loop.
    uint256 public constant MAX_BATCH_LIST_SIZE = 50;

    IERC20 public immutable paymentToken;
    IAgentRegistry public immutable agentRegistry;
    address public feeRecipient;
    uint256 public feePercentage;

    struct Asset {
        uint256 id;
        address seller;
        string ipfsURI;
        uint256 price;
        bool isSold;
        uint256 createdAt;
    }

    uint256 private _nextAssetId;
    mapping(uint256 => Asset) public assets;
    mapping(address => uint256[]) public sellerAssets;

    event AssetListed(uint256 indexed assetId, address indexed seller, uint256 price);
    event AssetPurchased(uint256 indexed assetId, address indexed buyer, address indexed agent, uint256 price);
    event FeeUpdated(uint256 newFeePercentage);
    event FeeRecipientUpdated(address newRecipient);

    constructor(address _paymentToken, address _agentRegistry, address _feeRecipient, uint256 _feePercentage) {
        paymentToken = IERC20(_paymentToken);
        agentRegistry = IAgentRegistry(_agentRegistry);
        feeRecipient = _feeRecipient;
        feePercentage = _feePercentage;
    }

    function listAsset(string calldata ipfsURI, uint256 price) external whenNotPaused {
        _listAsset(msg.sender, ipfsURI, price);
    }

    function _listAsset(address seller, string calldata ipfsURI, uint256 price) internal {
        require(price > 0, "Price must be > 0");
        uint256 assetId = ++_nextAssetId;

        assets[assetId] = Asset({
            id: assetId,
            seller: seller,
            ipfsURI: ipfsURI,
            price: price,
            isSold: false,
            createdAt: block.timestamp
        });

        sellerAssets[seller].push(assetId);
        emit AssetListed(assetId, seller, price);
    }

    /// @notice Purchases an asset on behalf of a verified AI agent.
    /// @dev Checks-effects-interactions: `asset.isSold` is finalized before any token transfer is
    ///      attempted, and `nonReentrant` blocks any reentrant call into this contract for the
    ///      duration of the transfers, in case `paymentToken` has transfer hooks.
    function purchaseWithAgent(uint256 assetId, address agentAddress) external whenNotPaused nonReentrant {
        Asset storage asset = assets[assetId];
        require(!asset.isSold, "Asset already sold");
        require(agentRegistry.isAgentActive(agentAddress), "Invalid agent");

        uint256 fee = (asset.price * feePercentage) / 10000;
        uint256 sellerAmount = asset.price - fee;
        address seller = asset.seller;
        uint256 price = asset.price;

        asset.isSold = true;
        emit AssetPurchased(assetId, msg.sender, agentAddress, price);

        paymentToken.safeTransferFrom(msg.sender, address(this), price);

        if (fee > 0) {
            paymentToken.safeTransfer(feeRecipient, fee);
        }
        paymentToken.safeTransfer(seller, sellerAmount);
    }

    /// @notice Lists several assets in a single call.
    /// @dev Capped at `MAX_BATCH_LIST_SIZE` entries so a single batch cannot blow past a sane gas
    ///      budget; this only protects the caller from self-inflicted gas griefing, since each
    ///      listing in the batch is attributed to `msg.sender` as seller.
    function batchListAssets(string[] calldata ipfsURIs, uint256[] calldata prices) external whenNotPaused {
        require(ipfsURIs.length == prices.length, "Length mismatch");
        require(ipfsURIs.length <= MAX_BATCH_LIST_SIZE, "Batch too large");
        for (uint256 i = 0; i < ipfsURIs.length; i++) {
            _listAsset(msg.sender, ipfsURIs[i], prices[i]);
        }
    }

    function setFeePercentage(uint256 _feePercentage) external {
        require(msg.sender == owner, "Not owner");
        require(_feePercentage <= 1000, "Max 10%");
        feePercentage = _feePercentage;
        emit FeeUpdated(_feePercentage);
    }

    function setFeeRecipient(address _feeRecipient) external {
        require(msg.sender == owner, "Not owner");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    function getAsset(uint256 assetId) external view returns (Asset memory) {
        return assets[assetId];
    }

    function totalAssets() external view returns (uint256) {
        return _nextAssetId;
    }

    function getSellerAssets(address seller) external view returns (uint256[] memory) {
        return sellerAssets[seller];
    }
}
