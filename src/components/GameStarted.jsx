import { useEffect, useState, useRef } from 'react';
import { connectWebSocket, subscribeToRoom, disconnectWebSocket } from '../services/websocket';
import { submitGuess, endGame } from '../services/api';
import { LEVELS } from '../utils/constants';
import './GameStyles.css';
import bgMusic from '../sound/background.mp3';

const GameStarted = ({ gameData }) => {
  const [playerJoinedNotification, setPlayerJoinedNotification] = useState(null);
  const [turnNotification, setTurnNotification] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(gameData.currentPlayerId || null);
  const [roomStatus, setRoomStatus] = useState(gameData.roomStatus || 'WAITING_FOR_PLAYER');
  const [guessInput, setGuessInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guessHistory, setGuessHistory] = useState([]);
  const [error, setError] = useState('');
  const [gameOverMessage, setGameOverMessage] = useState(null);
  const [hasEndedGame, setHasEndedGame] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [copied, setCopied] = useState(false);


  const sanitizeMessage = (message) => {
    if (!message) return '';
    // removes #123456 style suffixes everywhere
    return message.replace(/#[0-9]+/g, '');
  };



  const [isWaitingForPlayer, setIsWaitingForPlayer] = useState(
    gameData.gameMode === 'MULTIPLAYER' &&
    gameData.roomStatus === 'WAITING_FOR_PLAYER'
  );

  const isGameCompleted = roomStatus === 'COMPLETED';
  const isMyTurn = currentPlayerId === gameData.playerId && !isGameCompleted;
  const expectedDigits = LEVELS[gameData.level]?.digits || 2;
  const bgAudioRef = useRef(null);

  const [manualDigits, setManualDigits] = useState(
    Array(expectedDigits).fill('')
  );
  useEffect(() => {
    setManualDigits(Array(expectedDigits).fill(''));
  }, [expectedDigits]);


  const getDisplayName = (playerId) => {
    if (!playerId) return '';
    return playerId.split('#')[0]; // removes #XXXXXX
  };



  useEffect(() => {
    if (roomStatus === 'COMPLETED') {
      if (!sessionStorage.getItem('gameReloaded')) {
        sessionStorage.setItem('gameReloaded', 'true');
        setTimeout(() => window.location.reload(), 2000);
      }
    }
  }, [roomStatus]);
  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = 0.2; // adjust volume
      bgAudioRef.current.loop = true;   // loop forever
      bgAudioRef.current.play().catch(err => console.log('Autoplay blocked:', err));
    }
  }, []);

  useEffect(() => {
    const handlePlayerLeave = () => {
      if (hasEndedGame || roomStatus === 'COMPLETED') return;
      setHasEndedGame(true);
      endGame(gameData.gameId, gameData.playerId).catch(err => console.error(err));
    };
    window.addEventListener('beforeunload', handlePlayerLeave);
    return () => window.removeEventListener('beforeunload', handlePlayerLeave);
  }, [gameData.gameId, gameData.playerId, hasEndedGame, roomStatus]);

  useEffect(() => {
    if (gameData.currentPlayerId) setCurrentPlayerId(gameData.currentPlayerId);
    if (gameData.roomStatus) setRoomStatus(gameData.roomStatus);
  }, [gameData.currentPlayerId, gameData.roomStatus]);

  // useEffect(() => {
  //   if (roomStatus === 'IN_PROGRESS' && gameData.roomId) {
  //     const loadHistory = async () => {
  //       try {
  //         const history = await getGuessHistory(gameData.roomId);
  //         setGuessHistory(history || []);
  //       } catch (err) {
  //         console.error(err);
  //       }
  //     };
  //     loadHistory();
  //   }
  // }, [roomStatus, gameData.roomId]);

  useEffect(() => {
    if (gameData.gameMode === 'MULTIPLAYER' && gameData.roomId) {
      let unsubscribe = null;

      const setupWebSocket = async () => {
        try {
          await connectWebSocket();
          unsubscribe = subscribeToRoom(gameData.roomId, (notification) => {
            if (notification.status === 'COMPLETED') {
              setRoomStatus('COMPLETED');
              setGameOverMessage(notification.message);
              return;
            }

            if (notification.joinedPlayerId) {
              setPlayerJoinedNotification(notification);
              setIsWaitingForPlayer(false);
              if (notification.status === 'IN_PROGRESS') {
                setRoomStatus('IN_PROGRESS');
                if (notification.joinedPlayerId !== gameData.playerId && !currentPlayerId) {
                  setCurrentPlayerId(gameData.playerId);
                }
              }
              setTimeout(() => setPlayerJoinedNotification(null), 5000);
            } else if (notification.guessedNumber !== undefined) {
              setTurnNotification(notification);

              setGuessHistory(prev => {
                const alreadyExists = prev.some(
                  g =>
                    g.playerId === notification.playerId &&
                    g.guessNumber === notification.guessNumber
                );

                if (alreadyExists) return prev;

                return [

                  {
                    playerId: notification.playerId,
                    guessedNumber: notification.guessedNumber,
                    correctDigits: notification.correctDigits,
                    guessNumber: notification.guessNumber
                  },
                  ...prev
                ];
              });

              if (notification.currentPlayerId) {
                setCurrentPlayerId(notification.currentPlayerId);
              }

              setTimeout(() => setTurnNotification(null), 5000);
            }

          });
        } catch (err) {
          console.error(err);
        }
      };

      setupWebSocket();
      return () => {
        if (unsubscribe) unsubscribe();
        disconnectWebSocket();
      };
    }
  }, [gameData.roomId, gameData.gameMode, gameData.playerId]);

  const handleManualChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...manualDigits];
    updated[index] = value;
    setManualDigits(updated);

    // auto move to next box
    if (value && index < manualDigits.length - 1) {
      document.getElementById(`manual-${index + 1}`)?.focus();
    }
  };

  const handleManualKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !manualDigits[index] && index > 0) {
      document.getElementById(`manual-${index - 1}`)?.focus();
    }
  };



  const toggleSound = () => {
    if (!bgAudioRef.current) return;

    if (isSoundOn) {
      bgAudioRef.current.pause();
    } else {
      bgAudioRef.current.play().catch(() => { });
    }

    setIsSoundOn(prev => !prev);
  };


  const handleGuessSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!guessInput.trim()) return setError('Please enter a guess');
    if (guessInput.length !== expectedDigits) return setError(`Guess must be exactly ${expectedDigits} digits`);
    if (!/^\d+$/.test(guessInput)) return setError('Guess must contain only digits');
    if (!isMyTurn) return setError("It's not your turn!");

    setIsSubmitting(true);
    try {
      await submitGuess(gameData.gameId, gameData.playerId, guessInput);
      setGuessInput('');
    } catch (err) {
      setError(err.message || 'Failed to submit guess.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

    <div className="game-container">
      <button
        className="sound-toggle"
        onClick={toggleSound}
        title={isSoundOn ? "Mute sound" : "Play sound"}
      >
        {isSoundOn ? "🔊" : "🔇"}
      </button>
      <button
        className="exit-toggle"
        disabled={roomStatus === "COMPLETED"}
        onClick={async () => {
          if (roomStatus === "COMPLETED") return;
          if (window.confirm("Leave game?")) {
            await endGame(gameData.gameId, gameData.playerId);
          }
        }}
      >
        🚪
      </button>
      <div className="game-card">

        {playerJoinedNotification && (
          <div className="notification notification-success">
            🎉 {sanitizeMessage(playerJoinedNotification.message)}
          </div>
        )}

        {turnNotification && (
          <div className="notification notification-info">
            {sanitizeMessage(turnNotification.message)}
            <br />
            {turnNotification.guessedNumber !== undefined && (
              <>
                Guess: {turnNotification.guessedNumber} → {turnNotification.correctDigits} correct <br />
                {turnNotification.remainingAttempts > 0 && (
                  <>{getDisplayName(turnNotification.playerId)}'s Remaining Attempts: {turnNotification.remainingAttempts}</>

                )}
              </>
            )}
          </div>
        )}

        {currentPlayerId && roomStatus === 'IN_PROGRESS' && (
          <div className="turn-indicator">
            {isMyTurn
              ? "🎯 It's YOUR turn!"
              : `⏳ Waiting for ${getDisplayName(currentPlayerId)}...`}
          </div>
        )}

        {isWaitingForPlayer && !playerJoinedNotification && (
          <div className="notification notification-warning">
            ⏳ Waiting for another player...
            <div className="room-id-row">
              <span>Room ID:</span>

              <strong className="room-id-text">
                {gameData.roomId}
              </strong>

              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(gameData.roomId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                title="Copy Room ID"
              >
                {copied ? "✅ copied" : "📋 Copy"}
              </button>
            </div>
          </div>
        )}


        {roomStatus === 'COMPLETED' && gameOverMessage && (
          <div className="notification notification-gameover">
            🏆 Game Over <br />
            {sanitizeMessage(gameOverMessage)}
          </div>
        )}

        <div className="game-grid">
          {/* Your Guesses */}
          <div className="guess-panel">
            <h3 className="guess-title">Your Guesses</h3>
            {guessHistory.filter(g => g.playerId === gameData.playerId).map((g, i) => (
              <div key={i} className="guess-entry">{g.guessedNumber} → {g.correctDigits} correct</div>
            ))}
          </div>

          {/* Center Input */}
          <div className="guess-panel">
            <h3 className="guess-title text-center">
              Player: {getDisplayName(gameData.playerId)}
            </h3>
            <p>Secret Number: {gameData.secretNumber}</p>

            {roomStatus === 'IN_PROGRESS' && (
              <form onSubmit={handleGuessSubmit}>
                <input
                  className={`guess-input ${isMyTurn ? 'guess-input-active' : ''}`}
                  type="text"
                  value={guessInput}
                  onChange={e => setGuessInput(e.target.value.replace(/\D/g, '').slice(0, expectedDigits))}
                  disabled={!isMyTurn || isSubmitting}
                />
                <button
                  type="submit"
                  disabled={!isMyTurn || isSubmitting || !guessInput}
                  className={`button-primary ${isMyTurn ? 'button-success' : ''}`}
                >
                  {isSubmitting ? 'Submitting...' : isMyTurn ? 'Submit Guess' : 'Not Your Turn'}
                </button>
              </form>
            )}

            {/* {(roomStatus === 'IN_PROGRESS' || roomStatus === 'WAITING_FOR_PLAYER') && (
  <button
    onClick={async () => { 
      if(window.confirm("Leave game?")) {
        await endGame(gameData.gameId, gameData.playerId); 
      }
    }}
    className="button-danger mt-2"
  >
    Leave Game
  </button>
)} */}
            {/* Manual tracking boxes – show only when game is in progress */}
            {roomStatus === 'IN_PROGRESS' && (
              <div className="mt-4">
                <p className="text-sm mb-2 text-gray-700">
                  Digits you have figured out:
                </p>

                <div className="flex justify-center gap-2">
                  {manualDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`manual-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleManualChange(e.target.value, index)}
                      onKeyDown={(e) => handleManualKeyDown(e, index)}
                      className="w-12 h-12 text-center text-xl border-2 border-gray-400 rounded-lg focus:outline-none focus:border-yellow-400"
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Opponent Guesses */}
          <div className="guess-panel">
            <h3 className="guess-title">Opponent's Guesses</h3>
            {guessHistory.filter(g => g.playerId !== gameData.playerId).map((g, i) => (
              <div key={i} className="guess-entry">{g.guessedNumber} → {g.correctDigits} correct</div>
            ))}
          </div>
        </div>
      </div>
      <audio ref={bgAudioRef} src={bgMusic} />
    </div>

  );
};

export default GameStarted;
