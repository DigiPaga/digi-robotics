import { uploadToIPFS } from '../x402-server/src/utils/ipfs';

const sampleAssets = [
  {
    name: 'Rescue Operations Manual',
    type: 'pdf',
    category: 'manuals',
    price: '0.50',
    content: { title: 'Rescue Ops', pages: 50, description: 'Complete guide for rescue robots' },
  },
  {
    name: 'Hazmat Robot Blueprint',
    type: 'cad',
    category: 'blueprints',
    price: '1.20',
    content: { title: 'Hazmat Bot', dimensions: '2x1x1m', description: 'Blueprints for hazmat handling robot' },
  },
  {
    name: 'AI Training Dataset',
    type: 'json',
    category: 'datasets',
    price: '2.00',
    content: { title: 'Training Data', records: 10000, description: 'Labeled dataset for robot vision' },
  },
  {
    name: 'Manufacturing Instructions',
    type: 'pdf',
    category: 'manuals',
    price: '0.75',
    content: { title: 'Manufacturing', steps: 25, description: 'Step-by-step assembly guide' },
  },
  {
    name: 'Sensor Calibration Data',
    type: 'csv',
    category: 'datasets',
    price: '1.50',
    content: { title: 'Calibration', sensors: 12, description: 'Calibration data for LiDAR sensors' },
  },
];

const seedCatalog = async () => {
  console.log('🌱 Seeding catalog with sample assets...');

  for (const asset of sampleAssets) {
    try {
      const ipfsHash = await uploadToIPFS(asset.content, {
        name: asset.name,
        type: asset.type,
      });

      console.log();
    } catch (error) {
      console.error(, error);
    }
  }

  console.log('🎉 Catalog seeding complete!');
};

seedCatalog().catch(console.error);
