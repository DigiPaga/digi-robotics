// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IERC3009} from "./interfaces/IERC3009.sol";
import {IX402Facilitator} from "./interfaces/IX402Facilitator.sol";

/// @title X402Facilitator
/// @notice Settles x402 "exact" payments by relaying the payer's EIP-3009 authorization to the
///         token and recording which resource the payment was for.
/// @dev The contract never holds funds: tokens move directly from payer to payee inside the
///      token's transferWithAuthorization. Signature, nonce and validity-window checks are the
///      token's; this contract adds input checks, a balance-delta check on the payee, and the
///      PaymentSettled record.
contract X402Facilitator is IX402Facilitator, ReentrancyGuardTransient {
    /// @inheritdoc IX402Facilitator
    address public immutable token;

    /// @notice The token address is zero.
    error ZeroToken();
    /// @notice The authorization moves zero tokens.
    error ZeroAmount();
    /// @notice The payee is the zero address or the payer itself.
    error InvalidPayee(address payee);
    /// @notice The payee's balance did not grow by exactly the authorized amount.
    error SettlementAmountMismatch(uint256 expected, uint256 received);

    constructor(address token_) {
        if (token_ == address(0)) revert ZeroToken();
        token = token_;
    }

    /// @inheritdoc IX402Facilitator
    function settle(bytes32 resourceId, Authorization calldata auth, bytes calldata signature)
        external
        nonReentrant
    {
        if (auth.value == 0) revert ZeroAmount();
        if (auth.to == address(0) || auth.to == auth.from) revert InvalidPayee(auth.to);

        uint256 balanceBefore = IERC20(token).balanceOf(auth.to);
        IERC3009(token).transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
        );
        uint256 received = IERC20(token).balanceOf(auth.to) - balanceBefore;
        if (received != auth.value) revert SettlementAmountMismatch(auth.value, received);

        emit PaymentSettled(resourceId, auth.from, auth.to, auth.value, auth.nonce, msg.sender);
    }
}
