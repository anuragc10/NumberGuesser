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
    roomId: '', 
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const validateSecretNumber = (number, level) => {
    if (!number) return true;
    const numStr = number.toString();
    const expectedDigits = LEVELS[level].digits;

    if (numStr.length !== expectedDigits) return `Secret number must be exactly ${expectedDigits} digits`;
    if (!/^\d+$/.test(numStr)) return 'Secret number must contain only digits';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (formData.useCustomSecret && formData.secretNumber) {
      const validationError = validateSecretNumber(formData.secretNumber, formData.level);
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
      
      if (formData.roomId.trim()) {
        gameData.roomId = formData.roomId.trim();
      }

      if (formData.useCustomSecret && formData.secretNumber) {
        gameData.secretNumber = parseInt(formData.secretNumber, 10);
      }

      const response = await startGame(gameData);
      onGameStart(response);
    } catch (err) {
      setError(err.message || 'Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentLevelDigits = LEVELS[formData.level].digits;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#fff8e7' }}>
      <div className="max-w-md w-full bg-[#fffdf6] p-8 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] border border-[#f0e6d2] font-hand" style={{ fontFamily: "'Patrick Hand', cursive", lineHeight: 1.6 }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">Number Guesser</h1>
          <p className="text-gray-700 text-sm">Start your multiplayer game</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Name Input */}
          <div>
            <label htmlFor="playerName" className="block mb-1 text-gray-800 font-medium">Your Name</label>
            <input
              type="text"
              id="playerName"
              name="playerName"
              value={formData.playerName}
              onChange={handleInputChange}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-400 transition-all"
              disabled={isLoading}
              required
            />
          </div>
          {/* Room ID (Optional) */}
          <div>
            <label htmlFor="roomId" className="block mb-1 text-gray-800 font-medium">
              Room ID (optional)
            </label>
            <input
              type="text"
              id="roomId"
              name="roomId"
              value={formData.roomId}
              onChange={handleInputChange}
              placeholder="Enter Room ID to join existing game"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-400 transition-all"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to create a new room
            </p>
          </div>


          {/* Level Selection */}
          <div>
            <label htmlFor="level" className="block mb-1 text-gray-800 font-medium">Game Level</label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
              disabled={isLoading}
            >
              {Object.values(LEVELS).map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Level {formData.level} uses {currentLevelDigits} digit numbers
            </p>
          </div>

          {/* Custom Secret Number */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="useCustomSecret"
              name="useCustomSecret"
              checked={formData.useCustomSecret}
              onChange={handleInputChange}
              className="w-5 h-5 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="useCustomSecret" className="text-gray-800 cursor-pointer">Enter your own secret number (optional)</label>
          </div>

          {formData.useCustomSecret && (
            <div>
              <label htmlFor="secretNumber" className="block mb-1 text-gray-800 font-medium">Secret Number ({currentLevelDigits} digits)</label>
              <input
                type="text"
                id="secretNumber"
                name="secretNumber"
                value={formData.secretNumber}
                onChange={handleInputChange}
                placeholder={`Enter ${currentLevelDigits} digit number`}
                maxLength={currentLevelDigits}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty to let the system generate one for you</p>
            </div>
          )}

          {/* Limit Attempts */}
          <div className="flex items-center justify-between bg-[#fdf9f0] border border-gray-300 rounded-lg p-3">
            <div>
              <p className="text-gray-800 font-medium">Limit attempts</p>
              <p className="text-xs text-gray-500">Turn off to allow unlimited guesses.</p>
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
              <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-yellow-400 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? 'Starting Game...' : 'Start Game'}
          </button>
        </form>
      </div>
    </div>
    



  );
};

export default StartScreen;
