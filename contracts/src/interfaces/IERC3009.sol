// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC3009
/// @notice EIP-3009 "Transfer With Authorization": gasless ERC-20 transfers authorized by an
///         off-chain EIP-712 signature and identified by a random 32-byte nonce.
/// @dev Matches the surface of Circle's FiatToken v2.2, which is what x402 "exact" EVM
///      facilitators call. Both the (v, r, s) and the packed `bytes signature` overloads are
///      exposed; the bytes form also accepts ERC-1271 signatures from smart contract wallets.
/// @custom:see https://eips.ethereum.org/EIPS/eip-3009
interface IERC3009 {
    /// @notice Emitted when an authorization is consumed by a transfer.
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    /// @notice Emitted when an authorization is canceled before use.
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    /// @notice Returns true if the nonce was already used or canceled for `authorizer`.
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool);

    /// @notice Executes a transfer authorized by `from`. Callable by anyone (typically a relayer).
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Same as above, with a packed ECDSA or ERC-1271 signature.
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external;

    /// @notice Executes a transfer authorized by `from`. Only callable by the payee `to`,
    ///         which prevents front-running of a deposit into a contract.
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Same as above, with a packed ECDSA or ERC-1271 signature.
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external;

    /// @notice Cancels an unused authorization, signed by its authorizer.
    function cancelAuthorization(address authorizer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external;

    /// @notice Same as above, with a packed ECDSA or ERC-1271 signature.
    function cancelAuthorization(address authorizer, bytes32 nonce, bytes calldata signature) external;
}
