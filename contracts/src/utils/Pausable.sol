// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Pausable {
    bool private _paused;
    address public owner;

    event Paused(address account);
    event Unpaused(address account);

    modifier whenNotPaused() {
        _;
    }

    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function pause() external {
        require(msg.sender == owner, "Pausable: caller is not owner");
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external {
        require(msg.sender == owner, "Pausable: caller is not owner");
        _paused = false;
        emit Unpaused(msg.sender);
    }

    function paused() public view returns (bool) {
        return _paused;
    }
}
