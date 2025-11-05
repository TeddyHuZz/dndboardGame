import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { supabase } from "./config/database.js";
import { saveGame } from "./routes/SaveGameAPI.js";
import { loadGamesByUser, loadGameById } from "./routes/LoadGameAPI.js";

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Add the save game route
app.post("/api/games/save", saveGame);
app.get("/api/games/load/:userId", loadGamesByUser);
app.get("/api/games/session/:sessionId", loadGameById);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://realmquest.vercel.app"],
  },
});

// Store game state in memory
const gameStates = {};

io.on("connection", (socket) => {
  console.log(`A new player connected: ${socket.id}`);

  socket.on("join_room", async (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined room ${sessionId}`);

    // Count current players
    const { count: currentPlayerCount, error: countError } = await supabase
      .from("room_players")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (countError || currentPlayerCount === null) {
      console.error(
        `Error fetching player count for ${sessionId}: `,
        countError
      );
      socket.emit("error", "Could not find player count");
      return;
    }

    // Initialize OR update game state
    if (!gameStates[sessionId]) {
      gameStates[sessionId] = {
        selections: {},
        totalPlayers: currentPlayerCount,
      };
      console.log(
        `Initialized state for room ${sessionId} with ${currentPlayerCount} players.`
      );
    } else {
      // Update the player count for existing state
      gameStates[sessionId].totalPlayers = currentPlayerCount;
      console.log(
        `Updated state for room ${sessionId} to ${currentPlayerCount} players.`
      );
    }

    // Send current selections to the newly joined player
    socket.emit("selection_update", gameStates[sessionId].selections);
  });

  socket.on(
    "character_selected",
    async ({ sessionId, characterId, userId }) => {
      const roomState = gameStates[sessionId];

      if (roomState) {
        // Use the real userID from the client
        roomState.selections[userId] = characterId;

        // Broadcast the updated selections to all players in the room
        io.to(sessionId).emit("selection_update", roomState.selections);
        console.log(
          `Room ${sessionId} selections updated:`,
          roomState.selections
        );

        // Emit specific character selection update for gameplay screen
        io.to(sessionId).emit("character_selection_update", {
          user_id: userId,
          character_id: characterId,
        });
        console.log(
          `Character selection update sent for user ${userId} with character ${characterId}`
        );

        // Check if all players are ready
        const readyPlayerCount = Object.keys(roomState.selections).length;
        if (readyPlayerCount === roomState.totalPlayers) {
          console.log(`ALL players are ready! Starting the game in 500ms...`);

          // ✅ Add small delay to ensure DB writes complete
          setTimeout(() => {
            io.to(sessionId).emit("start_game");
            console.log(`Game started for room ${sessionId}`);
            delete gameStates[sessionId];
          }, 500);
        }
      }
    }
  );

  // Add this new socket event handler in server.js
  socket.on("qr_code_scanned", ({ sessionId, path, scannedBy }) => {
    console.log(
      `QR code scanned by ${scannedBy} in session ${sessionId}, navigating all players to ${path}`
    );

    // Broadcast to ALL players in the session
    io.to(sessionId).emit("navigate_to_page", {
      path: path,
      scannedBy: scannedBy,
    });
  });

  socket.on("update_enemy_hp", async (data) => {
    const { encounterId, newHp } = data;

    try {
      // First, get the encounter to find the session_id
      const { data: encounterData, error: fetchError } = await supabase
        .from("room_encounters")
        .select("session_id, max_hp")
        .eq("encounter_id", encounterId)
        .single();

      if (fetchError || !encounterData) {
        console.error(`Error fetching encounter ${encounterId}:`, fetchError);
        return;
      }

      // Then update the HP
      const { error: updateError } = await supabase
        .from("room_encounters")
        .update({
          current_hp: newHp,
          is_alive: newHp > 0,
        })
        .eq("encounter_id", encounterId);

      if (updateError) {
        console.error(
          `Error updating enemy HP for encounter ${encounterId}:`,
          updateError
        );
        return;
      }

      console.log(
        `Updated encounter ${encounterId} HP to ${newHp} for session ${encounterData.session_id}`
      );

      // Emit to all players in the session
      io.to(encounterData.session_id.toString()).emit("enemy_hp_update", {
        encounter_id: encounterId,
        current_hp: newHp,
        max_hp: encounterData.max_hp,
        is_alive: newHp > 0,
      });
    } catch (err) {
      console.error("Error in update_enemy_hp handler:", err);
    }
  });

  socket.on("update_player_hp", async (data) => {
    const { sessionId, userId, newHp } = data;

    try {
      console.log(
        `Updating player ${userId} HP to ${newHp} in session ${sessionId}`
      );

      // Update the player HP
      const { error: updateError } = await supabase
        .from("room_players")
        .update({
          current_hp: newHp,
        })
        .eq("session_id", sessionId)
        .eq("user_id", userId);

      if (updateError) {
        console.error(
          `Error updating player HP for user ${userId}:`,
          updateError
        );
        return;
      }

      console.log(`Successfully updated player ${userId} HP to ${newHp}`);

      // Emit to all players in the session
      io.to(sessionId.toString()).emit("player_hp_update", {
        user_id: userId,
        current_hp: newHp,
        is_alive: newHp > 0,
      });
    } catch (err) {
      console.error("Error in update_player_hp handler:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`A player disconnected: ${socket.id}`);
  });
});

httpServer.listen(3001, () => {
  console.log("Server is running on port 3001");
});
