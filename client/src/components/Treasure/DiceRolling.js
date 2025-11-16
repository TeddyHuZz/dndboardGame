import React, { useState } from "react";
import "./DiceRolling.css";

const DiceRolling = ({ encounterId, onResult }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const rollDice = () => {
    if (isRolling) return;

    setIsRolling(true);
    setShowResult(false);
    setResult(null);

    setTimeout(() => {
      const rolledNumber = Math.floor(Math.random() * 21);
      const outcome = rolledNumber > 10 ? "win" : "lose";

      setResult({
        number: rolledNumber,
        outcome: outcome,
      });

      setIsRolling(false);
      setShowResult(true);

      onResult(outcome);
    }, 2000);
  };

  return (
    <div className="dice-rolling-container">
      <div className="dice-rolling-card">
        <h1 className="dice-rolling-title">Roll for Treasure!</h1>
        <p className="dice-rolling-subtitle">Roll higher than 10 to win!</p>

        <div className="dice-container">
          <div className={`dice ${isRolling ? "rolling" : ""}`}>
            <img
              src="/images/treasure/DND-dice.png"
              alt="D20 Dice"
              className="dice-image"
            />
          </div>

          {showResult && (
            <div className={`dice-result ${result?.outcome}`}>
              <div className="result-number">{result?.number}</div>
              <div className="result-text">
                {result?.outcome === "win" ? "SUCCESS!" : "FAILURE!"}
              </div>
            </div>
          )}
        </div>

        {!isRolling && !showResult && (
          <button onClick={rollDice} className="roll-button">
            🎲 Roll the Dice
          </button>
        )}

        {isRolling && <div className="rolling-text">Rolling...</div>}

        {showResult && (
          <div className={`outcome-message ${result?.outcome}`}>
            {result?.outcome === "win"
              ? "✨ You found treasure! ✨"
              : "💀 The chest is a trap! 💀"}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiceRolling;
