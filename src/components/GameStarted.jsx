import { useEffect, useState } from 'react';
import { connectWebSocket, subscribeToRoom, disconnectWebSocket } from '../services/websocket';
import { submitGuess, getGuessHistory } from '../services/api';
import { LEVELS } from '../utils/constants';

const GameStarted = ({ gameData }) => {
  const [playerJoinedNotification, setPlayerJoinedNotification] = useState(null);
  const [turnNotification, setTurnNotification] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(gameData.currentPlayerId || null);
  const [roomStatus, setRoomStatus] = useState(gameData.roomStatus || 'WAITING_FOR_PLAYER');
  const [guessInput, setGuessInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guessHistory, setGuessHistory] = useState([]);
  const [error, setError] = useState('');
  
  // Only show waiting message if room status is WAITING_FOR_PLAYER (i.e., P1 is waiting)
  const [isWaitingForPlayer, setIsWaitingForPlayer] = useState(
    gameData.gameMode === 'MULTIPLAYER' && 
    gameData.roomStatus === 'WAITING_FOR_PLAYER'
  );

  const isMyTurn = currentPlayerId === gameData.playerId;
  const expectedDigits = LEVELS[gameData.level]?.digits || 2;

  // Update currentPlayerId and roomStatus when gameData changes (e.g., when P2 joins)
  useEffect(() => {
    console.log('GameData updated:', { 
      currentPlayerId: gameData.currentPlayerId, 
      roomStatus: gameData.roomStatus,
      playerId: gameData.playerId 
    });
    if (gameData.currentPlayerId) {
      setCurrentPlayerId(gameData.currentPlayerId);
    }
    if (gameData.roomStatus) {
      setRoomStatus(gameData.roomStatus);
    }
  }, [gameData.currentPlayerId, gameData.roomStatus]);

  // Fetch history when room status changes to IN_PROGRESS and set up periodic refresh
  useEffect(() => {
    if (roomStatus === 'IN_PROGRESS' && gameData.roomId) {
      const loadHistory = async () => {
        try {
          const history = await getGuessHistory(gameData.roomId);
          setGuessHistory(history || []);
        } catch (error) {
          console.error('Failed to fetch guess history:', error);
        }
      };
      
      // Initial load
      loadHistory();
      
      // Set up periodic refresh every 2 seconds to ensure both players see updates
      // const refreshInterval = setInterval(() => {
      //   loadHistory();
      // }, 2000);
      
      return;
    }
  }, [roomStatus, gameData.roomId]);

  useEffect(() => {
    // Only connect to WebSocket for multiplayer games with a room
    if (gameData.gameMode === 'MULTIPLAYER' && gameData.roomId) {
      let unsubscribe = null;

      const setupWebSocket = async () => {
        try {
          await connectWebSocket();
          
          // Subscribe to room notifications (handles both player joined and turn notifications)
          unsubscribe = subscribeToRoom(gameData.roomId, (notification) => {
            console.log('Room notification:', notification);
            
            // Check if it's a player joined notification (has joinedPlayerId)
            if (notification.joinedPlayerId) {
              console.log('Player joined notification received:', notification);
              setPlayerJoinedNotification(notification);
              setIsWaitingForPlayer(false);
              
              // Update room status when P2 joins
              if (notification.status === 'IN_PROGRESS') {
                setRoomStatus('IN_PROGRESS');
                
                // For P1: When P2 joins, P1 should be the current player (first player starts)
                // Check if the joined player is NOT the current player (meaning this is P1 receiving P2's join)
                if (notification.joinedPlayerId !== gameData.playerId) {
                  // This is P1 receiving notification that P2 joined
                  // P1 should be the current player (they started first)
                  if (!currentPlayerId) {
                    setCurrentPlayerId(gameData.playerId);
                  }
                }
                // For P2: currentPlayerId should already be set from gameData (from backend response)
              }
              
              // Auto-hide notification after 5 seconds
              setTimeout(() => {
                setPlayerJoinedNotification(null);
              }, 5000);
            } 
            // Check if it's a turn notification (has guessedNumber)
            else if (notification.guessedNumber !== undefined) {
              setTurnNotification(notification);
              if (notification.currentPlayerId) {
                setCurrentPlayerId(notification.currentPlayerId);
              }
              
              // Refresh history from API after a guess is made (with delay to ensure DB is updated)
              // Note: Periodic refresh will also pick this up, but immediate refresh ensures quick update
              if (gameData.roomId) {
                setTimeout(() => {
                  getGuessHistory(gameData.roomId)
                    .then(history => {
                      console.log('History after turn notification:', history);
                      setGuessHistory(history || []);
                    })
                    .catch(error => console.error('Failed to fetch guess history:', error));
                }, 500);
              }
              
              // Auto-hide notification after 5 seconds
              setTimeout(() => {
                setTurnNotification(null);
              }, 5000);
            }
          });
        } catch (error) {
          console.error('Failed to setup WebSocket:', error);
        }
      };

      setupWebSocket();

      // Cleanup on unmount
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        disconnectWebSocket();
      };
    }
  }, [gameData.roomId, gameData.gameMode, gameData.playerId]);

  const handleGuessSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!guessInput.trim()) {
      setError('Please enter a guess');
      return;
    }

    if (guessInput.length !== expectedDigits) {
      setError(`Guess must be exactly ${expectedDigits} digits`);
      return;
    }

    if (!/^\d+$/.test(guessInput)) {
      setError('Guess must contain only digits');
      return;
    }

    if (!isMyTurn) {
      setError("It's not your turn!");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitGuess(gameData.gameId, gameData.playerId, guessInput);
      console.log('Guess response:', response);

      // Clear input
      setGuessInput('');
      
      // Refresh history from API after submitting guess (with delay to ensure DB is updated)
      // Note: Periodic refresh will also pick this up, but immediate refresh ensures quick update
      if (gameData.roomId) {
        setTimeout(() => {
          getGuessHistory(gameData.roomId)
            .then(history => {
              console.log('History after guess:', history);
              setGuessHistory(history || []);
            })
            .catch(error => console.error('Failed to fetch guess history:', error));
        }, 500);
      }
      
      // Update current player (will be updated via WebSocket notification)
      if (response.status === 'IN_PROGRESS') {
        // Turn will switch, wait for WebSocket notification
      }
    } catch (err) {
      setError(err.message || 'Failed to submit guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-4xl border border-white/20 text-white">
        {/* Player Joined Notification */}
        {playerJoinedNotification && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg animate-fadeIn">
            <p className="text-green-200 font-semibold text-center">
              🎉 {playerJoinedNotification.message}
            </p>
            <p className="text-green-300/80 text-xs text-center mt-1">
              Game is ready to start!
            </p>
          </div>
        )}

        {/* Turn Notification */}
        {turnNotification && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg animate-fadeIn">
            <p className="text-blue-200 font-semibold text-center">
              {turnNotification.message}
            </p>
            <div className="mt-2 text-center text-sm">
              <p className="text-blue-300/80">
                Guess: <strong>{turnNotification.guessedNumber}  </strong> → 
                <span className="ml-1 px-2 py-1 bg-blue-600/50 rounded">
                [{turnNotification.correctDigits}] Correct
                </span>
              </p>
              {turnNotification.remainingAttempts !== undefined && (
                <p className="text-blue-300/80 mt-1">
                  Remaining attempts: <strong>{turnNotification.remainingAttempts}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Current Turn Indicator */}
        {currentPlayerId && roomStatus === 'IN_PROGRESS' && (
          <div className="mb-6 p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg">
            <p className="text-purple-200 font-semibold text-center text-lg">
              {isMyTurn ? (
                <>🎯 It's YOUR turn to guess!</>
              ) : (
                <>⏳ Waiting for {currentPlayerId} to make a guess...</>
              )}
            </p>
          </div>
        )}

        {/* Waiting for Player Message */}
        {isWaitingForPlayer && !playerJoinedNotification && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 font-semibold text-center">
              ⏳ Waiting for another player to join...
            </p>
            <p className="text-yellow-300/80 text-xs text-center mt-1">
              Share your Room ID: <strong>{gameData.roomId}</strong>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Your Guess History */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">Your Guesses</h3>
            {/* Fixed height with scrolling so long histories don't stretch the layout */}
            <div className="space-y-2 h-64 overflow-y-auto pr-1">
              {guessHistory.filter(g => g.playerId === gameData.playerId).length === 0 ? (
                <p className="text-white/50 text-sm">No guesses yet</p>
              ) : (
                guessHistory
                  .filter(g => g.playerId === gameData.playerId)
                  .map((guess, idx) => (
                    <div key={idx} className="bg-blue-500/20 rounded p-2 text-sm">
                      <span className="text-blue-200">{guess.guessedNumber}  </span>
                      <span className="ml-2 px-2 py-1 bg-blue-600/50 rounded text-xs">
                      →  {guess.correctDigits} Correct
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Center: Game Info & Guess Input */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="text-lg font-semibold mb-3 text-center"><p><strong>Player:</strong> {gameData.playerId}</p></h3>
            <div className="space-y-2 text-sm mb-4">
            <p><strong>Secret Number:</strong> {gameData.secretNumber}</p>
              
              {/* <p><strong>Room ID:</strong> <span className="text-xs">{gameData.roomId}</span></p> */}
            </div>

            {/* Guess Input Form - Show when game is in progress */}
            {roomStatus === 'IN_PROGRESS' && (
              <form onSubmit={handleGuessSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Enter your guess ({expectedDigits} digits)
                  </label>
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, expectedDigits);
                      setGuessInput(value);
                      setError('');
                    }}
                    placeholder={`${expectedDigits} digit number`}
                    maxLength={expectedDigits}
                    disabled={!isMyTurn || isSubmitting}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-red-200 text-xs">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!isMyTurn || isSubmitting || !guessInput}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {isSubmitting ? 'Submitting...' : isMyTurn ? 'Submit Guess' : "Not Your Turn"}
                </button>
              </form>
            )}
          </div>

          {/* Right: Opponent's Guess History */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="text-lg font-semibold mb-3 text-orange-300">Opponent's Guesses</h3>
            {/* Fixed height with scrolling so long histories don't stretch the layout */}
            <div className="space-y-2 h-64 overflow-y-auto pr-1">
              {guessHistory.filter(g => g.playerId !== gameData.playerId).length === 0 ? (
                <p className="text-white/50 text-sm">No guesses yet</p>
              ) : (
                guessHistory
                  .filter(g => g.playerId !== gameData.playerId)
                  .map((guess, idx) => (
                    <div key={idx} className="bg-orange-500/20 rounded p-2 text-sm">
                      <span className="text-orange-200">{guess.guessedNumber}  </span>
                      <span className="ml-2 px-2 py-1 bg-orange-600/50 rounded text-xs">
                      →  {guess.correctDigits} Correct
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStarted;
