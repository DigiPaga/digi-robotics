// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/libraries/SafeTransfer.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {}
    function mint(address to, uint256 amount) public { _mint(to, amount); }
}

contract SafeTransferTest is Test {
    using SafeTransfer for IERC20;
    
    MockToken token;
    address sender = address(0x111);
    address receiver = address(0x222);

    function setUp() public {
        token = new MockToken();
        token.mint(sender, 1000 ether);
    }

    function test_SafeTransfer() public {
        vm.prank(sender);
        bool success = IERC20(address(token)).safeTransfer(receiver, 100 ether);
        
        assertTrue(success);
        assertEq(token.balanceOf(receiver), 100 ether);
        assertEq(token.balanceOf(sender), 900 ether);
    }

    function test_SafeTransferFrom() public {
        vm.prank(sender);
        token.approve(address(this), 200 ether);

        bool success = IERC20(address(token)).safeTransferFrom(sender, receiver, 200 ether);
        
        assertTrue(success);
        assertEq(token.balanceOf(receiver), 200 ether);
    }
}
