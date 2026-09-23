// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice Manages the registration and verification of AI agents following ERC-8004 standards.
/// @dev Implements access control and emits events for all state changes.
contract AgentRegistry is IAgentRegistry {
    uint256 private _nextAgentId;
    mapping(address => AgentIdentity) private _agents;
    mapping(address => bool) private _isActive;

    event AgentRegistered(address indexed agentAddress, address indexed owner, string agentType, uint256 timestamp);
    event AgentVerified(address indexed agentAddress, bytes32 indexed verificationHash, uint256 timestamp);

    /// @notice Registers a new AI agent in the system.
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

    /// @notice Verifies an agent's action or data.
    /// @param agentAddress The address of the agent to verify.
    /// @param verificationHash The hash of the data or action being verified.
    function verifyAgent(address agentAddress, bytes32 verificationHash) external override {
        require(_isActive[agentAddress], "Agent not registered");
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
