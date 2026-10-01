// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDG} from "../src/MockUSDG.sol";
import {X402Facilitator} from "../src/X402Facilitator.sol";
import {DeployX402Script} from "../script/DeployX402.s.sol";

contract DeployX402Test is Test {
    DeployX402Script internal script;
    uint256 internal deployerKey;
    address internal deployer;

    function setUp() public {
        script = new DeployX402Script();
        (deployer, deployerKey) = makeAddrAndKey("deployer");
        vm.setEnv("PRIVATE_KEY", vm.toString(bytes32(deployerKey)));
    }

    function test_DeploysWiredTokenAndFacilitator() public {
        address settler = makeAddr("x402-server");
        vm.setEnv("X402_SETTLER", vm.toString(settler));

        (MockUSDG token, X402Facilitator facilitator) = script.run();

        assertEq(facilitator.token(), address(token));
        assertEq(facilitator.owner(), deployer);
        assertTrue(facilitator.isSettler(deployer));
        assertTrue(facilitator.isSettler(settler));
        assertEq(token.decimals(), 6);
        assertEq(token.version(), "1");
    }

    function test_RevertWhen_UnsupportedChain() public {
        vm.chainId(42_161);
        vm.expectRevert(abi.encodeWithSelector(DeployX402Script.UnsupportedChain.selector, 42_161));
        script.run();
    }
}
