// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDG} from "../src/MockUSDG.sol";

contract DeployMockUSDGScript is Script {
    function run() external returns (MockUSDG token) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        token = new MockUSDG();
        vm.stopBroadcast();

        console.log("MockUSDG deployed at:", address(token));
        console.log("Decimals:", token.decimals());
        console.log("Faucet amount:", token.FAUCET_AMOUNT());
    }
}
