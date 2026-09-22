import { uploadToIPFS } from '../x402-server/src/utils/ipfs';

const testAssets = [
  { name: 'Rescue Ops Manual', type: 'pdf', category: 'manuals', price: '0.50' },
  { name: 'Hazmat Dataset', type: 'dataset', category: 'industrial', price: '2.00' },
];

async function seed() {
  console.log('Seeding test assets...');
  for (const asset of testAssets) {
    console.log(`Mock IPFS upload for: ${asset.name}`);
  }
  console.log('Done!');
}
seed();
