import { describe, it, expect } from 'vitest';

describe('Catalog API', () => {
  it('should return catalog with filters', async () => {
    const response = await fetch('http://localhost:3002/api/catalog');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('assets');
    expect(data).toHaveProperty('total');
  });

  it('should filter by type', async () => {
    const response = await fetch('http://localhost:3002/api/catalog?type=pdf');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    if (data.assets && data.assets.length > 0) {
      expect(data.assets.every((a: any) => a.type === 'pdf')).toBe(true);
    }
  });

  it('should search by name', async () => {
    const response = await fetch('http://localhost:3002/api/catalog?search=robot');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    // Search should return relevant results
  });
});
