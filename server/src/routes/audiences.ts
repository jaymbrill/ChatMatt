import { Router, Request, Response } from 'express';
import { audienceQueries } from '../database';

const router = Router();

// GET /api/audiences
router.get('/', (_req: Request, res: Response) => {
  const audiences = audienceQueries.getAll();
  res.json(audiences.map(a => ({ ...a, tone_profile: JSON.parse(a.tone_profile) })));
});

// PATCH /api/audiences/:id - update phone number and display name
router.patch('/:id', (req: Request, res: Response) => {
  const { phone_number, name } = req.body as { phone_number?: string; name?: string };
  const audience = audienceQueries.getById(req.params.id);

  if (!audience) {
    res.status(404).json({ error: 'Audience not found' });
    return;
  }

  audienceQueries.update(
    req.params.id,
    phone_number ?? audience.phone_number,
    name ?? audience.name
  );

  res.json({ success: true });
});

export default router;
