// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDG} from "../../src/MockUSDG.sol";

/// @notice Shared EIP-712 signing helpers for EIP-3009 authorizations in tests.
abstract contract ERC3009Signer is Test {
    struct Authorization {
        address from;
        address to;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 nonce;
    }

    function _digest(MockUSDG token, bytes32 typehash, Authorization memory auth) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(typehash, auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce)
        );
        return keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
    }

    function _sign(uint256 privateKey, bytes32 digest) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        (v, r, s) = vm.sign(privateKey, digest);
    }

    function _signPacked(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _signTransfer(MockUSDG token, uint256 privateKey, Authorization memory auth)
        internal
        view
        returns (uint8, bytes32, bytes32)
    {
        return _sign(privateKey, _digest(token, token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), auth));
    }

    function _signReceive(MockUSDG token, uint256 privateKey, Authorization memory auth)
        internal
        view
        returns (uint8, bytes32, bytes32)
    {
        return _sign(privateKey, _digest(token, token.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(), auth));
    }

    function _signCancel(MockUSDG token, uint256 privateKey, address authorizer, bytes32 nonce)
        internal
        view
        returns (uint8, bytes32, bytes32)
    {
        bytes32 structHash = keccak256(abi.encode(token.CANCEL_AUTHORIZATION_TYPEHASH(), authorizer, nonce));
        return _sign(privateKey, keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)));
    }

    function _transferAuth(MockUSDG token, Authorization memory auth, uint8 v, bytes32 r, bytes32 s) internal {
        token.transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, v, r, s
        );
    }
}
