// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {MockUSDG} from "../src/MockUSDG.sol";
import {X402Facilitator} from "../src/X402Facilitator.sol";
import {IX402Facilitator} from "../src/interfaces/IX402Facilitator.sol";
import {ERC3009} from "../src/tokens/ERC3009.sol";
import {ERC3009Signer} from "./utils/ERC3009Signer.sol";

/// @notice Token whose transferWithAuthorization succeeds without moving funds.
contract SilentERC3009 {
    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }

    function transferWithAuthorization(address, address, uint256, uint256, uint256, bytes32, bytes calldata) external {}
}

/// @notice Token that calls back into the facilitator from inside transferWithAuthorization.
contract ReentrantERC3009 {
    X402Facilitator public facilitator;

    function setFacilitator(X402Facilitator facilitator_) external {
        facilitator = facilitator_;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }

    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        facilitator.settle(
            bytes32(0), IX402Facilitator.Authorization(from, to, value, validAfter, validBefore, nonce), signature
        );
    }
}

contract X402FacilitatorTest is ERC3009Signer {
    event PaymentSettled(
        bytes32 indexed resourceId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        bytes32 nonce,
        address settler
    );

    MockUSDG internal token;
    X402Facilitator internal facilitator;

    uint256 internal agentKey;
    address internal agent;
    address internal treasury = makeAddr("treasury");
    address internal operator = makeAddr("operator");
    address internal owner = makeAddr("owner");

    bytes32 internal constant RESOURCE_ID =
        keccak256("http://localhost:46123/x402/datasets/engine-assembly-pov/content");
    uint256 internal constant PRICE = 50_000;

    function setUp() public {
        vm.warp(1_760_000_000);
        token = new MockUSDG();
        facilitator = new X402Facilitator(address(token), owner);
        vm.prank(owner);
        facilitator.setSettler(operator, true);
        (agent, agentKey) = makeAddrAndKey("agent");
        vm.prank(agent);
        token.faucet();
    }

    function _auth(bytes32 nonce) internal view returns (Authorization memory) {
        return Authorization({
            from: agent,
            to: treasury,
            value: PRICE,
            validAfter: block.timestamp - 600,
            validBefore: block.timestamp + 30,
            nonce: nonce
        });
    }

    function _signed(Authorization memory auth) internal view returns (bytes memory) {
        return _signPacked(agentKey, _digest(token, token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), auth));
    }

    function _asFacilitatorAuth(Authorization memory auth)
        internal
        pure
        returns (IX402Facilitator.Authorization memory)
    {
        return IX402Facilitator.Authorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce
        );
    }

    function _settle(Authorization memory auth, bytes memory signature) internal {
        vm.prank(operator);
        facilitator.settle(RESOURCE_ID, _asFacilitatorAuth(auth), signature);
    }

    function test_Constructor_SetsTokenOwnerAndFirstSettler() public view {
        assertEq(facilitator.token(), address(token));
        assertEq(facilitator.owner(), owner);
        assertTrue(facilitator.isSettler(owner));
        assertTrue(facilitator.isSettler(operator));
    }

    function test_RevertWhen_CallerIsNotSettler() public {
        Authorization memory auth = _auth(keccak256("settle-outsider"));
        bytes memory signature = _signed(auth);
        address outsider = makeAddr("outsider");

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(X402Facilitator.UnauthorizedSettler.selector, outsider));
        facilitator.settle(RESOURCE_ID, _asFacilitatorAuth(auth), signature);
        assertFalse(token.authorizationState(agent, auth.nonce));
    }

    function test_SetSettler_RevokeBlocksSettlement() public {
        vm.expectEmit(true, false, false, true, address(facilitator));
        emit X402Facilitator.SettlerUpdated(operator, false);
        vm.prank(owner);
        facilitator.setSettler(operator, false);

        Authorization memory auth = _auth(keccak256("settle-revoked"));
        bytes memory signature = _signed(auth);
        vm.expectRevert(abi.encodeWithSelector(X402Facilitator.UnauthorizedSettler.selector, operator));
        _settle(auth, signature);
    }

    function test_RevertWhen_NonOwnerSetsSettler() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, operator));
        facilitator.setSettler(operator, true);
    }

    function test_OwnershipTransferIsTwoStep() public {
        address newOwner = makeAddr("new-owner");
        vm.prank(owner);
        facilitator.transferOwnership(newOwner);
        assertEq(facilitator.owner(), owner);

        vm.prank(newOwner);
        facilitator.acceptOwnership();
        assertEq(facilitator.owner(), newOwner);
    }

    function test_RevertWhen_ConstructedWithZeroToken() public {
        vm.expectRevert(X402Facilitator.ZeroToken.selector);
        new X402Facilitator(address(0), owner);
    }

    function test_Settle_TransfersAndEmits() public {
        Authorization memory auth = _auth(keccak256("settle-1"));

        vm.expectEmit(true, true, true, true, address(facilitator));
        emit PaymentSettled(RESOURCE_ID, agent, treasury, PRICE, auth.nonce, operator);
        _settle(auth, _signed(auth));

        assertEq(token.balanceOf(treasury), PRICE);
        assertEq(token.balanceOf(address(facilitator)), 0);
        assertTrue(token.authorizationState(agent, auth.nonce));
    }

    function testFuzz_Settle(uint256 value, bytes32 nonce) public {
        value = bound(value, 1, token.balanceOf(agent));
        Authorization memory auth = _auth(nonce);
        auth.value = value;

        _settle(auth, _signed(auth));
        assertEq(token.balanceOf(treasury), value);
    }

    function test_RevertWhen_SettlementReplayed() public {
        Authorization memory auth = _auth(keccak256("settle-replay"));
        bytes memory signature = _signed(auth);
        _settle(auth, signature);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, agent, auth.nonce));
        _settle(auth, signature);
    }

    function test_RevertWhen_AuthorizationAlreadyUsedDirectlyOnToken() public {
        Authorization memory auth = _auth(keccak256("settle-raced"));
        bytes memory signature = _signed(auth);
        token.transferWithAuthorization(
            auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce, signature
        );

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, agent, auth.nonce));
        _settle(auth, signature);
    }

    function test_RevertWhen_Expired() public {
        Authorization memory auth = _auth(keccak256("settle-expired"));
        bytes memory signature = _signed(auth);
        vm.warp(auth.validBefore);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationExpired.selector, auth.validBefore));
        _settle(auth, signature);
    }

    function test_RevertWhen_NotYetValid() public {
        Authorization memory auth = _auth(keccak256("settle-early"));
        auth.validAfter = block.timestamp + 10;
        auth.validBefore = block.timestamp + 60;

        bytes memory signature = _signed(auth);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationNotYetValid.selector, auth.validAfter));
        _settle(auth, signature);
    }

    function test_RevertWhen_WrongSigner() public {
        Authorization memory auth = _auth(keccak256("settle-forged"));
        (, uint256 attackerKey) = makeAddrAndKey("attacker");
        bytes memory forged =
            _signPacked(attackerKey, _digest(token, token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), auth));

        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        _settle(auth, forged);
    }

    function test_RevertWhen_PayeeRedirected() public {
        Authorization memory auth = _auth(keccak256("settle-redirect"));
        bytes memory signature = _signed(auth);
        auth.to = operator;

        vm.expectRevert(ERC3009.ERC3009InvalidSignature.selector);
        _settle(auth, signature);
    }

    function test_RevertWhen_ZeroAmount() public {
        Authorization memory auth = _auth(keccak256("settle-zero"));
        auth.value = 0;
        bytes memory signature = _signed(auth);

        vm.expectRevert(X402Facilitator.ZeroAmount.selector);
        _settle(auth, signature);
    }

    function test_RevertWhen_PayeeIsZeroOrPayer() public {
        Authorization memory auth = _auth(keccak256("settle-bad-payee"));
        auth.to = address(0);
        bytes memory signature = _signed(auth);
        vm.expectRevert(abi.encodeWithSelector(X402Facilitator.InvalidPayee.selector, address(0)));
        _settle(auth, signature);

        auth.to = agent;
        signature = _signed(auth);
        vm.expectRevert(abi.encodeWithSelector(X402Facilitator.InvalidPayee.selector, agent));
        _settle(auth, signature);
    }

    function test_RevertWhen_TokenDoesNotDeliver() public {
        X402Facilitator silent = new X402Facilitator(address(new SilentERC3009()), owner);
        Authorization memory auth = _auth(keccak256("settle-silent"));

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(X402Facilitator.SettlementAmountMismatch.selector, PRICE, 0));
        silent.settle(RESOURCE_ID, _asFacilitatorAuth(auth), hex"");
    }

    function test_RevertWhen_TokenReentersSettle() public {
        ReentrantERC3009 evil = new ReentrantERC3009();
        X402Facilitator target = new X402Facilitator(address(evil), owner);
        evil.setFacilitator(target);
        vm.prank(owner);
        target.setSettler(address(evil), true);
        Authorization memory auth = _auth(keccak256("settle-reentrant"));

        vm.prank(owner);
        vm.expectRevert(ReentrancyGuardTransient.ReentrancyGuardReentrantCall.selector);
        target.settle(RESOURCE_ID, _asFacilitatorAuth(auth), hex"");
    }
}
