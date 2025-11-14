import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { supabase } from "./config/database.js";
import { saveGame } from "./routes/SaveGameAPI.js";
import { loadGamesByUser, loadGameById } from "./routes/LoadGameAPI.js";

const app = express();
const httpServer = createServer(app);

// Dynamic CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://realmquest.vercel.app",
  process.env.FRONTEND_URL, // Add this to Render env vars
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in whitelist or matches pattern
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Add the save game route
app.post("/api/games/save", saveGame);
app.get("/api/games/load/:userId", loadGamesByUser);
app.get("/api/games/session/:sessionId", loadGameById);

const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        console.log(`Socket CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // Important for Render
  pingTimeout: 60000, // Increase timeout for Render
  pingInterval: 25000,
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

  socket.on("qr_code_scanned", async (data) => {
    const { sessionId, path } = data;

    console.log(`[QR Scan] Received path: ${path} for session: ${sessionId}`);

    // FIXED: Determine if this is a combat or treasure encounter
    const pathParts = path.split("/").filter(Boolean);
    const encounterType = pathParts[0]; // "combat" or "treasure"
    const encounterSlug = pathParts[1]; // The slug/ID

    console.log(`[QR Scan] Type: ${encounterType}, Slug: ${encounterSlug}`);

    // Handle TREASURE encounters
    if (encounterType === "treasure") {
      console.log(
        `[QR Scan] Treasure room detected, broadcasting to all players...`
      );
      // FIXED: Broadcast to ALL players in the session
      io.to(sessionId).emit("navigate_to_page", {
        path: `/treasure/${encounterSlug}`,
        scannedBy: socket.id,
      });
      return;
    }

    // Handle COMBAT encounters (original logic)
    if (encounterType === "combat") {
      const enemySlug = encounterSlug;

      try {
        const { data: existingEncounter, error: encounterError } = await supabase
          .from("room_encounters")
          .select("encounter_id, is_alive")
          .eq("session_id", sessionId)
          .eq("enemy_slug", enemySlug)
          .single();

        if (existingEncounter) {
          if (!existingEncounter.is_alive) {
            console.log(
              `Encounter with slug ${enemySlug} is defeated. Notifying user.`
            );
            socket.emit("show_notification", {
              message: "This enemy has already been defeated!",
            });
          } else {
            console.log(
              `Encounter with slug ${enemySlug} is alive. Broadcasting to all players...`
            );
            // FIXED: Broadcast to ALL players in the session
            io.to(sessionId).emit("navigate_to_page", {
              path: `/combat/${existingEncounter.encounter_id}`,
              scannedBy: socket.id,
            });
          }
        } else {
          console.log(
            `No encounter found for slug ${enemySlug}. Creating new encounter.`
          );

          console.log(
            `[DEBUG] Querying enemy_data for enemy_slug: '${enemySlug}'`
          );

          const { data: enemyData, error: enemyDataError } = await supabase
            .from("enemy_data")
            .select("enemy_id, base_hp")
            .eq("enemy_slug", enemySlug)
            .single();

          if (enemyDataError || !enemyData) {
            console.error(
              `[ERROR] Supabase query failed for slug '${enemySlug}'. Error:`,
              enemyDataError
            );
            return socket.emit("show_notification", {
              message: `Enemy '${enemySlug}' not found.`,
            });
          }

          const { data: newEncounter, error: insertError } = await supabase
            .from("room_encounters")
            .insert({
              session_id: sessionId,
              enemy_id: enemyData.enemy_id,
              max_hp: enemyData.base_hp,
              current_hp: enemyData.base_hp,
              is_alive: true,
              enemy_slug: enemySlug,
            })
            .select("encounter_id")
            .single();

          if (insertError) {
            console.error("Error creating new encounter:", insertError);
            return socket.emit("show_notification", {
              message: "Failed to create encounter.",
            });
          }

          console.log(
            `New encounter created with ID: ${newEncounter.encounter_id}. Broadcasting to all players...`
          );
          // FIXED: Broadcast to ALL players in the session
          io.to(sessionId).emit("navigate_to_page", {
            path: `/combat/${newEncounter.encounter_id}`,
            scannedBy: socket.id,
          });
        }
      } catch (error) {
        if (error.code !== "PGRST116") {
          // Ignore "single row not found" errors
          console.error("Error in qr_code_scanned handler:", error);
        }
      }
    } else {
      // Unknown encounter type
      console.error(`[ERROR] Unknown encounter type: ${encounterType}`);
      socket.emit("show_notification", {
        message: `Unknown QR code type: ${encounterType}`,
      });
    }
  });

  socket.on("update_enemy_hp", async (data) => {
    const { encounterId, newHp } = data;
    console.log(
      `[Server] Enemy HP update: Encounter ${encounterId} -> ${newHp} HP`
    );

    // Get the session ID for this encounter
    const { data: encounterData } = await supabase
      .from("room_encounters")
      .select("session_id")
      .eq("encounter_id", encounterId)
      .single();

    if (encounterData) {
      // Broadcast to all clients in this session
      io.to(encounterData.session_id).emit("enemy_hp_update", {
        encounterId,
        newHp,
      });

      // ✅ If enemy is defeated, broadcast victory to all players
      if (newHp <= 0) {
        console.log(
          `🎉 [Server] Enemy defeated! Broadcasting victory to session ${encounterData.session_id}`
        );
        io.to(encounterData.session_id).emit("combat_victory", {
          encounterId,
        });
      }
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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
