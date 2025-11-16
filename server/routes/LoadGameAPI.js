import { supabase } from "../config/database.js";

export const loadGamesByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: playerSessions, error: playerError } = await supabase
      .from("room_players")
      .select("session_id")
      .eq("user_id", userId);

    if (playerError) throw playerError;
    if (!playerSessions || playerSessions.length === 0) {
      return res.json({ success: true, games: [] });
    }

    const sessionIds = playerSessions.map((ps) => ps.session_id);

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
      .in("session_id", sessionIds)
      .eq("is_game_saved", true) 
      .eq("session_status", "In game") 
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const games = data.map((game) => ({
      ...game,
      player_count: game.room_players[0]?.count || 0, 
    }));

    res.json({ success: true, games });
  } catch (error) {
    console.error("Error loading games by user:", error);
    res.status(500).json({ success: false, message: "Failed to load games" });
  }
};

export const loadGameById = async (req, res) => {
  const { sessionId } = req.params;
  console.log(`Attempting to load game with session ID: ${sessionId}`); 

  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from("room_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

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
    res.status(500).json({
      success: false,
      message: "Failed to load game due to a server error.",
    });
  }
};
