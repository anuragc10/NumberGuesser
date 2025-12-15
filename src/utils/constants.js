export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const GAME_MODES = {
  MULTIPLAYER: 'MULTIPLAYER',
  SINGLE: 'SINGLE',
};

export const LEVELS = {
  1: { value: 1, digits: 2, label: 'Level 1 (2 digits)' },
  2: { value: 2, digits: 3, label: 'Level 2 (3 digits)' },
  3: { value: 3, digits: 4, label: 'Level 3 (4 digits)' },
};

