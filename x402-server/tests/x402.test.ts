import { describe, it, expect } from 'vitest';

describe('x402 Payment Flow', () => {
  it('should return 402 for protected assets without payment', async () => {
    const response = await fetch('http://localhost:3002/api/assets/1');
    
    expect(response.status).toBe(402);
    const data = await response.json();
    expect(data.error).toBe('Payment Required');
    expect(data.paymentDetails).toBeDefined();
  });

  it('should include payment details in 402 response', async () => {
    const response = await fetch('http://localhost:3002/api/assets/1');
    const data = await response.json();
    
    expect(data.paymentDetails).toMatchObject({
      price: expect.any(String),
      currency: expect.any(String),
      network: expect.any(String),
      recipient: expect.any(String),
      requiredHeaders: expect.any(Array),
    });
  });
});
