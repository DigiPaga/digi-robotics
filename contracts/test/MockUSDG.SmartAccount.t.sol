// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockUSDG} from "../src/MockUSDG.sol";
import {ERC3009} from "../src/tokens/ERC3009.sol";
import {ERC3009Signer} from "./utils/ERC3009Signer.sol";
import {MockERC1271Wallet} from "./utils/MockERC1271Wallet.sol";

/// @notice ERC-1271 wallet that answers isValidSignature with an arbitrary, attacker-chosen value.
contract WrongMagicERC1271Wallet {
    bytes4 public answer;

    function setAnswer(bytes4 answer_) external {
        answer = answer_;
    }

    function isValidSignature(bytes32, bytes memory) external view returns (bytes4) {
        return answer;
    }
}

/// @notice Smart accounts (for example the ZeroDev Kernel used by the web checkout) sign through
///         ERC-1271 instead of ECDSA. The token must accept those signatures on the bytes overloads.
contract MockUSDGSmartAccountTest is ERC3009Signer {
    MockUSDG internal token;
    MockERC1271Wallet internal wallet;
    uint256 internal ownerKey;
    address internal payee = makeAddr("payee");

    function setUp() public {
        vm.warp(1_760_000_000);
        token = new MockUSDG();
        address owner;
        (owner, ownerKey) = makeAddrAndKey("wallet-owner");
        wallet = new MockERC1271Wallet(owner);
        vm.prank(address(wallet));
        token.faucet();
    }

    function _walletAuth(bytes32 nonce) internal view returns (Authorization memory) {
        return Authorization({
            from: address(wallet),
            to: payee,
            value: 1_000_000,
            validAfter: block.timestamp - 1,
            validBefore: block.timestamp + 60,
            nonce: nonce
        });
    }

    function test_TransferWithAuthorization_FromSmartAccount() public {
        Authorization memory auth = _walletAuth(keccak256("sa-1"));
        bytes memory signature =
            _signPacked(ownerKey, _digest(token, token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), auth));

        token.transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
        );

        assertEq(token.balanceOf(payee), auth.value);
        assertTrue(token.authorizationState(address(wallet), auth.nonce));
    }

    function test_RevertWhen_SmartAccountRejectsSigner() public {
        Authorization memory auth = _walletAuth(keccak256("sa-2"));
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        bytes memory signature =
            _signPacked(strangerKey, _digest(token, token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), auth));

        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        token.transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
        );
    }

    function test_RevertWhen_SmartAccountReturnsWrongMagic() public {
        WrongMagicERC1271Wallet liar = new WrongMagicERC1271Wallet();
        vm.prank(address(liar));
        token.faucet();
        Authorization memory auth = _walletAuth(keccak256("sa-wrong-magic"));
        auth.from = address(liar);

        bytes4[3] memory answers = [bytes4(0), bytes4(0xdeadbeef), bytes4(0x1626ba7f)];
        for (uint256 i; i < answers.length; ++i) {
            liar.setAnswer(answers[i]);
            vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
            token.transferWithAuthorization(
                auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, hex"01"
            );
        }
        assertFalse(token.authorizationState(address(liar), auth.nonce));
        assertEq(token.balanceOf(payee), 0);

        // Sanity: the correct magic value is what makes the same call succeed.
        liar.setAnswer(0x1626ba7e);
        token.transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, hex"01"
        );
        assertEq(token.balanceOf(payee), auth.value);
    }

    function test_CancelAuthorization_FromSmartAccount() public {
        bytes32 nonce = keccak256("sa-3");
        (uint8 v, bytes32 r, bytes32 s) = _signCancel(token, ownerKey, address(wallet), nonce);

        token.cancelAuthorization(address(wallet), nonce, abi.encodePacked(r, s, v));
        assertTrue(token.authorizationState(address(wallet), nonce));
    }
}
