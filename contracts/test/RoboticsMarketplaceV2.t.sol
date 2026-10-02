// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import "../src/RoboticsMarketplaceV2.sol";
import "../src/AgentRegistryV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    function mint(address to, uint256 amount) public { _mint(to, amount); }
}

/// @notice Payment token that reenters `purchaseWithAgent` from inside `transferFrom`, mimicking
///         an ERC777/hook-style token. Used to exercise DR-C-05's `nonReentrant` guard.
contract ReentrantPaymentToken {
    RoboticsMarketplaceV2 public marketplace;
    uint256 public targetAssetId;
    address public targetAgent;
    bool public attack;

    function setTarget(RoboticsMarketplaceV2 marketplace_, uint256 assetId, address agent) external {
        marketplace = marketplace_;
        targetAssetId = assetId;
        targetAgent = agent;
        attack = true;
    }

    function disableAttack() external {
        attack = false;
    }

    function balanceOf(address) external pure returns (uint256) {
        return type(uint256).max;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }

    function allowance(address, address) external pure returns (uint256) {
        return type(uint256).max;
    }

    function transferFrom(address, address, uint256) external returns (bool) {
        if (attack) {
            attack = false;
            marketplace.purchaseWithAgent(targetAssetId, targetAgent);
        }
        return true;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }
}

contract RoboticsMarketplaceV2Test is Test {
    RoboticsMarketplaceV2 public marketplace;
    AgentRegistryV2 public registry;
    MockUSDC public usdc;
    
    address public seller = address(0x111);
    address public buyer = address(0x222);
    address public agent = address(0x333);
    address public feeRecipient = address(0x444);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AgentRegistryV2();
        marketplace = new RoboticsMarketplaceV2(address(usdc), address(registry), feeRecipient, 100); // 1% fee

        vm.prank(agent);
        registry.registerAgent(agent, "vps", "ipfs://agent");

        usdc.mint(buyer, 1000 ether);
    }

    function test_ListAndPurchaseWithFee() public {
        vm.prank(seller);
        marketplace.listAsset("ipfs://asset1", 100 ether);

        vm.prank(buyer);
        usdc.approve(address(marketplace), 100 ether);

        vm.prank(buyer);
        marketplace.purchaseWithAgent(1, agent);

        // Fee: 1% of 100 = 1 ether
        assertEq(usdc.balanceOf(feeRecipient), 1 ether);
        // Seller: 100 - 1 = 99 ether
        assertEq(usdc.balanceOf(seller), 99 ether);
    }

    function test_BatchListAssets() public {
        string[] memory uris = new string[](3);
        uint256[] memory prices = new uint256[](3);
        
        uris[0] = "ipfs://1";
        uris[1] = "ipfs://2";
        uris[2] = "ipfs://3";
        prices[0] = 10 ether;
        prices[1] = 20 ether;
        prices[2] = 30 ether;

        vm.prank(seller);
        marketplace.batchListAssets(uris, prices);

        assertEq(marketplace.totalAssets(), 3);
    }

    function test_GetSellerAssets() public {
        vm.prank(seller);
        marketplace.listAsset("ipfs://1", 10 ether);
        
        vm.prank(seller);
        marketplace.listAsset("ipfs://2", 20 ether);

        uint256[] memory assets = marketplace.getSellerAssets(seller);
        assertEq(assets.length, 2);
    }

    function test_BatchListAssets_RecordsCallerAsSeller() public {
        string[] memory uris = new string[](2);
        uris[0] = "ipfs://batch1";
        uris[1] = "ipfs://batch2";
        uint256[] memory prices = new uint256[](2);
        prices[0] = 10 ether;
        prices[1] = 20 ether;

        vm.prank(seller);
        marketplace.batchListAssets(uris, prices);

        assertEq(marketplace.getAsset(1).seller, seller);
        assertEq(marketplace.getAsset(2).seller, seller);
        assertEq(marketplace.getSellerAssets(seller).length, 2);
        assertEq(marketplace.getSellerAssets(address(marketplace)).length, 0);
    }

    function test_BatchListedAssetPaysSeller() public {
        string[] memory uris = new string[](1);
        uris[0] = "ipfs://batch1";
        uint256[] memory prices = new uint256[](1);
        prices[0] = 100 ether;

        vm.prank(seller);
        marketplace.batchListAssets(uris, prices);

        vm.startPrank(buyer);
        usdc.approve(address(marketplace), 100 ether);
        marketplace.purchaseWithAgent(1, agent);
        vm.stopPrank();

        assertEq(usdc.balanceOf(seller), 99 ether);
        assertEq(usdc.balanceOf(address(marketplace)), 0);
    }

    function test_RevertIf_BatchListWhilePaused() public {
        marketplace.pause();
        string[] memory uris = new string[](1);
        uris[0] = "ipfs://batch1";
        uint256[] memory prices = new uint256[](1);
        prices[0] = 1 ether;

        vm.prank(seller);
        vm.expectRevert("Pausable: paused");
        marketplace.batchListAssets(uris, prices);
    }

    function test_BatchListAssets_AtCapSucceeds() public {
        uint256 cap = marketplace.MAX_BATCH_LIST_SIZE();
        string[] memory uris = new string[](cap);
        uint256[] memory prices = new uint256[](cap);
        for (uint256 i = 0; i < cap; i++) {
            uris[i] = "ipfs://batch";
            prices[i] = 1 ether;
        }

        vm.prank(seller);
        marketplace.batchListAssets(uris, prices);

        assertEq(marketplace.totalAssets(), cap);
    }

    function test_RevertWhen_BatchListAssetsExceedsCap() public {
        uint256 overCap = marketplace.MAX_BATCH_LIST_SIZE() + 1;
        string[] memory uris = new string[](overCap);
        uint256[] memory prices = new uint256[](overCap);
        for (uint256 i = 0; i < overCap; i++) {
            uris[i] = "ipfs://batch";
            prices[i] = 1 ether;
        }

        vm.prank(seller);
        vm.expectRevert("Batch too large");
        marketplace.batchListAssets(uris, prices);
    }

    /// @dev DR-C-05: a payment token that reenters `purchaseWithAgent` during `transferFrom` must
    ///      be blocked by `nonReentrant`, and the targeted asset must remain unsold afterwards.
    function test_RevertWhen_PaymentTokenReentersPurchase() public {
        ReentrantPaymentToken evilToken = new ReentrantPaymentToken();
        RoboticsMarketplaceV2 evilMarketplace =
            new RoboticsMarketplaceV2(address(evilToken), address(registry), feeRecipient, 100);

        vm.prank(seller);
        evilMarketplace.listAsset("ipfs://evil", 100 ether);

        evilToken.setTarget(evilMarketplace, 1, agent);

        vm.prank(buyer);
        vm.expectRevert();
        evilMarketplace.purchaseWithAgent(1, agent);

        // The reentrant attempt reverted the whole transaction: the asset is still unsold.
        assertFalse(evilMarketplace.getAsset(1).isSold);

        // A legitimate, non-reentrant purchase still succeeds exactly once afterwards...
        evilToken.disableAttack();
        vm.prank(buyer);
        evilMarketplace.purchaseWithAgent(1, agent);
        assertTrue(evilMarketplace.getAsset(1).isSold);

        // ...and the asset cannot be bought a second time.
        vm.prank(buyer);
        vm.expectRevert("Asset already sold");
        evilMarketplace.purchaseWithAgent(1, agent);
    }
}
