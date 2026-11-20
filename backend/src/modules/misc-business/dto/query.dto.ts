export interface MiscPaginationQuery {
  page: number;
  limit: number;
  search?: string;
  activityId?: string;
  startDate?: Date;
  endDate?: Date;
  paymentMethod?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function parseMiscQuery(query: Record<string, unknown>): MiscPaginationQuery {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const rawLimit = parseInt(String(query.limit || '10'), 10) || 10;
  const limit = Math.min(100, Math.max(1, rawLimit));

  const search =
    typeof query.search === 'string' && query.search.trim()
      ? query.search.trim()
      : undefined;

  const activityId =
    typeof query.activityId === 'string' && query.activityId.trim()
      ? query.activityId.trim()
      : undefined;

  const paymentMethod =
    typeof query.paymentMethod === 'string' && query.paymentMethod.trim()
      ? query.paymentMethod.trim()
      : undefined;

  const status =
    typeof query.status === 'string' && query.status.trim()
      ? query.status.trim()
      : undefined;

  let startDate: Date | undefined;
  if (query.startDate) {
    const d = new Date(String(query.startDate));
    if (!Number.isNaN(d.getTime())) {
      startDate = d;
    }
  }

  let endDate: Date | undefined;
  if (query.endDate) {
    const d = new Date(String(query.endDate));
    if (!Number.isNaN(d.getTime())) {
      endDate = d;
    }
  }

  const sortBy =
    typeof query.sortBy === 'string' && query.sortBy.trim()
      ? query.sortBy.trim()
      : undefined;

  const sortOrder: 'asc' | 'desc' =
    String(query.sortOrder || '').toLowerCase() === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    search,
    activityId,
    startDate,
    endDate,
    paymentMethod,
    status,
    sortBy,
    sortOrder,
  };
}
