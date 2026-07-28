import { prisma } from '@config/prisma';

export async function getActiveDomains() {
  return prisma.domain.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });
}

export async function getAllDomains() {
  return prisma.domain.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function createDomain(name: string) {
  return prisma.domain.create({
    data: { name, isActive: true }
  });
}

export async function updateDomain(id: string, name: string, isActive?: boolean) {
  return prisma.domain.update({
    where: { id },
    data: { name, isActive }
  });
}

export async function deleteDomain(id: string) {
  return prisma.domain.delete({
    where: { id }
  });
}
