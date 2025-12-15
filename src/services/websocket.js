import SockJS from 'sockjs-client';
import { over } from 'stompjs';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:8080/ws';

let stompClient = null;

/**
 * Connect to WebSocket server
 * @returns {Promise} STOMP client instance
 */
export const connectWebSocket = () => {
  if (stompClient && stompClient.connected) {
    return Promise.resolve(stompClient);
  }

  return new Promise((resolve, reject) => {
    const socket = new SockJS(WS_BASE_URL, null, {
      withCredentials: false
    });
    const client = over(socket);

    client.connect(
      {},
      () => {
        console.log('✅ Connected to WebSocket');
        stompClient = client;
        resolve(client);
      },
      (error) => {
        console.error('WebSocket connection error:', error);
        reject(new Error('WebSocket connection failed'));
      }
    );
  });
};

/**
 * Subscribe to room notifications
 * @param {string} roomId - Room ID to subscribe to
 * @param {Function} callback - Callback function to handle notifications
 * @returns {Function} Unsubscribe function
 */
export const subscribeToRoom = (roomId, callback) => {
  if (!stompClient || !stompClient.connected) {
    console.error('WebSocket not connected');
    return () => {};
  }

  const subscription = stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
    try {
      const notification = JSON.parse(message.body);
      callback(notification);
    } catch (error) {
      console.error('Error parsing notification:', error);
    }
  });

  return () => {
    if (subscription) {
      subscription.unsubscribe();
    }
  };
};

/**
 * Disconnect from WebSocket
 */
export const disconnectWebSocket = () => {
  if (stompClient && stompClient.connected) {
    stompClient.disconnect(() => {
      console.log('Disconnected from WebSocket');
    });
    stompClient = null;
  }
};

/**
 * Get the current STOMP client instance
 * @returns {Object|null} STOMP client or null if not connected
 */
export const getStompClient = () => {
  return stompClient;
};

