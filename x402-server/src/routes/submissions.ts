import { Router, Request, Response } from 'express';
import { DataSubmission } from '../types/data-flows';
import { storageService } from '../services/storage';
import DEMO_DATASETS from '../../scripts/seed-demo-datasets';
import logger from '../utils/logger';

const router = Router();
// Iniciar con los datasets de demo
const mockSubmissions: DataSubmission[] = [...DEMO_DATASETS];

// Obtener datasets con filtrado
router.get('/', (req: Request, res: Response) => {
  const { category, tag, minScore, status } = req.query;
  
  let filtered = mockSubmissions;

  if (category) filtered = filtered.filter(d => d.category === category);
  if (tag) filtered = filtered.filter(d => d.tags.includes(tag as string));
  if (minScore) filtered = filtered.filter(d => d.qualityScore >= Number(minScore));
  if (status) filtered = filtered.filter(d => d.status === status);

  // No devolver la clave de encriptación en la lista pública
  const publicData = filtered.map(({ encryptionKeyHash, ...rest }) => rest);
  
  res.json({ success: true, count: publicData.length, data: publicData });
});

// Simular subida de nuevo dataset por usuario retail
router.post('/', async (req: Request, res: Response) => {
  try {
    const { uploaderAddress, title, description, category, tags, durationSeconds } = req.body;

    // Simular procesamiento de archivo (en prod, req.file)
    const mockBuffer = Buffer.from('fake-video-data');
    const { cid, encryptionKey } = await storageService.uploadAndEncrypt(mockBuffer, title);

    const newSubmission: DataSubmission = {
      id: `ds-${Date.now()}`,
      uploaderAddress,
      title,
      description,
      category: category || 'household',
      tags: tags || [],
      durationSeconds: durationSeconds || 60,
      qualityScore: Math.floor(Math.random() * (99 - 70) + 70), // Simular score de IA
      status: 'pending',
      ipfsCid: cid,
      encryptionKeyHash: encryptionKey,
      createdAt: Date.now(),
    };

    mockSubmissions.push(newSubmission);
    logger.success('New data submission received', { id: newSubmission.id, title });

    res.status(201).json({ 
      success: true, 
      message: 'Data uploaded and pending AI quality verification',
      data: newSubmission 
    });
  } catch (error) {
    logger.error('Submission failed', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

export const submissionRouter = router;
