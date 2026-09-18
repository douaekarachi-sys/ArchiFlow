import { z } from 'zod';

/** Pagination uniforme `?page&pageSize` (ARCHITECTURE-CIBLE §6.7). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const skipTake = ({ page, pageSize }: Pagination) => ({ skip: (page - 1) * pageSize, take: pageSize });

export const toPage = <T>(data: T[], total: number, p: Pagination): Page<T> => ({ data, total, ...p });
