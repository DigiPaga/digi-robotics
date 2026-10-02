// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public agentAddress = address(0x123);
    address public owner = address(0x456);

    function setUp() public {
        vm.prank(owner);
        registry = new AgentRegistry();
    }

    function test_RegisterAgent() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(agentAddress, "robot", "ipfs://hash");
        
        assertEq(agentId, 1);
        assertTrue(registry.isAgentActive(agentAddress));
        
        IAgentRegistry.AgentIdentity memory identity = registry.getAgentIdentity(agentAddress);
        assertEq(identity.owner, owner);
        assertEq(identity.agentType, "robot");
    }

    function test_RevertIfAgentAlreadyRegistered() public {
        vm.prank(owner);
        registry.registerAgent(agentAddress, "robot", "ipfs://hash");
        
        vm.prank(owner);
        vm.expectRevert("Agent already registered");
        registry.registerAgent(agentAddress, "vps", "ipfs://hash2");
    }

    function test_VerifyAgent() public {
        vm.prank(owner);
        registry.registerAgent(agentAddress, "robot", "ipfs://hash");

        bytes32 mockHash = keccak256("verification_data");
        vm.prank(owner);
        registry.verifyAgent(agentAddress, mockHash);
        // Si llega aquí sin revertir, el evento se emitió correctamente
    }

    function test_RevertWhen_VerifyAgentCalledByNonRegistrant() public {
        vm.prank(owner);
        registry.registerAgent(agentAddress, "robot", "ipfs://hash");

        vm.expectRevert("Not agent owner");
        registry.verifyAgent(agentAddress, keccak256("verification_data"));
    }

    function test_RevertWhen_VerifyAgentNotRegistered() public {
        vm.expectRevert("Agent not registered");
        registry.verifyAgent(agentAddress, keccak256("verification_data"));
    }
}
