const Notification = require('../models/Notification');

async function notify(userId, { type, title, body = '', link = '' }) {
  try {
    return await Notification.create({ userId, type, title, body, link });
  } catch (err) {
    // Notifications must never break the main workflow.
    console.error('[notify] failed:', err.message);
    return null;
  }
}

async function listForUser(userId, { page, limit, skip }) {
  const [results, total, unread] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, isRead: false }),
  ]);
  return { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1, unread };
}

const markRead = (id, userId) =>
  Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });

const markAllRead = (userId) => Notification.updateMany({ userId, isRead: false }, { isRead: true });

module.exports = { notify, listForUser, markRead, markAllRead };
