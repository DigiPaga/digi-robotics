import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const MOCK_USDG_ADDRESS = '0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4';
const AGENT_WALLET = '0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1';
const MINT_AMOUNT = ethers.parseUnits('100', 6); // 100 mUSDG

// ABI mínimo para ERC20 con mint
const ERC20_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(MOCK_USDG_ADDRESS, ERC20_ABI, wallet);
  
  console.log('Minting mUSDG to:', AGENT_WALLET);
  console.log('Amount:', ethers.formatUnits(MINT_AMOUNT, 6), 'mUSDG');
  
  const tx = await contract.mint(AGENT_WALLET, MINT_AMOUNT);
  console.log('Tx sent:', tx.hash);
  
  const receipt = await tx.wait();
  console.log('Tx confirmed:', receipt?.hash);
  
  const balance = await contract.balanceOf(AGENT_WALLET);
  console.log('New balance:', ethers.formatUnits(balance, 6), 'mUSDG');
}

main().catch(console.error);
