import { supabase } from "../config/database.js";

export const loadGamesByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("room_sessions")
      .select(
        `
        session_id,
        session_code,
        current_stage,
        updated_at,
        room_players (count)
      `
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const games = data.map((game) => ({
      session_id: game.session_id,
      session_code: game.session_code,
      current_stage: game.current_stage,
      updated_at: game.updated_at,
      player_count: game.room_players.length,
    }));

    res.json({ success: true, games });
  } catch (error) {
    console.error("Load games error:", error);
    res.status(500).json({ success: false, message: "Failed to load games" });
  }
};

export const loadGameById = async (req, res) => {
  const { sessionId } = req.params;
  console.log(`Attempting to load game with session ID: ${sessionId}`); // Log entry

  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from("room_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    // Critical: Check for errors or if no data was found
    if (sessionError) {
      console.error("Supabase error fetching session:", sessionError.message);
      throw new Error(sessionError.message);
    }
    if (!sessionData) {
      console.error(`No session found for ID: ${sessionId}`);
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    console.log("Session data found:", sessionData);

    const { data: players, error: playersError } = await supabase
      .from("room_players")
      .select("*")
      .eq("session_id", sessionId);

    if (playersError) {
      console.error("Supabase error fetching players:", playersError.message);
      throw new Error(playersError.message);
    }

    console.log(`Found ${players.length} players for session.`);

    res.json({ success: true, sessionDetails: sessionData, players });
  } catch (error) {
    console.error(`Overall error in loadGameById for ${sessionId}:`, error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to load game due to a server error.",
      });
  }
};
