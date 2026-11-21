import axios from 'axios';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

const PINATA_BASE_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

export const uploadToIPFS = async (data: any, metadata?: any): Promise<string> => {
  try {
    const url = `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`;

    const headers: any = {};
    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
    } else {
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_SECRET_KEY;
    }

    const response = await axios.post(url, {
      pinataContent: data,
      pinataMetadata: metadata || { name: 'DigiPaga Asset' },
    }, { headers });

    return response.data.IpfsHash;
  } catch (error) {
    console.error('IPFS upload failed:', error);
    throw new Error('Failed to upload to IPFS');
  }
};

export const getFromIPFS = async (ipfsHash: string): Promise<any> => {
  try {
    const cid = ipfsHash.replace('ipfs://', '');
    const url = `${PINATA_GATEWAY}/ipfs/${cid}`;

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('IPFS retrieval failed:', error);
    throw new Error('Failed to retrieve from IPFS');
  }
};

export const uploadFileToIPFS = async (fileBuffer: Buffer, fileName: string): Promise<string> => {
  try {
    const url = `${PINATA_BASE_URL}/pinning/pinFileToIPFS`;

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(fileBuffer)]), fileName);

    const headers: any = {};
    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
    }

    const response = await axios.post(url, formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.IpfsHash;
  } catch (error) {
    console.error('File IPFS upload failed:', error);
    throw new Error('Failed to upload file to IPFS');
  }
};
