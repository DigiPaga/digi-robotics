// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IAgentRegistry.sol";

/// @title RoboticsMarketplace
/// @notice A dual-rail marketplace for listing and purchasing robotics training data.
/// @dev Uses Checks-Effects-Interactions pattern to prevent reentrancy.
contract RoboticsMarketplace {
    IERC20 public immutable paymentToken;
    IAgentRegistry public immutable agentRegistry;

    struct Asset { 
        uint256 id; 
        address seller; 
        string ipfsURI; 
        uint256 price; 
        bool isSold; 
    }
    
    uint256 private _nextAssetId;
    mapping(uint256 => Asset) public assets;

    event AssetListed(uint256 indexed assetId, address indexed seller, uint256 price, string ipfsURI);
    event AssetPurchased(uint256 indexed assetId, address indexed buyer, address indexed agent, uint256 price);

    /// @notice Initializes the marketplace with the payment token and agent registry.
    /// @param _paymentToken The address of the ERC20 token used for payments (e.g., USDC).
    /// @param _agentRegistry The address of the AgentRegistry contract.
    constructor(address _paymentToken, address _agentRegistry) {
        paymentToken = IERC20(_paymentToken);
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /// @notice Lists a new digital asset for sale.
    /// @param ipfsURI The IPFS URI where the asset data is stored.
    /// @param price The price of the asset in the payment token's smallest unit (e.g., 6 decimals for USDC).
    function listAsset(string calldata ipfsURI, uint256 price) external {
        require(price > 0, "Price must be > 0");
        uint256 assetId = ++_nextAssetId;
        
        assets[assetId] = Asset({ 
            id: assetId, 
            seller: msg.sender, 
            ipfsURI: ipfsURI, 
            price: price, 
            isSold: false 
        });
        
        emit AssetListed(assetId, msg.sender, price, ipfsURI);
    }

    /// @notice Purchases an asset on behalf of a verified AI agent.
    /// @param assetId The unique identifier of the asset to purchase.
    /// @param agentAddress The address of the AI agent executing the purchase.
    function purchaseWithAgent(uint256 assetId, address agentAddress) external {
        Asset storage asset = assets[assetId];
        require(!asset.isSold, "Asset already sold");
        require(agentRegistry.isAgentActive(agentAddress), "Invalid or inactive agent");
        
        // Checks-Effects-Interactions: Update state before external call
        asset.isSold = true;
        
        require(paymentToken.transferFrom(msg.sender, address(this), asset.price), "Transfer failed");
        require(paymentToken.transfer(asset.seller, asset.price), "Payout failed");
        
        emit AssetPurchased(assetId, msg.sender, agentAddress, asset.price);
    }
}
