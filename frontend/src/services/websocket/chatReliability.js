import useChatStore from '../../store/chatStore.js';

const isTransportConnected = (isConnected, wsService) => {
  if (typeof isConnected === 'function') return Boolean(isConnected());
  if (typeof isConnected === 'boolean') return isConnected;
  return Boolean(wsService?.isConnected?.());
};

const toCreatedAtTime = (item) => {
  const parsed = Date.parse(item?.createdAt);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const buildSendPayload = (pending, clientMessageId) => ({
  conversationId: pending.conversationId,
  content: pending.content ?? '',
  clientMessageId,
  replyToMessageId: pending.replyToMessageId ?? null,
  uploadIds: pending.uploadIds ?? []
});

export const sendPendingMessage = (
  clientMessageId,
  {
    wsService,
    isConnected,
    allowSending = false,
    releaseStaleAttempt = false,
    attemptKey = null
  } = {}
) => {
  const store = useChatStore.getState();
  let pending = store.pendingOutbound[clientMessageId];

  if (!pending) {
    console.warn('Cannot send pending message, payload not found:', clientMessageId);
    return false;
  }

  if (releaseStaleAttempt) {
    const canStartFreshAttempt = store.releaseStaleOutboundInFlight(clientMessageId, attemptKey);
    if (!canStartFreshAttempt) return false;

    store.clearAckTimer(clientMessageId);
    pending = useChatStore.getState().pendingOutbound[clientMessageId];

    if (!pending) return false;
  }

  if (!isTransportConnected(isConnected, wsService)) {
    store.markMessageFailedByClientMessageId(pending.conversationId, clientMessageId);
    store.updatePendingOutboundStatus(clientMessageId, 'failed');
    store.clearOutboundInFlight(clientMessageId);
    return false;
  }

  if (pending.status === 'sending' && !allowSending) {
    return false;
  }

  if (!store.beginOutboundInFlight(clientMessageId, attemptKey)) {
    return false;
  }

  const latestStore = useChatStore.getState();
  const latestPending = latestStore.pendingOutbound[clientMessageId];

  if (!latestPending) {
    latestStore.clearOutboundInFlight(clientMessageId);
    return false;
  }

  if (latestPending.status === 'sending' && !allowSending) {
    latestStore.clearOutboundInFlight(clientMessageId);
    return false;
  }

  latestStore.updatePendingOutboundStatus(clientMessageId, 'sending');
  latestStore.markMessageSendingByClientMessageId(latestPending.conversationId, clientMessageId);

  const didSend = wsService?.send?.('/app/chat.send', buildSendPayload(latestPending, clientMessageId));

  if (didSend) {
    useChatStore.getState().startAckTimer(clientMessageId);
    return true;
  }

  const failedStore = useChatStore.getState();
  failedStore.clearOutboundInFlight(clientMessageId);
  failedStore.markMessageFailedByClientMessageId(latestPending.conversationId, clientMessageId);
  failedStore.updatePendingOutboundStatus(clientMessageId, 'failed');
  return false;
};

export const resendPendingMessagesAfterReconnect = async ({ wsService, isConnected, attemptKey = null } = {}) => {
  const snapshot = Object.values(useChatStore.getState().pendingOutbound)
    .map((item, index) => ({ ...item, index }))
    .sort((left, right) => {
      const createdAtDiff = toCreatedAtTime(left) - toCreatedAtTime(right);
      if (createdAtDiff !== 0) return createdAtDiff;
      return left.index - right.index;
    });

  if (snapshot.length === 0) {
    return { attempted: 0, skipped: 0, stopped: false };
  }

  let attempted = 0;
  let skipped = 0;

  for (const item of snapshot) {
    if (!isTransportConnected(isConnected, wsService)) {
      return { attempted, skipped, stopped: true };
    }

    const latest = useChatStore.getState().pendingOutbound[item.clientMessageId];
    if (!latest) {
      skipped += 1;
      continue;
    }

    const didSend = sendPendingMessage(item.clientMessageId, {
      wsService,
      isConnected,
      allowSending: true,
      releaseStaleAttempt: true,
      attemptKey
    });

    if (didSend) {
      attempted += 1;
    } else {
      skipped += 1;
    }
  }

  return { attempted, skipped, stopped: false };
};
