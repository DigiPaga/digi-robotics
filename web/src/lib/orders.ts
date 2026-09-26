import type { Address, Hash } from "viem";

export type OrderItem = { id: string; name: string; price: string; quantity: number };
export type ShippingDetails = { name: string; address: string; phone: string; notes?: string };

export type StoredOrder = {
  id: string;
  walletAddress: Address;
  paymentAddress: Address;
  items: OrderItem[];
  total: string;
  txHash: Hash;
  shipping: ShippingDetails;
  status: "Payment confirmed · Fulfillment simulated";
  createdAt: string;
};

export type OrderSummary = Omit<StoredOrder, "shipping">;

export const orderHistoryMessage = (wallet: string) =>
  `DigiRobotics order history\nWallet: ${wallet.toLowerCase()}\nChain ID: 421614`;

export const recordOrderMessage = (wallet: string, txHash: string) =>
  `DigiRobotics record order\nWallet: ${wallet.toLowerCase()}\nTransaction: ${txHash.toLowerCase()}\nChain ID: 421614`;
