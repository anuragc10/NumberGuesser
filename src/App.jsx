import { useState } from 'react';
import StartScreen from './components/StartScreen';
import GameStarted from './components/GameStarted';
import './App.css';

function App() {
  const [gameData, setGameData] = useState(null);

  const handleGameStart = (gameResponse) => {
    setGameData(gameResponse);
    console.log('Game started:', gameResponse);
    // TODO: Navigate to game screen in next phase
  };

  return (
    <div className="App">
      {!gameData ? (
        <StartScreen onGameStart={handleGameStart} />
      ) : (
        <GameStarted gameData={gameData} />
      )}
    </div>
  );
}

export default App;
