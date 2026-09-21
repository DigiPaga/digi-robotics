import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seller = searchParams.get('seller');

  try {
    // In production, this would query the smart contract
    // For demo, return mock data
    const mockListings = [
      {
        id: '1',
        seller: '0x111',
        ipfsURI: 'ipfs://QmTest1',
        price: '1000000000000000000',
        isSold: false,
        createdAt: Date.now(),
      },
      {
        id: '2',
        seller: '0x111',
        ipfsURI: 'ipfs://QmTest2',
        price: '2000000000000000000',
        isSold: false,
        createdAt: Date.now() - 86400000,
      },
    ];

    const filtered = seller
      ? mockListings.filter(l => l.seller.toLowerCase() === seller.toLowerCase())
      : mockListings;

    return NextResponse.json({
      success: true,
      listings: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Listings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
