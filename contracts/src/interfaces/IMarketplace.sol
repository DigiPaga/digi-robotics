// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketplace {
    struct Asset {
        uint256 id;
        address seller;
        string ipfsURI;
        uint256 price;
        bool isSold;
    }

    event AssetListed(uint256 indexed assetId, address indexed seller, uint256 price);
    event AssetPurchased(uint256 indexed assetId, address indexed buyer, address indexed agent);

    function listAsset(string calldata ipfsURI, uint256 price) external;
    function purchaseWithAgent(uint256 assetId, address agentAddress) external;
    function getAsset(uint256 assetId) external view returns (Asset memory);
    function totalAssets() external view returns (uint256);
}
