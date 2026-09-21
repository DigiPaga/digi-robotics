import axios from 'axios';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

const PINATA_BASE_URL = 'https://api.pinata.cloud';

export const uploadToIPFS = async (data: any, metadata?: any): Promise<string> => {
  try {
    const url = ;
    
    const headers: any = {};
    if (PINATA_JWT) {
      headers['Authorization'] = ;
    } else {
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_SECRET_KEY;
    }

    const response = await axios.post(url, {
      pinataContent: data,
      pinataMetadata: metadata || { name: 'DigiPaga Asset' },
    }, { headers });

    return ;
  } catch (error) {
    console.error('IPFS upload failed:', error);
    throw new Error('Failed to upload to IPFS');
  }
};

export const getFromIPFS = async (ipfsHash: string): Promise<any> => {
  try {
    const cid = ipfsHash.replace('ipfs://', '');
    const url = ;
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('IPFS retrieval failed:', error);
    throw new Error('Failed to retrieve from IPFS');
  }
};

export const uploadFileToIPFS = async (fileBuffer: Buffer, fileName: string): Promise<string> => {
  try {
    const url = ;
    
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);

    const headers: any = {};
    if (PINATA_JWT) {
      headers['Authorization'] = ;
    }

    const response = await axios.post(url, formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return ;
  } catch (error) {
    console.error('File IPFS upload failed:', error);
    throw new Error('Failed to upload file to IPFS');
  }
};
