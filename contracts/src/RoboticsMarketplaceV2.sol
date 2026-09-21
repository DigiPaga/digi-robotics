// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IAgentRegistry.sol";
import "./utils/Pausable.sol";
import "./libraries/SafeTransfer.sol";

contract RoboticsMarketplaceV2 is Pausable {
    using SafeTransfer for IERC20;

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
        require(price > 0, "Price must be > 0");
        uint256 assetId = ++_nextAssetId;
        
        assets[assetId] = Asset({
            id: assetId,
            seller: msg.sender,
            ipfsURI: ipfsURI,
            price: price,
            isSold: false,
            createdAt: block.timestamp
        });

        sellerAssets[msg.sender].push(assetId);
        emit AssetListed(assetId, msg.sender, price);
    }

    function purchaseWithAgent(uint256 assetId, address agentAddress) external whenNotPaused {
        Asset storage asset = assets[assetId];
        require(!asset.isSold, "Asset already sold");
        require(agentRegistry.isAgentActive(agentAddress), "Invalid agent");

        uint256 fee = (asset.price * feePercentage) / 10000;
        uint256 sellerAmount = asset.price - fee;

        paymentToken.safeTransferFrom(msg.sender, address(this), asset.price);
        
        if (fee > 0) {
            paymentToken.safeTransfer(feeRecipient, fee);
        }
        paymentToken.safeTransfer(asset.seller, sellerAmount);

        asset.isSold = true;
        emit AssetPurchased(assetId, msg.sender, agentAddress, asset.price);
    }

    // CORRECCIÓN: Usar 'this.' para llamar a una función external
    function batchListAssets(string[] calldata ipfsURIs, uint256[] calldata prices) external whenNotPaused {
        require(ipfsURIs.length == prices.length, "Length mismatch");
        for (uint256 i = 0; i < ipfsURIs.length; i++) {
            this.listAsset(ipfsURIs[i], prices[i]);
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
