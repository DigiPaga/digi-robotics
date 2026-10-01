// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {MockUSDG} from "../src/MockUSDG.sol";

contract MockUSDGPermitTest is Test {
    bytes32 internal constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    MockUSDG internal token;
    uint256 internal ownerKey;
    address internal owner;
    address internal spender = makeAddr("spender");

    function setUp() public {
        token = new MockUSDG();
        (owner, ownerKey) = makeAddrAndKey("owner");
    }

    function _signPermit(uint256 key, uint256 value, uint256 nonce, uint256 deadline)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonce, deadline));
        (v, r, s) = vm.sign(key, keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)));
    }

    function testFuzz_PermitSetsAllowanceAndBumpsNonce(uint256 value) public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(ownerKey, value, 0, deadline);

        token.permit(owner, spender, value, deadline, v, r, s);

        assertEq(token.allowance(owner, spender), value);
        assertEq(token.nonces(owner), 1);
    }

    function test_RevertWhen_PermitReplayed() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(ownerKey, 100, 0, deadline);
        token.permit(owner, spender, 100, deadline, v, r, s);

        vm.expectRevert();
        token.permit(owner, spender, 100, deadline, v, r, s);
    }

    function test_RevertWhen_PermitExpired() public {
        uint256 deadline = block.timestamp;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(ownerKey, 100, 0, deadline);
        vm.warp(deadline + 1);

        vm.expectRevert(abi.encodeWithSelector(ERC20Permit.ERC2612ExpiredSignature.selector, deadline));
        token.permit(owner, spender, 100, deadline, v, r, s);
    }
}
