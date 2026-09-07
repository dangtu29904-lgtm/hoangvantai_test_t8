import useChatStore from '../../store/chatStore.js';

const isTransportConnected = (isConnected, wsService) => {
  if (typeof isConnected === 'function') return Boolean(isConnected());
  if (typeof isConnected === 'boolean') return isConnected;
  return Boolean(wsService?.isConnected?.());
};

const toReceivedAtTime = (item) => {
  const parsed = Date.parse(item?.receivedAt);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

export const queueDeliveredAck = (message, currentUserId) => {
  if (!message?.id || !message?.conversationId) return false;
  if (currentUserId != null && Number(message.senderId) === Number(currentUserId)) return false;
  if (message.deliveredAt) {
    useChatStore.getState().removePendingDelivered(message.id);
    return false;
  }

  useChatStore.getState().addPendingDelivered({
    messageId: message.id,
    conversationId: message.conversationId,
    receivedAt: new Date().toISOString()
  });
  return true;
};

export const sendPendingDeliveredAck = (messageId, { wsService, isConnected } = {}) => {
  const store = useChatStore.getState();
  const key = String(messageId);
  const pending = store.pendingDelivered[key];

  if (!pending) return false;
  if (!isTransportConnected(isConnected, wsService)) return false;
  if (!store.beginDeliveredInFlight(messageId)) return false;

  const sent = wsService?.send?.('/app/chat.delivered', { messageId: pending.messageId });
  const latestStore = useChatStore.getState();
  latestStore.clearDeliveredInFlight(messageId);

  if (sent) {
    latestStore.removePendingDelivered(messageId);
    return true;
  }

  latestStore.incrementPendingDeliveredAttempt(messageId);
  return false;
};

export const queueAndSendDeliveredAck = (
  message,
  currentUserId,
  { wsService, isConnected } = {}
) => {
  const queued = queueDeliveredAck(message, currentUserId);
  if (!queued) return false;
  return sendPendingDeliveredAck(message.id, { wsService, isConnected });
};

export const flushPendingDeliveredAcks = ({ wsService, isConnected } = {}) => {
  const snapshot = Object.values(useChatStore.getState().pendingDelivered)
    .map((item, index) => ({ ...item, index }))
    .sort((left, right) => {
      const receivedAtDiff = toReceivedAtTime(left) - toReceivedAtTime(right);
      if (receivedAtDiff !== 0) return receivedAtDiff;
      return Number(left.messageId) - Number(right.messageId) || left.index - right.index;
    });

  let attempted = 0;
  let skipped = 0;

  for (const item of snapshot) {
    if (!isTransportConnected(isConnected, wsService)) {
      return { attempted, skipped, stopped: true };
    }

    const sent = sendPendingDeliveredAck(item.messageId, { wsService, isConnected });
    if (sent) {
      attempted += 1;
    } else {
      skipped += 1;
    }
  }

  return { attempted, skipped, stopped: false };
};
