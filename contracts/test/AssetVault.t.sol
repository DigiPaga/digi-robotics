// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AssetVault.sol";

contract AssetVaultTest is Test {
    AssetVault public vault;
    address public firstWriter = address(0x111);
    address public other = address(0x222);

    function setUp() public {
        vault = new AssetVault();
    }

    function test_StoreAsset_FirstWriterBecomesOwner() public {
        vm.prank(firstWriter);
        vault.storeAsset(1, "ipfs://asset1");

        assertEq(vault.getAssetURI(1), "ipfs://asset1");
        assertEq(vault.getAssetOwner(1), firstWriter);
    }

    function test_StoreAsset_OwnerCanOverwrite() public {
        vm.prank(firstWriter);
        vault.storeAsset(1, "ipfs://asset1");

        vm.prank(firstWriter);
        vault.storeAsset(1, "ipfs://asset1-updated");

        assertEq(vault.getAssetURI(1), "ipfs://asset1-updated");
        assertEq(vault.getAssetOwner(1), firstWriter);
    }

    function test_RevertWhen_NonOwnerOverwrites() public {
        vm.prank(firstWriter);
        vault.storeAsset(1, "ipfs://asset1");

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(AssetVault.NotAssetOwner.selector, 1, other, firstWriter));
        vault.storeAsset(1, "ipfs://hijacked");

        // The original content and ownership are untouched.
        assertEq(vault.getAssetURI(1), "ipfs://asset1");
        assertEq(vault.getAssetOwner(1), firstWriter);
    }

    function test_GetAssetURI_UnknownAssetIsEmpty() public view {
        assertEq(vault.getAssetURI(999), "");
        assertEq(vault.getAssetOwner(999), address(0));
    }

    function test_StoreAsset_IndependentAssetIdsHaveIndependentOwners() public {
        vm.prank(firstWriter);
        vault.storeAsset(1, "ipfs://asset1");

        vm.prank(other);
        vault.storeAsset(2, "ipfs://asset2");

        assertEq(vault.getAssetOwner(1), firstWriter);
        assertEq(vault.getAssetOwner(2), other);
    }
}
