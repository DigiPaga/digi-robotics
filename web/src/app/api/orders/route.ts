import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPublicClient,
  decodeEventLog,
  erc20Abi,
  getAddress,
  http,
  isAddressEqual,
  parseUnits,
  verifyMessage,
  type Address,
  type Hash,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { DEPLOYED_MOCK_USDG_ADDRESS, VERIFIED_STORE_WALLET_ADDRESS } from "@/lib/stablecoinConfig";
import { orderHistoryMessage, recordOrderMessage, type StoredOrder } from "@/lib/orders";
import { gearItems } from "@/data/gear";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dataPath = path.join(process.cwd(), "data", "orders.json");
let writeQueue = Promise.resolve();

const itemSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(180),
  price: z.string().regex(/^\d+\.\d{2}$/),
  quantity: z.number().int().min(1).max(99),
});

const createOrderSchema = z.object({
  walletAddress: z.string().startsWith("0x").length(42),
  paymentAddress: z.string().startsWith("0x").length(42),
  items: z.array(itemSchema).min(1).max(30),
  total: z.string().regex(/^\d+\.\d{2}$/),
  txHash: z.string().startsWith("0x").length(66),
  signature: z.string().startsWith("0x"),
  shipping: z.object({
    name: z.string().min(2).max(120),
    address: z.string().min(8).max(500),
    phone: z.string().min(7).max(40),
    notes: z.string().max(500).optional(),
  }),
});

async function readOrders(): Promise<StoredOrder[]> {
  try {
    const parsed = JSON.parse(await readFile(dataPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function appendOrder(order: StoredOrder) {
  const task = writeQueue.then(async () => {
    const orders = await readOrders();
    if (orders.some((existing) => existing.txHash.toLowerCase() === order.txHash.toLowerCase())) {
      throw new Error("An order has already been recorded for this transaction.");
    }
    await mkdir(path.dirname(dataPath), { recursive: true });
    const tempPath = `${dataPath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify([...orders, order], null, 2)}\n`, "utf8");
    await rename(tempPath, dataPath);
  });
  writeQueue = task.catch(() => undefined);
  return task;
}

async function verifyPayment(input: z.infer<typeof createOrderSchema>) {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
  const receipt = await client.getTransactionReceipt({ hash: input.txHash as Hash });
  if (receipt.status !== "success") throw new Error("The payment transaction did not succeed.");
  const token = getAddress(process.env.NEXT_PUBLIC_MOCK_USDG_ADDRESS?.trim() || DEPLOYED_MOCK_USDG_ADDRESS);
  const store = getAddress(process.env.NEXT_PUBLIC_STORE_WALLET_ADDRESS?.trim() || VERIFIED_STORE_WALLET_ADDRESS);
  const payer = getAddress(input.paymentAddress);
  const expectedAmount = parseUnits(input.total, 6);
  const paid = receipt.logs.some((log) => {
    if (!isAddressEqual(log.address, token)) return false;
    try {
      const event = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", data: log.data, topics: log.topics });
      return isAddressEqual(event.args.from, payer) && isAddressEqual(event.args.to, store) && event.args.value === expectedAmount;
    } catch {
      return false;
    }
  });
  if (!paid) throw new Error("The transaction does not contain the expected mUSDG transfer to the store.");
}

export async function GET(request: Request) {
  const wallet = request.headers.get("x-wallet-address");
  const signature = request.headers.get("x-wallet-signature");
  if (!wallet || !signature) return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
  try {
    const address = getAddress(wallet);
    const authenticated = await verifyMessage({ address, message: orderHistoryMessage(address), signature: signature as Hash });
    if (!authenticated) return NextResponse.json({ message: "Wallet signature is invalid." }, { status: 401 });
    const orders = (await readOrders())
      .filter((order) => order.walletAddress.toLowerCase() === address.toLowerCase())
      .map((order) => {
        const { shipping, ...summary } = order;
        void shipping;
        return summary;
      });
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ message: "Unable to authenticate or load orders." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const input = createOrderSchema.parse(await request.json());
    const walletAddress = getAddress(input.walletAddress);
    const signatureValid = await verifyMessage({
      address: walletAddress,
      message: recordOrderMessage(walletAddress, input.txHash),
      signature: input.signature as Hash,
    });
    if (!signatureValid) return NextResponse.json({ message: "Wallet signature is invalid." }, { status: 401 });
    const expectedTotal = input.items.reduce((sum, item) => sum + Math.round(Number(item.price) * 1_000_000) * item.quantity, 0);
    const catalogMatches = input.items.every((item) => {
      const product = gearItems.find((candidate) => candidate.id === item.id);
      return product?.price === item.price && product.name === item.name;
    });
    if (!catalogMatches) return NextResponse.json({ message: "One or more cart items do not match the store catalog." }, { status: 400 });
    if ((expectedTotal / 1_000_000).toFixed(2) !== input.total) {
      return NextResponse.json({ message: "Order total does not match the cart." }, { status: 400 });
    }
    await verifyPayment(input);
    const order: StoredOrder = {
      id: `DR-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`,
      walletAddress,
      paymentAddress: getAddress(input.paymentAddress) as Address,
      items: input.items,
      total: input.total,
      txHash: input.txHash as Hash,
      shipping: input.shipping,
      status: "Payment confirmed · Fulfillment simulated",
      createdAt: new Date().toISOString(),
    };
    await appendOrder(order);
    return NextResponse.json({ order: { ...order, shipping: undefined } }, { status: 201 });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid order data."
      : error instanceof Error ? error.message : "Unable to record this order.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
