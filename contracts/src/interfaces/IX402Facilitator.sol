// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IX402Facilitator
/// @notice On-chain settlement point for x402 "exact" EVM payments made with an EIP-3009 token.
/// @dev The x402 client signs a TransferWithAuthorization for the token. A facilitator operator
///      relays it here instead of straight to the token, so every paid resource access leaves a
///      PaymentSettled record keyed by the resource it paid for.
interface IX402Facilitator {
    /// @notice The EIP-3009 authorization as signed by the payer (field order matches the typehash).
    struct Authorization {
        address from;
        address to;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 nonce;
    }

    /// @notice Emitted once per payment settled through this contract.
    /// @dev Not emitted when the authorization is submitted straight to the token. Use the token's
    ///      AuthorizationUsed and Transfer events as the source of truth for payments.
    /// @param resourceId keccak256 of the x402 resource URL the payment unlocks.
    /// @param payer The authorizer whose tokens moved.
    /// @param payee The x402 `payTo` that received the tokens.
    /// @param amount Atomic token amount transferred.
    /// @param nonce The EIP-3009 nonce consumed on the token.
    /// @param settler The operator that submitted the settlement.
    event PaymentSettled(
        bytes32 indexed resourceId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        bytes32 nonce,
        address settler
    );

    /// @notice Executes the payer's EIP-3009 authorization and records the settlement.
    /// @param resourceId keccak256 of the x402 resource URL.
    /// @param auth The signed authorization terms.
    /// @param signature Packed ECDSA (r, s, v) or ERC-1271 signature over `auth`.
    function settle(bytes32 resourceId, Authorization calldata auth, bytes calldata signature) external;

    /// @notice The EIP-3009 token this facilitator settles.
    function token() external view returns (address);
}
