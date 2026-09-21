// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RoboticsMarketplaceV2.sol";
import "../src/AgentRegistryV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    function mint(address to, uint256 amount) public { _mint(to, amount); }
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
}
