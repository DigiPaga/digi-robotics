// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {MockUSDG} from "../src/MockUSDG.sol";
import {X402Facilitator} from "../src/X402Facilitator.sol";

/// @notice Deploys MockUSDG (EIP-3009) and X402Facilitator on a supported testnet.
/// @dev Environment:
///        PRIVATE_KEY        deployer key (required). Becomes facilitator owner and first settler.
///        X402_SETTLER       optional extra settlement operator (the x402-server facilitator signer).
///
///      Dry run (no transactions sent):
///        forge script script/DeployX402.s.sol --rpc-url arbitrum_sepolia_public
///      Broadcast:
///        forge script script/DeployX402.s.sol --rpc-url robinhood_testnet --broadcast
///
///      On broadcast it writes deployments/x402-<chainId>.json with the addresses.
///
///      Source verification:
///        Arbitrum Sepolia: add --verify (uses ARBISCAN_API_KEY from [etherscan]).
///        Robinhood Chain Testnet (Blockscout):
///          --verify --verifier blockscout --verifier-url https://explorer.testnet.chain.robinhood.com/api/
contract DeployX402Script is Script {
    uint256 internal constant ARBITRUM_SEPOLIA = 421_614;
    uint256 internal constant ROBINHOOD_TESTNET = 46_630;
    uint256 internal constant ANVIL = 31_337;

    error UnsupportedChain(uint256 chainId);

    function run() external returns (MockUSDG token, X402Facilitator facilitator) {
        if (block.chainid != ARBITRUM_SEPOLIA && block.chainid != ROBINHOOD_TESTNET && block.chainid != ANVIL) {
            revert UnsupportedChain(block.chainid);
        }

        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address extraSettler = vm.envOr("X402_SETTLER", address(0));

        vm.startBroadcast(deployerKey);
        token = new MockUSDG();
        facilitator = new X402Facilitator(address(token), deployer);
        if (extraSettler != address(0) && extraSettler != deployer) {
            facilitator.setSettler(extraSettler, true);
        }
        vm.stopBroadcast();

        console.log("chainId:", block.chainid);
        console.log("deployer:", deployer);
        console.log("MockUSDG:", address(token));
        console.log("X402Facilitator:", address(facilitator));
        console.log("EIP-712 name / version:", token.name(), token.version());

        if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast)) {
            _record(token, facilitator, deployer);
        }
    }

    function _record(MockUSDG token, X402Facilitator facilitator, address deployer) internal {
        string memory key = "x402";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "deployer", deployer);
        vm.serializeAddress(key, "MockUSDG", address(token));
        vm.serializeString(key, "eip712Name", token.name());
        vm.serializeString(key, "eip712Version", token.version());
        string memory json = vm.serializeAddress(key, "X402Facilitator", address(facilitator));
        vm.writeJson(json, string.concat("deployments/x402-", vm.toString(block.chainid), ".json"));
    }
}
