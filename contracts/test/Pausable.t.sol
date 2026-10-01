// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/utils/Pausable.sol";
import "../src/AgentRegistryV2.sol";

// Minimal concrete contract so the abstract Pausable base can be deployed directly.
contract PausableHarness is Pausable {}

// Inherits Pausable (like X402FacilitatorTest inherits IX402Facilitator) purely so its
// Paused/Unpaused events are in scope for vm.expectEmit matching below.
contract PausableTest is Test, Pausable {
    PausableHarness public harness;
    address public stranger = address(0x1234);

    function setUp() public {
        harness = new PausableHarness();
    }

    function test_StartsUnpaused() public view {
        assertFalse(harness.paused());
    }

    function test_OwnerIsDeployer() public view {
        assertEq(harness.owner(), address(this));
    }

    function test_Pause_SetsPausedAndEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit Paused(address(this));
        harness.pause();

        assertTrue(harness.paused());
    }

    function test_Unpause_ClearsPausedAndEmitsEvent() public {
        harness.pause();

        vm.expectEmit(true, true, true, true);
        emit Unpaused(address(this));
        harness.unpause();

        assertFalse(harness.paused());
    }

    function test_RevertIf_NonOwnerPauses() public {
        vm.prank(stranger);
        vm.expectRevert("Pausable: caller is not owner");
        harness.pause();
    }

    function test_RevertIf_NonOwnerUnpauses() public {
        harness.pause();

        vm.prank(stranger);
        vm.expectRevert("Pausable: caller is not owner");
        harness.unpause();
    }
}

// Exercises whenNotPaused as actually wired up in a concrete contract (AgentRegistryV2),
// since that is the gate real callers hit, not just the abstract base.
contract PausableOnAgentRegistryV2Test is Test {
    AgentRegistryV2 public registry;
    address public agent = address(0x123);

    function setUp() public {
        registry = new AgentRegistryV2();
    }

    function test_RevertIf_RegisterAgentWhilePaused() public {
        registry.pause();

        vm.expectRevert("Pausable: paused");
        registry.registerAgent(agent, "robot", "ipfs://hash");
    }

    function test_RegisterAgentSucceeds_AfterUnpause() public {
        registry.pause();
        registry.unpause();

        uint256 agentId = registry.registerAgent(agent, "robot", "ipfs://hash");
        assertEq(agentId, 1);
    }

    function test_RevertIf_UpdateMetadataWhilePaused() public {
        registry.registerAgent(agent, "robot", "ipfs://hash");
        registry.pause();

        vm.prank(agent);
        vm.expectRevert("Pausable: paused");
        registry.updateMetadata("ipfs://new");
    }
}
