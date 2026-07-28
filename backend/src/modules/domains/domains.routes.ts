import { Router } from 'express';
import { requireAuth, requireRole } from '@middleware/auth';
import * as domainsController from './domains.controller';

export const domainsRouter = Router();

// Public: Candidate Domain Selection List
domainsRouter.get('/public', domainsController.getActiveDomains);

// Admin-only CRUD paths
domainsRouter.get('/', requireAuth, requireRole('ADMIN'), domainsController.getAllDomains);
domainsRouter.post('/', requireAuth, requireRole('ADMIN'), domainsController.createDomain);
domainsRouter.put('/:id', requireAuth, requireRole('ADMIN'), domainsController.updateDomain);
domainsRouter.delete('/:id', requireAuth, requireRole('ADMIN'), domainsController.deleteDomain);
