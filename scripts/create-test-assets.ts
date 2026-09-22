import { parseUnits } from 'viem';
import { marketplace } from '../src/contracts';
import { uploadToIPFS } from '../src/utils/ipfs';

const testAssets = [
  {
    name: 'Rescue Operations Manual',
    description: 'Complete guide for rescue robot operations',
    type: 'pdf' as const,
    category: 'manuals',
    price: '0.50',
    content: {
      title: 'Rescue Ops Manual',
      pages: 50,
      topics: ['fire rescue', 'search and rescue', 'disaster response'],
    },
  },
  {
    name: 'Hazmat Handling Dataset',
    description: 'Training data for hazardous material handling',
    type: 'dataset' as const,
    category: 'industrial',
    price: '2.00',
    content: {
      samples: 1000,
      duration: '10 hours',
      format: 'video',
    },
  },
  {
    name: 'Assembly Line Blueprint',
    description: 'CAD files for automated assembly',
    type: 'cad' as const,
    category: 'manufacturing',
    price: '1.50',
    content: {
      parts: 25,
      complexity: 'medium',
    },
  },
];

async function seedAssets() {
  console.log(' Creating test assets...');

  for (const asset of testAssets) {
    try {
      // Upload to IPFS
      const ipfsHash = await uploadToIPFS(asset.content, {
        name: asset.name,
        type: asset.type,
        category: asset.category,
      });

      console.log(`✅ Created: ${asset.name} (${ipfsHash})`);

      // List on marketplace (would require actual wallet connection)
      // await marketplace.listAsset(ipfsHash, asset.price);
    } catch (error) {
      console.error(`❌ Failed to create ${asset.name}:`, error);
    }
  }

  console.log('✅ Asset seeding complete!');
}

seedAssets().catch(console.error);
