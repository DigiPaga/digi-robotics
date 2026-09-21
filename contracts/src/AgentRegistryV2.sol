// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAgentRegistry.sol";
import "./utils/Pausable.sol";

contract AgentRegistryV2 is IAgentRegistry, Pausable {
    uint256 private _nextAgentId;
    mapping(address => AgentIdentity) private _agents;
    mapping(address => bool) private _isActive;
    mapping(address => address) private _agentOwners;

    event AgentRegistered(address indexed agentAddress, address indexed owner, string agentType);
    event MetadataUpdated(address indexed agentAddress, string newMetadataURI);
    event OwnershipTransferred(address indexed agentAddress, address newOwner);

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

    function verifyAgent(address agentAddress, bytes32 verificationHash) external override {
        require(_isActive[agentAddress], "Agent not registered");
        // Verification logic placeholder
    }

    function getAgentIdentity(address agentAddress) external view override returns (AgentIdentity memory) {
        return _agents[agentAddress];
    }

    function isAgentActive(address agentAddress) external view override returns (bool) {
        return _isActive[agentAddress];
    }
}
