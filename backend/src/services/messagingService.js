const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Proposal = require('../models/Proposal');
const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');

/**
 * Messaging rules: a client and freelancer may only converse when the
 * platform workflow permits it - i.e. a proposal between them is
 * SHORTLISTED or ACCEPTED, or they share a non-cancelled project.
 */
async function canCommunicate(clientId, freelancerId) {
  const proposal = await Proposal.findOne({
    freelancerId,
    status: { $in: ['SHORTLISTED', 'ACCEPTED'] },
  }).populate({ path: 'jobId', select: 'clientId' });
  if (proposal && proposal.jobId && proposal.jobId.clientId.equals(clientId)) return true;

  const project = await Project.findOne({
    clientId,
    freelancerId,
    status: { $nin: ['CANCELLED'] },
  });
  return Boolean(project);
}

async function getOrCreateConversation(clientId, freelancerId) {
  if (!(await canCommunicate(clientId, freelancerId))) {
    throw ApiError.forbidden(
      'Messaging is available once a proposal is shortlisted or a project is active.'
    );
  }
  let convo = await Conversation.findOne({ participants: { $all: [clientId, freelancerId], $size: 2 } });
  if (!convo) {
    convo = await Conversation.create({ participants: [clientId, freelancerId] });
  }
  return convo;
}

async function assertParticipant(conversationId, userId) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw ApiError.notFound('Conversation not found');
  if (!convo.participants.some((p) => p.equals(userId))) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }
  return convo;
}

async function sendMessage(conversationId, senderId, text) {
  const convo = await assertParticipant(conversationId, senderId);
  const message = await Message.create({ conversationId, senderId, text, readBy: [senderId] });
  convo.lastMessage = { text: text.slice(0, 120), senderId, createdAt: new Date() };
  const other = convo.participants.find((p) => !p.equals(senderId));
  if (other) {
    const key = other.toString();
    convo.unreadCounts.set(key, (convo.unreadCounts.get(key) || 0) + 1);
  }
  await convo.save();
  return { message, conversation: convo };
}

async function markConversationRead(conversationId, userId) {
  const convo = await assertParticipant(conversationId, userId);
  await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
  );
  convo.unreadCounts.set(userId.toString(), 0);
  await convo.save();
}

module.exports = { canCommunicate, getOrCreateConversation, assertParticipant, sendMessage, markConversationRead };
