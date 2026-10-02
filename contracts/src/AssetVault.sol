// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AssetVault
/// @notice Stores an off-chain URI (e.g. IPFS) per caller-supplied `assetId`.
/// @dev Access control: first-writer-owns. The first account to call `storeAsset` for a given
///      `assetId` becomes that id's owner; only that owner may overwrite the URI afterwards.
///      Chosen over a single contract-owner model because every other contract in this
///      repository (RoboticsMarketplace, RoboticsMarketplaceV2, AgentRegistry, AgentRegistryV2)
///      is permissionless and ties write authority to whoever created the record, not to one
///      admin address — a vault that only one owner could write to would not fit how sellers are
///      expected to use it. `assetId` is caller-supplied and this contract does not validate it
///      against any other contract's id space (e.g. a RoboticsMarketplaceV2 listing id); callers
///      are responsible for using ids that correspond to assets they actually control.
contract AssetVault {
    mapping(uint256 => string) private _assetURIs;
    mapping(uint256 => address) private _assetOwners;

    /// @notice Emitted whenever an asset's URI is stored or updated.
    event AssetStored(uint256 indexed assetId, address indexed owner, string uri);

    /// @notice The caller does not own `assetId` and is not the first writer for it.
    error NotAssetOwner(uint256 assetId, address caller, address owner);

    /// @notice Stores the URI for `assetId`, claiming ownership of it if unclaimed.
    /// @dev Reverts with `NotAssetOwner` if `assetId` already has an owner other than the caller.
    function storeAsset(uint256 assetId, string calldata uri) external {
        address currentOwner = _assetOwners[assetId];
        if (currentOwner == address(0)) {
            _assetOwners[assetId] = msg.sender;
        } else if (currentOwner != msg.sender) {
            revert NotAssetOwner(assetId, msg.sender, currentOwner);
        }

        _assetURIs[assetId] = uri;
        emit AssetStored(assetId, msg.sender, uri);
    }

    /// @notice Returns the stored URI for `assetId`, or the empty string if never stored.
    function getAssetURI(uint256 assetId) external view returns (string memory) {
        return _assetURIs[assetId];
    }

    /// @notice Returns the owner of `assetId`, or the zero address if never stored.
    function getAssetOwner(uint256 assetId) external view returns (address) {
        return _assetOwners[assetId];
    }
}
