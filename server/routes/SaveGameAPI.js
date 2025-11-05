import { supabase } from "../config/database.js";

export const saveGame = async (req, res) => {
  const { sessionId, playerStates, timestamp } = req.body;

  if (!sessionId || !playerStates) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  try {
    // Use a transaction to update all players
    const updates = playerStates.map((player) =>
      supabase
        .from("room_players")
        .update({
          current_hp: player.currentHp,
          // Add any other fields you want to save here
        })
        .eq("player_id", player.playerId)
    );

    const results = await Promise.all(updates);

    // Check for errors in the transaction
    const error = results.find((result) => result.error);
    if (error) throw error.error;

    // Update the session's timestamp
    await supabase
      .from("room_sessions")
      .update({ updated_at: timestamp })
      .eq("session_id", sessionId);

    // **The Fix**: Fetch the newly updated player data to send back
    const { data: updatedPlayers, error: fetchError } = await supabase
      .from("room_players")
      .select("*")
      .eq("session_id", sessionId);

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      message: "Game saved successfully",
      updatedPlayers: updatedPlayers, // Send back the current state
    });
  } catch (error) {
    console.error("Error saving game:", error);
    res.status(500).json({ success: false, message: "Failed to save game" });
  }
};
