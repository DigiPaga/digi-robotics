// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {MockUSDG} from "../src/MockUSDG.sol";
import {ERC3009} from "../src/tokens/ERC3009.sol";
import {ERC3009Signer} from "./utils/ERC3009Signer.sol";

contract MockUSDGERC3009Test is ERC3009Signer {
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);
    event Transfer(address indexed from, address indexed to, uint256 value);

    MockUSDG internal token;

    uint256 internal payerKey;
    address internal payer;
    address internal payee = makeAddr("payee");
    address internal relayer = makeAddr("relayer");

    uint256 internal constant PRICE = 50_000; // 0.05 mUSDG

    function setUp() public {
        vm.warp(1_760_000_000);
        token = new MockUSDG();
        (payer, payerKey) = makeAddrAndKey("payer");
        vm.prank(payer);
        token.faucet();
    }

    function _auth(bytes32 nonce) internal view returns (Authorization memory) {
        return Authorization({
            from: payer,
            to: payee,
            value: PRICE,
            validAfter: block.timestamp - 600,
            validBefore: block.timestamp + 300,
            nonce: nonce
        });
    }

    // ---------------------------------------------------------------- domain

    function test_Domain_MatchesX402Extra() public view {
        (, string memory name, string memory domainVersion, uint256 chainId, address verifyingContract,,) =
            token.eip712Domain();
        assertEq(name, "Mock USDG (Demo)");
        assertEq(name, token.name());
        assertEq(domainVersion, "1");
        assertEq(domainVersion, token.version());
        assertEq(chainId, block.chainid);
        assertEq(verifyingContract, address(token));
        assertEq(token.decimals(), 6);
    }

    // --------------------------------------------------------- happy path

    function test_TransferWithAuthorization_MovesFundsAndConsumesNonce() public {
        Authorization memory auth = _auth(keccak256("nonce-1"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);

        vm.expectEmit(true, true, false, false, address(token));
        emit AuthorizationUsed(payer, auth.nonce);
        vm.expectEmit(true, true, false, true, address(token));
        emit Transfer(payer, payee, PRICE);

        vm.prank(relayer);
        _transferAuth(token, auth, v, r, s);

        assertEq(token.balanceOf(payee), PRICE);
        assertEq(token.balanceOf(payer), token.FAUCET_AMOUNT() - PRICE);
        assertEq(token.balanceOf(relayer), 0);
        assertTrue(token.authorizationState(payer, auth.nonce));
    }

    function test_TransferWithAuthorization_PackedSignatureOverload() public {
        Authorization memory auth = _auth(keccak256("nonce-packed"));
        bytes memory signature =
            _signPacked(payerKey, _digest(token, token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), auth));

        token.transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
        );

        assertEq(token.balanceOf(payee), PRICE);
        assertTrue(token.authorizationState(payer, auth.nonce));
    }

    function test_AuthorizationState_FalseForUnusedNonce() public view {
        assertFalse(token.authorizationState(payer, keccak256("never-used")));
    }

    function testFuzz_TransferWithAuthorization(uint256 value, bytes32 nonce, address to) public {
        vm.assume(to != address(0) && to != payer);
        value = bound(value, 0, token.balanceOf(payer));
        Authorization memory auth = _auth(nonce);
        auth.to = to;
        auth.value = value;
        uint256 toBefore = token.balanceOf(to);
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);

        _transferAuth(token, auth, v, r, s);

        assertEq(token.balanceOf(to) - toBefore, value);
        assertTrue(token.authorizationState(payer, nonce));
    }

    // ------------------------------------------------------------- replay

    function test_RevertWhen_NonceReused() public {
        Authorization memory auth = _auth(keccak256("nonce-replay"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);
        _transferAuth(token, auth, v, r, s);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, payer, auth.nonce));
        _transferAuth(token, auth, v, r, s);
        assertEq(token.balanceOf(payee), PRICE);
    }

    function test_RevertWhen_NonceReusedWithDifferentTerms() public {
        Authorization memory first = _auth(keccak256("nonce-shared"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, first);
        _transferAuth(token, first, v, r, s);

        Authorization memory second = _auth(first.nonce);
        second.value = 1;
        (v, r, s) = _signTransfer(token, payerKey, second);
        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, payer, first.nonce));
        _transferAuth(token, second, v, r, s);
    }

    // ------------------------------------------------------ validity window

    function test_RevertWhen_NotYetValid() public {
        Authorization memory auth = _auth(keccak256("nonce-early"));
        auth.validAfter = block.timestamp; // strict: must be < block.timestamp
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationNotYetValid.selector, auth.validAfter));
        _transferAuth(token, auth, v, r, s);

        vm.warp(block.timestamp + 1);
        _transferAuth(token, auth, v, r, s);
        assertEq(token.balanceOf(payee), PRICE);
    }

    function test_RevertWhen_Expired() public {
        Authorization memory auth = _auth(keccak256("nonce-late"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);

        vm.warp(auth.validBefore); // strict: must be > block.timestamp
        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationExpired.selector, auth.validBefore));
        _transferAuth(token, auth, v, r, s);
        assertFalse(token.authorizationState(payer, auth.nonce));
    }

    function testFuzz_RevertWhen_OutsideWindow(uint256 warpTo) public {
        Authorization memory auth = _auth(keccak256("nonce-window"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);
        warpTo = bound(warpTo, 0, 2 * auth.validBefore);
        vm.assume(warpTo <= auth.validAfter || warpTo >= auth.validBefore);
        vm.warp(warpTo);

        vm.expectRevert();
        _transferAuth(token, auth, v, r, s);
    }

    // ------------------------------------------------------------ signer

    function test_RevertWhen_SignedByWrongKey() public {
        Authorization memory auth = _auth(keccak256("nonce-wrong-key"));
        (, uint256 attackerKey) = makeAddrAndKey("attacker");
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, attackerKey, auth);

        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        _transferAuth(token, auth, v, r, s);
    }

    function test_RevertWhen_TermsTamperedAfterSigning() public {
        Authorization memory auth = _auth(keccak256("nonce-tamper"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);

        auth.to = relayer;
        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        _transferAuth(token, auth, v, r, s);

        auth.to = payee;
        auth.value = PRICE + 1;
        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        _transferAuth(token, auth, v, r, s);
    }

    function test_RevertWhen_SignatureForAnotherToken() public {
        MockUSDG other = new MockUSDG();
        Authorization memory auth = _auth(keccak256("nonce-other-domain"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(other, payerKey, auth);

        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        _transferAuth(token, auth, v, r, s);
    }

    function test_RevertWhen_MalformedPackedSignature() public {
        Authorization memory auth = _auth(keccak256("nonce-malformed"));
        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        token.transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, hex"deadbeef"
        );
    }

    // ----------------------------------------------------------- balance

    function test_RevertWhen_InsufficientBalance_NonceNotConsumed() public {
        Authorization memory auth = _auth(keccak256("nonce-broke"));
        auth.value = token.balanceOf(payer) + 1;
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);

        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientBalance.selector, payer, token.balanceOf(payer), auth.value
            )
        );
        _transferAuth(token, auth, v, r, s);
        assertFalse(token.authorizationState(payer, auth.nonce));
    }

    // ------------------------------------------------------------ receive

    function test_ReceiveWithAuthorization_ByPayee() public {
        Authorization memory auth = _auth(keccak256("nonce-receive"));
        (uint8 v, bytes32 r, bytes32 s) = _signReceive(token, payerKey, auth);

        vm.prank(payee);
        token.receiveWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, v, r, s
        );

        assertEq(token.balanceOf(payee), PRICE);
        assertTrue(token.authorizationState(payer, auth.nonce));
    }

    function test_ReceiveWithAuthorization_PackedSignatureOverload() public {
        Authorization memory auth = _auth(keccak256("nonce-receive-packed"));
        bytes memory signature =
            _signPacked(payerKey, _digest(token, token.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(), auth));

        vm.prank(payee);
        token.receiveWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
        );
        assertEq(token.balanceOf(payee), PRICE);
    }

    function test_RevertWhen_ReceiveCalledByNonPayee() public {
        Authorization memory auth = _auth(keccak256("nonce-receive-frontrun"));
        (uint8 v, bytes32 r, bytes32 s) = _signReceive(token, payerKey, auth);

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009CallerMustBePayee.selector, relayer, payee));
        token.receiveWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, v, r, s
        );
    }

    function test_RevertWhen_PackedReceiveCalledByNonPayee() public {
        Authorization memory auth = _auth(keccak256("nonce-receive-frontrun-packed"));
        bytes memory signature =
            _signPacked(payerKey, _digest(token, token.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(), auth));

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009CallerMustBePayee.selector, relayer, payee));
        token.receiveWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
        );
    }

    function test_RevertWhen_TransferSignatureUsedForReceive() public {
        Authorization memory auth = _auth(keccak256("nonce-typehash"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);

        vm.prank(payee);
        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        token.receiveWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, v, r, s
        );
    }

    function test_RevertWhen_ReceiveSignatureUsedForTransfer() public {
        Authorization memory auth = _auth(keccak256("nonce-typehash-2"));
        (uint8 v, bytes32 r, bytes32 s) = _signReceive(token, payerKey, auth);

        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        _transferAuth(token, auth, v, r, s);
    }

    // ------------------------------------------------------------- cancel

    function test_CancelAuthorization_BlocksLaterTransfer() public {
        Authorization memory auth = _auth(keccak256("nonce-cancel"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);
        (uint8 cv, bytes32 cr, bytes32 cs) = _signCancel(token, payerKey, payer, auth.nonce);

        vm.expectEmit(true, true, false, false, address(token));
        emit AuthorizationCanceled(payer, auth.nonce);
        vm.prank(relayer);
        token.cancelAuthorization(payer, auth.nonce, cv, cr, cs);
        assertTrue(token.authorizationState(payer, auth.nonce));

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, payer, auth.nonce));
        _transferAuth(token, auth, v, r, s);
        assertEq(token.balanceOf(payee), 0);
    }

    function test_CancelAuthorization_PackedSignatureOverload() public {
        bytes32 nonce = keccak256("nonce-cancel-packed");
        (uint8 v, bytes32 r, bytes32 s) = _signCancel(token, payerKey, payer, nonce);

        token.cancelAuthorization(payer, nonce, abi.encodePacked(r, s, v));
        assertTrue(token.authorizationState(payer, nonce));
    }

    function test_RevertWhen_CancelSignedByWrongKey() public {
        bytes32 nonce = keccak256("nonce-cancel-wrong");
        (, uint256 attackerKey) = makeAddrAndKey("attacker");
        (uint8 v, bytes32 r, bytes32 s) = _signCancel(token, attackerKey, payer, nonce);

        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        token.cancelAuthorization(payer, nonce, v, r, s);
        assertFalse(token.authorizationState(payer, nonce));
    }

    function test_RevertWhen_CancelAfterUse() public {
        Authorization memory auth = _auth(keccak256("nonce-cancel-late"));
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(token, payerKey, auth);
        _transferAuth(token, auth, v, r, s);

        (uint8 cv, bytes32 cr, bytes32 cs) = _signCancel(token, payerKey, payer, auth.nonce);
        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, payer, auth.nonce));
        token.cancelAuthorization(payer, auth.nonce, cv, cr, cs);
    }

    function test_RevertWhen_CancelTwice() public {
        bytes32 nonce = keccak256("nonce-cancel-twice");
        (uint8 v, bytes32 r, bytes32 s) = _signCancel(token, payerKey, payer, nonce);
        token.cancelAuthorization(payer, nonce, v, r, s);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, payer, nonce));
        token.cancelAuthorization(payer, nonce, v, r, s);
    }
}
