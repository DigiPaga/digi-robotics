// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockUSDG} from "../../src/MockUSDG.sol";
import {X402Facilitator} from "../../src/X402Facilitator.sol";
import {IX402Facilitator} from "../../src/interfaces/IX402Facilitator.sol";
import {IERC3009} from "../../src/interfaces/IERC3009.sol";
import {ERC3009} from "../../src/tokens/ERC3009.sol";
import {ERC3009Signer} from "../utils/ERC3009Signer.sol";

/// @notice Loads deployments/x402-<chainId>.json for the forked chain and binds the live contracts.
/// @dev Run with `forge test --fork-url <rpc> --match-contract ForkTest`. Without a fork, or on a
///      chain with no deployment record, every test is skipped so plain `forge test` stays offline.
abstract contract X402ForkBase is ERC3009Signer {
    MockUSDG internal token;
    X402Facilitator internal facilitator;

    address internal deployer;
    address internal owner;
    address internal settler;
    bool internal deployerIsSettler;
    string internal eip712Name;
    string internal eip712Version;

    function setUp() public virtual {
        string memory path = string.concat(vm.projectRoot(), "/deployments/x402-", vm.toString(block.chainid), ".json");
        if (!_isForked() || !vm.isFile(path)) {
            vm.skip(true, "needs --fork-url on a chain with deployments/x402-<chainId>.json");
            return;
        }

        string memory json = vm.readFile(path);
        assertEq(vm.parseJsonUint(json, ".chainId"), block.chainid, "record chainId");
        token = MockUSDG(vm.parseJsonAddress(json, ".MockUSDG"));
        facilitator = X402Facilitator(vm.parseJsonAddress(json, ".X402Facilitator"));
        deployer = vm.parseJsonAddress(json, ".deployer");
        owner = vm.parseJsonAddress(json, ".owner");
        settler = vm.parseJsonAddress(json, ".settler");
        deployerIsSettler = vm.parseJsonBool(json, ".deployerIsSettler");
        eip712Name = vm.parseJsonString(json, ".eip712Name");
        eip712Version = vm.parseJsonString(json, ".eip712Version");
    }

    function _isForked() internal view returns (bool) {
        try vm.activeFork() returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }
}

/// @notice Read-only checks that the deployed bytecode, metadata and roles match the record and source.
contract X402DeploymentForkTest is X402ForkBase {
    function test_CodeExistsAtRecordedAddresses() public view {
        assertGt(address(token).code.length, 0, "MockUSDG has no code");
        assertGt(address(facilitator).code.length, 0, "X402Facilitator has no code");
    }

    function test_TokenMetadataMatchesSource() public {
        // A fresh local instance is the source of truth for the constants compiled into MockUSDG.
        MockUSDG source = new MockUSDG();

        assertEq(token.name(), source.name(), "name");
        assertEq(token.symbol(), source.symbol(), "symbol");
        assertEq(token.decimals(), source.decimals(), "decimals");
        assertEq(token.version(), source.version(), "version");
        assertEq(token.FAUCET_AMOUNT(), source.FAUCET_AMOUNT(), "faucet amount");
        assertEq(
            token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(),
            source.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(),
            "transfer typehash"
        );

        assertEq(token.name(), eip712Name, "record eip712Name");
        assertEq(token.version(), eip712Version, "record eip712Version");
    }

    function test_Eip712DomainMatchesSource() public view {
        (, string memory name, string memory version, uint256 chainId, address verifyingContract,,) =
            token.eip712Domain();

        assertEq(name, eip712Name, "domain name");
        assertEq(version, eip712Version, "domain version");
        assertEq(chainId, block.chainid, "domain chainId");
        assertEq(verifyingContract, address(token), "domain verifyingContract");

        bytes32 expected = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(eip712Name)),
                keccak256(bytes(eip712Version)),
                block.chainid,
                address(token)
            )
        );
        assertEq(token.DOMAIN_SEPARATOR(), expected, "DOMAIN_SEPARATOR");
    }

    function test_FacilitatorSettlesRecordedToken() public view {
        assertEq(facilitator.token(), address(token));
    }

    function test_RolesMatchRecord() public view {
        assertEq(facilitator.owner(), owner, "owner");
        assertEq(facilitator.pendingOwner(), address(0), "pending owner");
        assertTrue(facilitator.isSettler(settler), "recorded settler not approved");
        assertTrue(settler != deployer, "settler must be a separate hot key");
        assertEq(facilitator.isSettler(deployer), deployerIsSettler, "deployer settler status differs from record");
    }
}

/// @notice End-to-end x402 settlement against the live contracts, executed only in the fork.
contract X402SettlementForkTest is X402ForkBase {
    event PaymentSettled(
        bytes32 indexed resourceId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        bytes32 nonce,
        address settler
    );

    bytes32 internal constant RESOURCE_ID = keccak256("https://fork-test.invalid/x402/resource");
    uint256 internal constant PRICE = 50_000;

    uint256 internal payerKey;
    address internal payer;
    address internal payee;

    function setUp() public override {
        super.setUp();
        if (address(token) == address(0)) return;

        // Labels include the fork block so a payer reused on chain cannot hit the faucet cooldown.
        string memory suffix = vm.toString(block.number);
        (payer, payerKey) = makeAddrAndKey(string.concat("fork-payer-", suffix));
        payee = makeAddr(string.concat("fork-payee-", suffix));

        vm.prank(payer);
        token.faucet();
        assertEq(token.balanceOf(payer), token.FAUCET_AMOUNT(), "faucet");
    }

    function test_SettlerSettlesSignedAuthorization() public {
        Authorization memory auth = _auth(block.timestamp - 1, block.timestamp + 1 hours, "settle");
        bytes memory signature = _signAuth(auth);

        uint256 payerBefore = token.balanceOf(payer);
        uint256 payeeBefore = token.balanceOf(payee);

        vm.expectEmit(true, true, false, false, address(token));
        emit IERC3009.AuthorizationUsed(payer, auth.nonce);
        vm.expectEmit(true, true, false, true, address(token));
        emit IERC20.Transfer(payer, payee, PRICE);
        vm.expectEmit(true, true, true, true, address(facilitator));
        emit PaymentSettled(RESOURCE_ID, payer, payee, PRICE, auth.nonce, settler);

        vm.prank(settler);
        facilitator.settle(RESOURCE_ID, _toFacilitator(auth), signature);

        assertEq(token.balanceOf(payer), payerBefore - PRICE, "payer balance");
        assertEq(token.balanceOf(payee), payeeBefore + PRICE, "payee balance");
        assertEq(token.balanceOf(address(facilitator)), 0, "facilitator holds funds");
        assertTrue(token.authorizationState(payer, auth.nonce), "nonce not consumed");

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationAlreadyUsed.selector, payer, auth.nonce));
        vm.prank(settler);
        facilitator.settle(RESOURCE_ID, _toFacilitator(auth), signature);
    }

    function test_RevertWhen_CallerIsNotSettler() public {
        address outsider = makeAddr("fork-outsider");
        assertFalse(facilitator.isSettler(outsider));

        Authorization memory auth = _auth(block.timestamp - 1, block.timestamp + 1 hours, "outsider");
        bytes memory signature = _signAuth(auth);

        vm.expectRevert(abi.encodeWithSelector(X402Facilitator.UnauthorizedSettler.selector, outsider));
        vm.prank(outsider);
        facilitator.settle(RESOURCE_ID, _toFacilitator(auth), signature);
    }

    function test_RevertWhen_AuthorizationExpired() public {
        Authorization memory auth = _auth(block.timestamp - 1 hours, block.timestamp, "expired");
        bytes memory signature = _signAuth(auth);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationExpired.selector, auth.validBefore));
        vm.prank(settler);
        facilitator.settle(RESOURCE_ID, _toFacilitator(auth), signature);
    }

    function test_RevertWhen_AuthorizationNotYetValid() public {
        Authorization memory auth = _auth(block.timestamp, block.timestamp + 1 hours, "early");
        bytes memory signature = _signAuth(auth);

        vm.expectRevert(abi.encodeWithSelector(ERC3009.ERC3009AuthorizationNotYetValid.selector, auth.validAfter));
        vm.prank(settler);
        facilitator.settle(RESOURCE_ID, _toFacilitator(auth), signature);
    }

    function _auth(uint256 validAfter, uint256 validBefore, string memory tag)
        internal
        view
        returns (Authorization memory)
    {
        return Authorization({
            from: payer,
            to: payee,
            value: PRICE,
            validAfter: validAfter,
            validBefore: validBefore,
            nonce: keccak256(abi.encode(tag, payer, block.number))
        });
    }

    function _signAuth(Authorization memory auth) internal view returns (bytes memory) {
        return _signPacked(payerKey, _digest(token, token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), auth));
    }

    function _toFacilitator(Authorization memory auth) internal pure returns (IX402Facilitator.Authorization memory) {
        return
            IX402Facilitator.Authorization(
                auth.from, auth.to, auth.value, auth.validAfter, auth.validBefore, auth.nonce
            );
    }
}
