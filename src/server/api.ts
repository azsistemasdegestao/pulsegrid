import { Router } from 'express';
import { adminRouter } from './routes/admin';
import { leadsRouter } from './routes/leads';

export const apiRouter = Router();

apiRouter.use('/leads', leadsRouter);
apiRouter.use('/admin', adminRouter);
