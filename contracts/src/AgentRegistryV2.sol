// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAgentRegistry.sol";
import "./utils/Pausable.sol";

/// @title AgentRegistryV2
/// @notice Adds pausing and per-agent ownership transfer on top of the AgentRegistry agent
///         identity bookkeeping.
/// @dev Like AgentRegistry, this does NOT implement the ERC-8004 standard: there is no validator
///      or reputation registry, no trust model, and no feedback mechanism. `verifyAgent` (below)
///      is a restricted admin attestation, not independent third-party verification.
///
///      Known limitation (not fixed here, see `registerAgent`): nothing proves the caller
///      controls `agentAddress`, so any address can be registered by any caller
///      ("address squatting"). Acceptable for a demo registry; a production identity system
///      would need the registrant to present a signature from `agentAddress` (e.g. EIP-191 over
///      a registration message) before accepting the registration.
contract AgentRegistryV2 is IAgentRegistry, Pausable {
    uint256 private _nextAgentId;
    mapping(address => AgentIdentity) private _agents;
    mapping(address => bool) private _isActive;
    mapping(address => address) private _agentOwners;

    event AgentRegistered(address indexed agentAddress, address indexed owner, string agentType);
    event MetadataUpdated(address indexed agentAddress, string newMetadataURI);
    event OwnershipTransferred(address indexed agentAddress, address newOwner);
    /// @notice Emitted when the registry owner attests to an agent (see `verifyAgent`).
    event AgentVerified(address indexed agentAddress, bytes32 indexed verificationHash, uint256 timestamp);

    /// @dev Does not verify that the caller controls `agentAddress` (see contract-level natspec).
    function registerAgent(address agentAddress, string calldata agentType, string calldata metadataURI)
        external
        override
        whenNotPaused
        returns (uint256)
    {
        require(agentAddress != address(0), "Invalid agent address");

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
        _agentOwners[agentAddress] = msg.sender;

        emit AgentRegistered(agentAddress, msg.sender, agentType);
        return agentId;
    }

    function updateMetadata(string calldata newMetadataURI) external whenNotPaused {
        require(_isActive[msg.sender], "Agent not registered");
        _agents[msg.sender].metadataURI = newMetadataURI;
        emit MetadataUpdated(msg.sender, newMetadataURI);
    }

    function transferOwnership(address agentAddress, address newOwner) external {
        require(_agentOwners[agentAddress] == msg.sender, "Not owner");
        _agents[agentAddress].owner = newOwner;
        _agentOwners[agentAddress] = newOwner;
        emit OwnershipTransferred(agentAddress, newOwner);
    }

    /// @notice Lets the registry owner mark a registered agent as verified.
    /// @dev Restricted admin attestation, not independent verification: the only check is that
    ///      `msg.sender` is `owner` (the Pausable admin set at deployment). It proves nothing
    ///      about the agent's behavior or about `verificationHash` itself beyond recording that
    ///      the owner attested to it; it only stops an arbitrary third party from emitting
    ///      `AgentVerified` events for agents it has no authority over.
    function verifyAgent(address agentAddress, bytes32 verificationHash) external override {
        require(msg.sender == owner, "Not registry owner");
        require(_isActive[agentAddress], "Agent not registered");
        emit AgentVerified(agentAddress, verificationHash, block.timestamp);
    }

    function getAgentIdentity(address agentAddress) external view override returns (AgentIdentity memory) {
        return _agents[agentAddress];
    }

    function isAgentActive(address agentAddress) external view override returns (bool) {
        return _isActive[agentAddress];
    }
}
