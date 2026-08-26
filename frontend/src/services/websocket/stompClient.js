import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.client = null;
    this.subscribers = new Map(); // topic -> [callbacks]
    this.activeSubscriptions = new Map(); // topic -> subscription object
    this.presenceHeartbeatTimer = null;
    // Incremented every time onConnect fires.
    // 1 = first ever connect, 2+ = reconnect.
    this.connectCount = 0;
  }

  connect(token, onConnect, onDisconnect, onError) {
    if (this.client && this.client.connected) return;

    this.client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.connectCount += 1;
        const isReconnect = this.connectCount > 1;
        console.log(`Connected to STOMP (connectCount=${this.connectCount}, isReconnect=${isReconnect})`);
        this._startPresenceHeartbeat();
        this._resubscribeAll();
        // Pass connectCount so callers know if this is a reconnect
        if (onConnect) onConnect(this.connectCount);
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        if (onError) onError(frame);
      },
      onWebSocketClose: () => {
        console.log('WebSocket closed');
        this._stopPresenceHeartbeat();
        if (onDisconnect) onDisconnect();
      }
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.subscribers.clear();
      this.activeSubscriptions.clear();
    }
    this._stopPresenceHeartbeat();
    // Reset so next connect() call starts fresh
    this.connectCount = 0;
  }

  isConnected() {
    return Boolean(this.client && this.client.connected);
  }

  _startPresenceHeartbeat() {
    this._stopPresenceHeartbeat();
    this.presenceHeartbeatTimer = setInterval(() => {
      if (this.client && this.client.connected) {
        this.client.publish({
          destination: '/app/presence.heartbeat',
          body: JSON.stringify({})
        });
      }
    }, 30000);
  }

  _stopPresenceHeartbeat() {
    if (this.presenceHeartbeatTimer) {
      clearInterval(this.presenceHeartbeatTimer);
      this.presenceHeartbeatTimer = null;
    }
  }

  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push(callback);

    if (this.client && this.client.connected && !this.activeSubscriptions.has(topic)) {
      const sub = this.client.subscribe(topic, (message) => {
        const body = JSON.parse(message.body);
        this.subscribers.get(topic).forEach(cb => cb(body));
      });
      this.activeSubscriptions.set(topic, sub);
    }
  }

  unsubscribe(topic, callback) {
    const topicSubscribers = this.subscribers.get(topic);
    if (topicSubscribers) {
      this.subscribers.set(topic, topicSubscribers.filter(cb => cb !== callback));
      
      if (this.subscribers.get(topic).length === 0) {
        const sub = this.activeSubscriptions.get(topic);
        if (sub) {
          sub.unsubscribe();
          this.activeSubscriptions.delete(topic);
        }
        this.subscribers.delete(topic);
      }
    }
  }

  _resubscribeAll() {
    this.activeSubscriptions.clear();
    for (const [topic, callbacks] of this.subscribers.entries()) {
      if (callbacks.length > 0) {
        const sub = this.client.subscribe(topic, (message) => {
          const body = JSON.parse(message.body);
          this.subscribers.get(topic).forEach(cb => cb(body));
        });
        this.activeSubscriptions.set(topic, sub);
      }
    }
  }

  send(destination, body) {
    if (this.client && this.client.connected) {
      try {
        this.client.publish({
          destination,
          body: JSON.stringify(body)
        });
        return true;
      } catch (error) {
        console.warn('Cannot publish STOMP message', error);
        return false;
      }
    }

    console.warn('Cannot send STOMP message, not connected');
    return false;
  }
}

export const wsService = new WebSocketService();
