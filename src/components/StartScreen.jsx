import { useState } from 'react';
import { startGame } from '../services/api';
import { GAME_MODES, LEVELS } from '../utils/constants';

const StartScreen = ({ onGameStart }) => {
  const [formData, setFormData] = useState({
    playerName: '',
    level: 1,
    secretNumber: '',
    useCustomSecret: false,
    limitAttempts: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateSecretNumber = (number, level) => {
    if (!number) return true; // Empty is valid (API will generate)
    
    const numStr = number.toString();
    const expectedDigits = LEVELS[level].digits;
    
    if (numStr.length !== expectedDigits) {
      return `Secret number must be exactly ${expectedDigits} digits`;
    }
    
    if (!/^\d+$/.test(numStr)) {
      return 'Secret number must contain only digits';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate player name
    if (!formData.playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Validate secret number if provided
    if (formData.useCustomSecret && formData.secretNumber) {
      const validationError = validateSecretNumber(
        formData.secretNumber,
        formData.level
      );
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);

    try {
      const gameData = {
        gameMode: GAME_MODES.MULTIPLAYER,
        playerId: formData.playerName.trim(),
        level: parseInt(formData.level, 10),
        limitAttempts: formData.limitAttempts,
      };

      // Only include secretNumber if user provided one
      if (formData.useCustomSecret && formData.secretNumber) {
        gameData.secretNumber = parseInt(formData.secretNumber, 10);
      }

      const response = await startGame(gameData);
      console.log('Game started successfully:', response);
      onGameStart(response);
    } catch (err) {
      setError(err.message || 'Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentLevelDigits = LEVELS[formData.level].digits;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Number Guesser
          </h1>
          <p className="text-white/80 text-sm">
            Start your multiplayer game
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Name Input */}
          <div>
            <label
              htmlFor="playerName"
              className="block text-sm font-medium text-white mb-2"
            >
              Your Name
            </label>
            <input
              type="text"
              id="playerName"
              name="playerName"
              value={formData.playerName}
              onChange={handleInputChange}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              required
              disabled={isLoading}
            />
          </div>

          {/* Level Selection */}
          <div>
            <label
              htmlFor="level"
              className="block text-sm font-medium text-white mb-2"
            >
              Game Level
            </label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              disabled={isLoading}
            >
              {Object.values(LEVELS).map((level) => (
                <option
                  key={level.value}
                  value={level.value}
                  className="bg-gray-800 text-white"
                >
                  {level.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-white/60">
              Level {formData.level} uses {currentLevelDigits} digit numbers
            </p>
          </div>

          {/* Custom Secret Number Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="useCustomSecret"
              name="useCustomSecret"
              checked={formData.useCustomSecret}
              onChange={handleInputChange}
              className="w-5 h-5 rounded border-white/30 bg-white/20 text-blue-600 focus:ring-2 focus:ring-blue-400"
              disabled={isLoading}
            />
            <label
              htmlFor="useCustomSecret"
              className="text-sm font-medium text-white cursor-pointer"
            >
              Enter your own secret number (optional)
            </label>
          </div>

          {/* Secret Number Input */}
          {formData.useCustomSecret && (
            <div className="animate-fadeIn">
              <label
                htmlFor="secretNumber"
                className="block text-sm font-medium text-white mb-2"
              >
                Secret Number ({currentLevelDigits} digits)
              </label>
              <input
                type="text"
                id="secretNumber"
                name="secretNumber"
                value={formData.secretNumber}
                onChange={handleInputChange}
                placeholder={`Enter ${currentLevelDigits} digit number`}
                maxLength={currentLevelDigits}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-white/60">
                Leave empty to let the system generate one for you
              </p>
            </div>
          )}

          {/* Attempt Limit Toggle */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-white">Limit attempts</p>
              <p className="text-xs text-white/60">Turn off to allow unlimited guesses.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="limitAttempts"
                className="sr-only peer"
                checked={formData.limitAttempts}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 relative"></div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Starting Game...
              </span>
            ) : (
              'Start Game'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StartScreen;

