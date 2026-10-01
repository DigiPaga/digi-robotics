// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/X402Facilitator.sol";
import "../src/interfaces/IX402Facilitator.sol";

// This test contract only needs the PaymentSettled event declaration in scope for
// vm.expectEmit, not the interface's function requirement, so it does not inherit
// IX402Facilitator (inheriting it without implementing settlePayment is a compile
// error: the contract would have to be declared abstract).
contract X402FacilitatorTest is Test {
    X402Facilitator facilitator;
    address mockToken = address(0x1);
    address buyer = address(0x2);
    address agent = address(0x3);

    event PaymentSettled(uint256 indexed assetId, address indexed buyer, address indexed agent, uint256 amount);

    function setUp() public {
        facilitator = new X402Facilitator(mockToken);
    }

    function test_SettlePayment_EmitsPaymentSettled() public {
        vm.expectEmit(true, true, true, true);
        emit PaymentSettled(1, buyer, agent, 100);

        facilitator.settlePayment(1, buyer, agent, 100, "0x");
    }

    function test_SettlePayment_EmitsPaymentSettled_WithSignature() public {
        // settlePayment currently accepts any signature bytes without verifying them
        // (no on-chain auth check yet) - this test documents that actual behavior,
        // it is not asserting the signature is cryptographically checked.
        vm.expectEmit(true, true, true, true);
        emit PaymentSettled(2, buyer, agent, 50 ether);

        facilitator.settlePayment(2, buyer, agent, 50 ether, "mock-signature-bytes");
    }

    function testFuzz_SettlePayment_EmitsPaymentSettled(uint256 assetId, uint256 amount) public {
        vm.expectEmit(true, true, true, true);
        emit PaymentSettled(assetId, buyer, agent, amount);

        facilitator.settlePayment(assetId, buyer, agent, amount, "0x");
    }

    function test_Constructor_SetsToken() public view {
        assertEq(address(facilitator.token()), mockToken);
    }
}
