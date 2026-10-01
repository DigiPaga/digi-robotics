// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC3009} from "./tokens/ERC3009.sol";

/// @title MockUSDG
/// @notice Testnet stand-in for Paxos USDG used by the DigiRobotics checkout and x402 agent flow.
/// @dev 6 decimals like USDG. Supports EIP-2612 permit and EIP-3009 transfer/receive/cancel
///      with authorization, so a standard x402 "exact" EVM facilitator can settle it without
///      any custom code. The EIP-712 domain is {name: "Mock USDG (Demo)", version: "1"}; an x402
///      resource server must advertise exactly these in `extra.name` / `extra.version`.
contract MockUSDG is ERC20Permit, ERC3009 {
    string private constant TOKEN_NAME = "Mock USDG (Demo)";
    string private constant TOKEN_SYMBOL = "mUSDG";
    /// @dev Must equal the version OpenZeppelin ERC20Permit passes to EIP712.
    string private constant EIP712_VERSION = "1";

    /// @notice Amount minted per faucet call: 1,000 mUSDG.
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** 6;
    /// @notice Minimum time between two faucet calls from the same address.
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    /// @notice Earliest timestamp at which each address may call the faucet again.
    mapping(address account => uint256) public nextFaucetAt;

    /// @notice The caller used the faucet less than FAUCET_COOLDOWN ago.
    error FaucetCooldownActive(uint256 availableAt);

    constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL) ERC20Permit(TOKEN_NAME) {}

    /// @notice ERC-20 decimals, matching USDG.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice EIP-712 domain version, exposed the way FiatToken does so x402 clients can read it.
    function version() external pure returns (string memory) {
        return EIP712_VERSION;
    }

    /// @notice Mints FAUCET_AMOUNT to the caller, at most once per FAUCET_COOLDOWN.
    /// @dev The cooldown is per address, so it slows down a single wallet rather than preventing
    ///      sybil farming; that is acceptable for a testnet token with no value.
    function faucet() external {
        uint256 availableAt = nextFaucetAt[msg.sender];
        if (block.timestamp < availableAt) revert FaucetCooldownActive(availableAt);
        nextFaucetAt[msg.sender] = block.timestamp + FAUCET_COOLDOWN;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
