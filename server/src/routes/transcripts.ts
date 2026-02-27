import { Router, Request, Response } from 'express';
import { transcriptQueries } from '../database';

const router = Router();

// GET /api/transcripts/:callId
router.get('/:callId', (req: Request, res: Response) => {
  const entries = transcriptQueries.getByCallId(req.params.callId);
  res.json(entries);
});

export default router;
