// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentRegistryV2.sol";

contract AgentRegistryV2Test is Test {
    AgentRegistryV2 public registry;
    address public agent = address(0x123);
    address public owner = address(0x456);
    address public newOwner = address(0x789);

    function setUp() public {
        registry = new AgentRegistryV2();
    }

    function test_RegisterAgent() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(agent, "robot", "ipfs://hash");
        
        assertEq(agentId, 1);
        assertTrue(registry.isAgentActive(agent));
        
        IAgentRegistry.AgentIdentity memory identity = registry.getAgentIdentity(agent);
        assertEq(identity.owner, owner);
        assertEq(identity.agentType, "robot");
    }

    function test_UpdateMetadata() public {
        vm.prank(owner);
        registry.registerAgent(agent, "robot", "ipfs://old");
        
        vm.prank(agent);
        registry.updateMetadata("ipfs://new");
        
        IAgentRegistry.AgentIdentity memory identity = registry.getAgentIdentity(agent);
        assertEq(identity.metadataURI, "ipfs://new");
    }

    function test_TransferOwnership() public {
        vm.prank(owner);
        registry.registerAgent(agent, "robot", "ipfs://hash");
        
        vm.prank(owner);
        registry.transferOwnership(agent, newOwner);
        
        IAgentRegistry.AgentIdentity memory identity = registry.getAgentIdentity(agent);
        assertEq(identity.owner, newOwner);
    }

    function test_PauseUnpause() public {
        registry.pause();
        assertTrue(registry.paused());
        
        vm.prank(owner);
        registry.registerAgent(agent, "robot", "ipfs://hash");
        // Should revert because paused
    }
}
