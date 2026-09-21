import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, agentAddress, signature } = body;

      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Forward to x402 server
    const response = await fetch(, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Address': agentAddress,
        'X-Signature': signature,
      },
    });

      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('id');

    return NextResponse.json(
      { error: 'Asset ID required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch();
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}
