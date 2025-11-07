import { supabase } from "../config/database.js";

export const saveGame = async (req, res) => {
  const { sessionId, playerStates, timestamp } = req.body;

  if (!sessionId || !playerStates) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  try {
    // Step 1: Update player states
    const playerUpdates = playerStates.map((player) =>
      supabase
        .from("room_players")
        .update({ current_hp: player.currentHp })
        .eq("player_id", player.playerId)
    );
    const playerResults = await Promise.all(playerUpdates);
    const playerError = playerResults.find((result) => result.error);
    if (playerError) throw playerError.error;

    // Step 2: Update the session's timestamp and saved status
    console.log(`Updating room_session ${sessionId} to is_game_saved: true`); // Add log
    const { error: sessionError } = await supabase
      .from("room_sessions")
      .update({
        updated_at: timestamp,
        is_game_saved: true,
      })
      .eq("session_id", sessionId);

    // --- FIX: Explicitly check for an error on the session update ---
    if (sessionError) {
      console.error(`Error updating room_session ${sessionId}:`, sessionError);
      throw new Error("Failed to update the session status.");
    }
    console.log(`Successfully updated room_session ${sessionId}.`); // Add success log

    // Step 3: Fetch the updated player data to send back
    const { data: updatedPlayers, error: fetchError } = await supabase
      .from("room_players")
      .select("*")
      .eq("session_id", sessionId);

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      message: "Game saved successfully",
      updatedPlayers: updatedPlayers,
    });
  } catch (error) {
    console.error("Error during saveGame process:", error.message);
    res.status(500).json({ success: false, message: "Failed to save game" });
  }
};
