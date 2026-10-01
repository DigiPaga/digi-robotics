// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
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
///
///      Only operators approved by the owner may settle. Anyone who sees an x402 payment header
///      could otherwise submit it first with a different resource id and falsify the record. The
///      restriction cannot strand funds: the payer's authorization is still valid on the token
///      itself until it expires.
contract X402Facilitator is IX402Facilitator, Ownable2Step, ReentrancyGuardTransient {
    /// @inheritdoc IX402Facilitator
    address public immutable token;

    /// @notice Operators allowed to call settle.
    mapping(address operator => bool) public isSettler;

    /// @notice Emitted when the owner grants or revokes settlement rights.
    event SettlerUpdated(address indexed operator, bool allowed);

    /// @notice The caller is not an approved settlement operator.
    error UnauthorizedSettler(address caller);
    /// @notice The token address is zero.
    error ZeroToken();
    /// @notice The authorization moves zero tokens.
    error ZeroAmount();
    /// @notice The payee is the zero address or the payer itself.
    error InvalidPayee(address payee);
    /// @notice The payee's balance did not grow by exactly the authorized amount.
    error SettlementAmountMismatch(uint256 expected, uint256 received);

    /// @param token_ The EIP-3009 token to settle.
    /// @param initialOwner Account that manages settlers; also approved as the first settler.
    constructor(address token_, address initialOwner) Ownable(initialOwner) {
        if (token_ == address(0)) revert ZeroToken();
        token = token_;
        _setSettler(initialOwner, true);
    }

    /// @notice Grants or revokes settlement rights for `operator`.
    function setSettler(address operator, bool allowed) external onlyOwner {
        _setSettler(operator, allowed);
    }

    /// @inheritdoc IX402Facilitator
    function settle(bytes32 resourceId, Authorization calldata auth, bytes calldata signature) external nonReentrant {
        if (!isSettler[msg.sender]) revert UnauthorizedSettler(msg.sender);
        if (auth.value == 0) revert ZeroAmount();
        if (auth.to == address(0) || auth.to == auth.from) revert InvalidPayee(auth.to);

        uint256 balanceBefore = IERC20(token).balanceOf(auth.to);
        IERC3009(token)
            .transferWithAuthorization(
                auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
            );
        uint256 received = IERC20(token).balanceOf(auth.to) - balanceBefore;
        if (received != auth.value) revert SettlementAmountMismatch(auth.value, received);

        emit PaymentSettled(resourceId, auth.from, auth.to, auth.value, auth.nonce, msg.sender);
    }

    function _setSettler(address operator, bool allowed) private {
        isSettler[operator] = allowed;
        emit SettlerUpdated(operator, allowed);
    }
}
