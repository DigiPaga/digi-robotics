import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await fetch('http://localhost:3002/health');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.message).toContain('DigiPaga x402 Server');
    expect(data.timestamp).toBeDefined();
  });
});
