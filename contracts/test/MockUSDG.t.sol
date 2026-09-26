// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockUSDG} from "../src/MockUSDG.sol";

contract MockUSDGTest is Test {
    MockUSDG internal token;
    address internal user = makeAddr("user");

    function setUp() public {
        token = new MockUSDG();
    }

    function test_FaucetMintsExactlyOneThousandTokensToCaller() public {
        vm.prank(user);
        token.faucet();

        assertEq(token.balanceOf(user), 1_000 * 10 ** 6);
        assertEq(token.totalSupply(), 1_000 * 10 ** 6);
    }

    function test_FaucetNeverMintsToTransactionOriginOrDeployer() public {
        vm.prank(user);
        token.faucet();

        assertEq(token.balanceOf(address(this)), 0);
        assertEq(token.balanceOf(tx.origin), 0);
    }

    function testFuzz_RepeatedFaucetCallsMintFixedIncrements(uint8 calls) public {
        calls = uint8(bound(calls, 1, 100));

        vm.startPrank(user);
        for (uint256 i; i < calls; ++i) {
            token.faucet();
        }
        vm.stopPrank();

        assertEq(token.balanceOf(user), uint256(calls) * token.FAUCET_AMOUNT());
    }
}
