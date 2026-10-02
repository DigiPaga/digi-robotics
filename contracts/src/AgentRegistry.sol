// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice A minimal on-chain registry: any address can register an AI agent identity and record
///         agent metadata.
/// @dev This contract takes inspiration from the ERC-8004 "agent identity" concept but does NOT
///      implement the ERC-8004 standard: there is no validator or reputation registry, no trust
///      model, and no feedback mechanism. `verifyAgent` (below) is a restricted self-attestation,
///      not independent third-party verification. `isAgentActive`/`getAgentIdentity` should be
///      read as registry bookkeeping, not as a compliance or security guarantee.
///
///      Known limitation (not fixed here, see `registerAgent`): nothing proves the caller
///      controls `agentAddress`, so any address can be registered by any caller
///      ("address squatting"). Acceptable for a demo registry; a production identity system
///      would need the registrant to present a signature from `agentAddress` (e.g. EIP-191 over
///      a registration message) before accepting the registration.
contract AgentRegistry is IAgentRegistry {
    uint256 private _nextAgentId;
    mapping(address => AgentIdentity) private _agents;
    mapping(address => bool) private _isActive;

    event AgentRegistered(address indexed agentAddress, address indexed owner, string agentType, uint256 timestamp);
    event AgentVerified(address indexed agentAddress, bytes32 indexed verificationHash, uint256 timestamp);

    /// @notice Registers a new AI agent in the system.
    /// @dev Does not verify that the caller controls `agentAddress` (see contract-level natspec).
    /// @param agentAddress The Ethereum address of the agent.
    /// @param agentType The type of agent (e.g., "vps", "robot", "mobile").
    /// @param metadataURI IPFS URI containing the agent's metadata.
    /// @return agentId The unique identifier assigned to the agent.
    function registerAgent(address agentAddress, string calldata agentType, string calldata metadataURI) external override returns (uint256) {
        require(agentAddress != address(0), "Invalid agent address");
        require(!_isActive[agentAddress], "Agent already registered");
        
        uint256 agentId = ++_nextAgentId;
        _agents[agentAddress] = AgentIdentity({
            agentAddress: agentAddress, 
            owner: msg.sender, 
            agentType: agentType,
            metadataURI: metadataURI, 
            isActive: true, 
            registeredAt: block.timestamp
        });
        _isActive[agentAddress] = true;
        
        emit AgentRegistered(agentAddress, msg.sender, agentType, block.timestamp);
        return agentId;
    }

    /// @notice Lets the agent's registrant mark the agent as verified.
    /// @dev Restricted self-attestation, not independent verification: the only check is that
    ///      `msg.sender` is the address that originally called `registerAgent` for
    ///      `agentAddress` (`_agents[agentAddress].owner`). It proves nothing about the agent's
    ///      behavior or about `verificationHash` itself; it only stops an unrelated third party
    ///      from emitting `AgentVerified` events for agents it does not control.
    /// @param agentAddress The address of the agent to verify.
    /// @param verificationHash The hash of the data or action being verified.
    function verifyAgent(address agentAddress, bytes32 verificationHash) external override {
        require(_isActive[agentAddress], "Agent not registered");
        require(msg.sender == _agents[agentAddress].owner, "Not agent owner");
        emit AgentVerified(agentAddress, verificationHash, block.timestamp);
    }

    /// @notice Retrieves the identity details of a specific agent.
    /// @param agentAddress The address of the agent.
    /// @return The AgentIdentity struct containing all registration details.
    function getAgentIdentity(address agentAddress) external view override returns (AgentIdentity memory) {
        return _agents[agentAddress];
    }

    /// @notice Checks if an agent is currently active in the registry.
    /// @param agentAddress The address of the agent.
    /// @return True if the agent is active, false otherwise.
    function isAgentActive(address agentAddress) external view override returns (bool) {
        return _isActive[agentAddress];
    }
}
