/**
 * Row locks used by every code path that changes a role's fill count. The order is always
 * role first, then request, so concurrent accepts, manual fills and removals cannot deadlock.
 */
export const lockRole = (tx, roleId) => tx.$queryRaw`SELECT id FROM "Role" WHERE id = ${roleId} FOR UPDATE`;
export const lockRequest = (tx, id) => tx.$queryRaw`SELECT id FROM "Request" WHERE id = ${id} FOR UPDATE`;
