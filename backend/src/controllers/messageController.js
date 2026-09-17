const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, parsePagination } = require('../utils/helpers');
const messaging = require('../services/messagingService');
const { notify } = require('../services/notificationService');

// Creates (or returns) a conversation between the current user and `otherUserId`,
// gated by the marketplace workflow rules in messagingService.
const startConversation = asyncHandler(async (req, res) => {
  const { otherUserId } = req.body;
  if (!otherUserId) throw ApiError.badRequest('otherUserId is required');
  if (String(otherUserId) === String(req.user._id)) throw ApiError.badRequest('Cannot message yourself');
  const [clientId, freelancerId] =
    req.user.role === 'client' ? [req.user._id, otherUserId] : [otherUserId, req.user._id];
  const convo = await messaging.getOrCreateConversation(clientId, freelancerId);
  ok(res, { conversation: convo }, 'Conversation ready');
});

const listConversations = asyncHandler(async (req, res) => {
  const convos = await Conversation.find({ participants: req.user._id })
    .populate('participants', 'name profileImage role')
    .sort({ updatedAt: -1 });
  const data = convos.map((c) => ({
    ...c.toObject(),
    unread: c.unreadCounts?.get(req.user._id.toString()) || 0,
  }));
  ok(res, { results: data });
});

const listMessages = asyncHandler(async (req, res) => {
  const convo = await messaging.assertParticipant(req.params.conversationId, req.user._id);
  const { page, limit, skip } = parsePagination(req.query, 30, 100);
  const [results, total] = await Promise.all([
    Message.find({ conversationId: convo._id }).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('senderId', 'name profileImage'),
    Message.countDocuments({ conversationId: convo._id }),
  ]);
  await messaging.markConversationRead(convo._id, req.user._id);
  ok(res, { results: results.reverse(), page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const convo = await messaging.assertParticipant(req.params.conversationId, req.user._id);
  const { message } = await messaging.sendMessage(convo._id, req.user._id, text);
  const other = convo.participants.find((p) => !p.equals(req.user._id));
  if (other) {
    await notify(other, {
      type: 'NEW_MESSAGE', title: 'New message',
      body: `${req.user.name}: ${text.slice(0, 80)}`,
      link: `/${req.user.role === 'client' ? 'freelancer' : 'client'}/messages`,
    });
  }
  const populated = await message.populate('senderId', 'name profileImage');
  ok(res, { message: populated }, 'Message sent', 201);
});

module.exports = { startConversation, listConversations, listMessages, sendMessage };
