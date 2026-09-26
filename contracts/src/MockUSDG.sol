// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Demo-only stablecoin for the DigiRobotics Arbitrum Sepolia checkout.
/// @dev The public faucet is intentionally permissionless and repeatable on testnet.
contract MockUSDG is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** 6;

    constructor() ERC20("Mock USDG (Demo)", "mUSDG") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
