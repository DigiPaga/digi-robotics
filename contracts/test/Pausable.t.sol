// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/utils/Pausable.sol";

contract MockPausable is Pausable {
    uint256 public value;
    function doSomething() external whenNotPaused {
        value = 1;
    }
}

contract PausableTest is Test {
    MockPausable pausable;
    address owner = address(0x123);
    address user = address(0x456);

    function setUp() public {
        vm.prank(owner);
        pausable = new MockPausable();
    }

    function test_InitialState() public view {
        assertFalse(pausable.paused());
        assertEq(pausable.owner(), owner);
    }

    function test_PauseAndUnpause() public {
        vm.prank(owner);
        pausable.pause();
        assertTrue(pausable.paused());

        vm.prank(owner);
        pausable.unpause();
        assertFalse(pausable.paused());
    }

    function test_RevertWhenPaused() public {
        vm.prank(owner);
        pausable.pause();

        vm.prank(user);
        vm.expectRevert("Pausable: paused");
        pausable.doSomething();
    }

    function test_RevertIfNotOwner() public {
        vm.prank(user);
        vm.expectRevert("Pausable: caller is not owner");
        pausable.pause();
    }
}
