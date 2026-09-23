// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/RoboticsMarketplace.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    function mint(address to, uint256 amount) public { _mint(to, amount); }
}

contract GasSnapshotTest is Test {
    AgentRegistry public registry;
    RoboticsMarketplace public marketplace;
    MockUSDC public usdc;
    address public seller = address(0x111);
    address public buyer = address(0x222);
    address public agent = address(0x333);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AgentRegistry();
        marketplace = new RoboticsMarketplace(address(usdc), address(registry));

        vm.prank(agent);
        registry.registerAgent(agent, "vps", "ipfs://agent");
        usdc.mint(buyer, 100 ether);
    }

    function test_Gas_RegisterAgent() public {
        vm.prank(seller);
        vm.snapshotGasLastCall("registerAgent");
        registry.registerAgent(address(0x444), "robot", "ipfs://meta");
    }

    function test_Gas_ListAsset() public {
        vm.prank(seller);
        vm.snapshotGasLastCall("listAsset");
        marketplace.listAsset("ipfs://test", 10 ether);
    }

    function test_Gas_PurchaseWithAgent() public {
        vm.prank(seller);
        marketplace.listAsset("ipfs://test", 10 ether);
        vm.prank(buyer);
        usdc.approve(address(marketplace), 10 ether);
        
        vm.prank(buyer);
        vm.snapshotGasLastCall("purchaseWithAgent");
        marketplace.purchaseWithAgent(1, agent);
    }
}
