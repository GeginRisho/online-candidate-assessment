import { Request, Response } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import { sendSuccess } from '@utils/ApiResponse';
import { BadRequestError, UnauthorizedError } from '@utils/AppError';
import * as domainsService from './domains.service';

export const getActiveDomains = asyncHandler(async (req: Request, res: Response) => {
  const domains = await domainsService.getActiveDomains();
  sendSuccess(res, domains, 'Active domains retrieved successfully');
});

export const getAllDomains = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin access required');
  }
  const domains = await domainsService.getAllDomains();
  sendSuccess(res, domains, 'All domains retrieved successfully');
});

export const createDomain = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin access required');
  }
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    throw new BadRequestError('Domain name is required');
  }
  const domain = await domainsService.createDomain(name.trim());
  sendSuccess(res, domain, 'Domain created successfully', 201);
});

export const updateDomain = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin access required');
  }
  const { id } = req.params;
  const { name, isActive } = req.body;
  if (!name || typeof name !== 'string') {
    throw new BadRequestError('Domain name is required');
  }
  const domain = await domainsService.updateDomain(id, name.trim(), isActive);
  sendSuccess(res, domain, 'Domain updated successfully');
});

export const deleteDomain = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin access required');
  }
  const { id } = req.params;
  const domain = await domainsService.deleteDomain(id);
  sendSuccess(res, domain, 'Domain deleted successfully');
});
