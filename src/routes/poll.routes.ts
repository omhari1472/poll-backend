import { Router, Request, Response } from 'express';
import { pollController } from '@/controllers/poll.controller';
import { sessionMiddleware } from '@/middleware/session.middleware';

const router: Router = Router();

router.use(sessionMiddleware as any);

router.get('/polls', (req: Request, res: Response) => { void pollController.getPolls(req as any, res); });
router.get('/polls/:pollId', (req: Request, res: Response) => { void pollController.getPoll(req as any, res); });
router.post('/polls', (req: Request, res: Response) => { void pollController.createPoll(req as any, res); });
router.put('/polls/:pollId', (req: Request, res: Response) => { void pollController.updatePoll(req as any, res); });
router.delete('/polls/:pollId', (req: Request, res: Response) => { void pollController.deletePoll(req as any, res); });

router.post('/polls/:pollId/vote', (req: Request, res: Response) => { void pollController.voteOnPoll(req as any, res); });
router.delete('/polls/:pollId/vote', (req: Request, res: Response) => { void pollController.removeVote(req as any, res); });

router.post('/polls/:pollId/like', (req: Request, res: Response) => { void pollController.likePoll(req as any, res); });
router.delete('/polls/:pollId/like', (req: Request, res: Response) => { void pollController.unlikePoll(req as any, res); });

router.get('/session/polls', (req: Request, res: Response) => { void pollController.getSessionPolls(req as any, res); });
router.get('/session/votes', (req: Request, res: Response) => { void pollController.getSessionVotes(req as any, res); });

export default router;
