const saveGameState = async (gameData) => {
  try {
    const response = await fetch("http://localhost:3001/api/games/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: gameData.sessionId,
        playerStates: gameData.players.map((player) => ({
          playerId: player.player_id,
          userId: player.user_id,
          characterId: player.character_id,
          currentHp: player.current_hp,
          maxHp: player.max_hp,
          isAlive: player.current_hp > 0,
        })),
        timestamp: new Date().toISOString(),
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Save failed:", error);
    return null;
  }
};

export default saveGameState;
