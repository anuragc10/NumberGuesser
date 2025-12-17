import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Start a new game
 * @param {Object} gameData - Game configuration
 * @param {string} gameData.gameMode - Game mode (MULTIPLAYER/SINGLE)
 * @param {string} gameData.playerId - Player name/ID
 * @param {number} gameData.level - Game level (1, 2, or 3)
 * @param {number} [gameData.secretNumber] - Optional secret number
 * @returns {Promise<Object>} Game response data
 */
export const startGame = async (gameData) => {
  try {
    const response = await apiClient.post('/guess/start', gameData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to start game'
    );
  }
};

/**
 * Submit a guess
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @param {string} guess - Guess number
 * @returns {Promise<Object>} Guess response data
 */
export const submitGuess = async (gameId, playerId, guess) => {
  try {
    const response = await apiClient.post('/guess/guess', {
      gameId,
      playerId,
      guess,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to submit guess'
    );
  }
};

/**
 * Get guess history for a room
 * @param {string} roomId - Room ID
 * @returns {Promise<Array>} Array of guess history items
 */
export const getGuessHistory = async (roomId) => {
  try {
    const response = await apiClient.post('/guess/history', { roomId });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to get guess history'
    );
  }
};

export const endGame = async (gameId, playerId) => {
  try {
    const response = await apiClient.post('/guess/end', {
      gameId,
      playerId,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      'Failed to end game'
    );
  }
};

export default apiClient;

