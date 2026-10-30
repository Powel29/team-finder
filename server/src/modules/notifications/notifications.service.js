import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { emitToUser } from '../../lib/socket.js';
import { notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';

export const toNotificationDto = (n) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  data: n.data,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

export const unreadCount = (userId) => prisma.notification.count({ where: { userId, readAt: null } });

/**
 * Persists a notification and pushes it to the user's sockets. Notifications are a side effect of
 * something that already succeeded, so failures are logged rather than thrown.
 */
export async function notify(userId, { type, title, body = '', link = '', data }) {
  try {
    const notification = await prisma.notification.create({ data: { userId, type, title, body, link, data } });
    emitToUser(userId, 'notification:new', {
      ...toNotificationDto(notification),
      unreadCount: await unreadCount(userId),
    });
    return notification;
  } catch (err) {
    logger.error({ err, userId, type }, 'Failed to create notification');
    return null;
  }
}

export const notifyMany = (userIds, payload) => Promise.all([...new Set(userIds)].map((id) => notify(id, payload)));

export async function listNotifications(userId, { unread, page, pageSize }) {
  const where = { userId, ...(unread && { readAt: null }) };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);
  return buildPage(items.map(toNotificationDto), page, pageSize, total);
}

export async function markRead(userId, id) {
  const { count } = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0 && !(await prisma.notification.findFirst({ where: { id, userId }, select: { id: true } })))
    throw notFound('Notification');
  return { count: await unreadCount(userId) };
}

export async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { count: 0 };
}
