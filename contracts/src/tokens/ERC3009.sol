// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {IERC3009} from "../interfaces/IERC3009.sol";

/// @title ERC3009
/// @notice Abstract EIP-3009 extension for an OpenZeppelin ERC20 that also inherits EIP712.
/// @dev Signatures are checked with OpenZeppelin's SignatureChecker, so an EOA signs with ECDSA
///      (malleable high-s values are rejected by OZ ECDSA) and a deployed smart account signs
///      through ERC-1271. Validity windows follow FiatToken v2.2 exactly:
///      `validAfter < block.timestamp < validBefore`.
abstract contract ERC3009 is ERC20, EIP712, IERC3009 {
    /// @dev keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267;

    /// @dev keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8;

    /// @dev keccak256("CancelAuthorization(address authorizer,bytes32 nonce)")
    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
        0x158b0a9edf7a828aad02f63cd515c68ef2f50ba807396f6d12842833a1597429;

    /// @dev authorizer => nonce => used or canceled
    mapping(address authorizer => mapping(bytes32 nonce => bool)) private _authorizationStates;

    /// @notice The authorization cannot be used before `validAfter`.
    error ERC3009AuthorizationNotYetValid(uint256 validAfter);
    /// @notice The authorization expired at `validBefore`.
    error ERC3009AuthorizationExpired(uint256 validBefore);
    /// @notice The nonce was already used or canceled for this authorizer.
    error ERC3009AuthorizationAlreadyUsed(address authorizer, bytes32 nonce);
    /// @notice The signature does not belong to the authorizer.
    error ERC3009InvalidSignature();
    /// @notice receiveWithAuthorization was called by someone other than the payee.
    error ERC3009CallerMustBePayee(address caller, address payee);

    /// @inheritdoc IERC3009
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    /// @inheritdoc IERC3009
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
    ) external {
        _transferWithAuthorization(
            TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            abi.encodePacked(r, s, v)
        );
    }

    /// @inheritdoc IERC3009
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        _transferWithAuthorization(
            TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce, signature
        );
    }

    /// @inheritdoc IERC3009
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
    ) external {
        if (msg.sender != to) revert ERC3009CallerMustBePayee(msg.sender, to);
        _transferWithAuthorization(
            RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            abi.encodePacked(r, s, v)
        );
    }

    /// @inheritdoc IERC3009
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        if (msg.sender != to) revert ERC3009CallerMustBePayee(msg.sender, to);
        _transferWithAuthorization(
            RECEIVE_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce, signature
        );
    }

    /// @inheritdoc IERC3009
    function cancelAuthorization(address authorizer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external {
        _cancelAuthorization(authorizer, nonce, abi.encodePacked(r, s, v));
    }

    /// @inheritdoc IERC3009
    function cancelAuthorization(address authorizer, bytes32 nonce, bytes calldata signature) external {
        _cancelAuthorization(authorizer, nonce, signature);
    }

    /// @dev Checks the window, the nonce and the signature, marks the nonce used, then moves funds.
    ///      State is written before `_transfer`, so a re-entrant call with the same nonce reverts.
    function _transferWithAuthorization(
        bytes32 typehash,
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) internal {
        if (block.timestamp <= validAfter) revert ERC3009AuthorizationNotYetValid(validAfter);
        if (block.timestamp >= validBefore) revert ERC3009AuthorizationExpired(validBefore);
        _requireUnusedAuthorization(from, nonce);

        bytes32 structHash = keccak256(abi.encode(typehash, from, to, value, validAfter, validBefore, nonce));
        _requireValidSignature(from, structHash, signature);

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    function _cancelAuthorization(address authorizer, bytes32 nonce, bytes memory signature) internal {
        _requireUnusedAuthorization(authorizer, nonce);
        _requireValidSignature(
            authorizer, keccak256(abi.encode(CANCEL_AUTHORIZATION_TYPEHASH, authorizer, nonce)), signature
        );

        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    function _requireUnusedAuthorization(address authorizer, bytes32 nonce) private view {
        if (_authorizationStates[authorizer][nonce]) revert ERC3009AuthorizationAlreadyUsed(authorizer, nonce);
    }

    function _requireValidSignature(address signer, bytes32 structHash, bytes memory signature) private view {
        if (!SignatureChecker.isValidSignatureNow(signer, _hashTypedDataV4(structHash), signature)) {
            revert ERC3009InvalidSignature();
        }
    }
}
