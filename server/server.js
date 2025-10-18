import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { supabase } from './config/database.js';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:3000',
    },
});

// Store game state in memory
const gameStates = {};

io.on('connection', (socket) => {
    console.log(`A new player connected: ${socket.id}`);

    socket.on('join_room', async (sessionId) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined room ${sessionId}`);

        // initialize game state for this session if not exists
        if (!gameStates[sessionId]) {
            // Fetch max_players from Supabase
            const { count, error } = await supabase
                .from('room_players')
                .select('*', {count: 'exact', head: true }) // Fetch total count of players in the room
                .eq('session_id', sessionId)

            if (error || count === null ) {
                console.error(`Error fetching player count for ${sessionId}: `, error);
                // Emit error to client
                socket.emit('error', 'Could not find player count');
                return;
            }

            gameStates[sessionId] = {
                selections: {},
                totalPlayers: count
            };
            console.log(`Initialized state for room ${sessionId} with ${count} players.`);
        }

        socket.emit('selection_update', gameStates[sessionId].selections);
    });

    socket.on('character_selected', async ({ sessionId, characterId, userId }) => {
        const roomState = gameStates[sessionId];

        if (roomState) {
            // Use the real userID from the client
            roomState.selections[userId] = characterId;

            // Broadcast the updated selections to all players in the room
            io.to(sessionId).emit('selection_update', roomState.selections);
            console.log(`Room ${sessionId} selections updated:`, roomState.selections);

            // Emit specific character selection update for gameplay screen
            io.to(sessionId).emit('character_selection_update', {
                user_id: userId,
                character_id: characterId
            });
            console.log(`Character selection update sent for user ${userId} with character ${characterId}`);

            // Check if all players are ready
            const readyPlayerCount = Object.keys(roomState.selections).length;
            if (readyPlayerCount === roomState.totalPlayers) {
                io.to(sessionId).emit('start_game');
                console.log(`ALL players are ready! Starting the game...`);

                // Clean up the game state
                delete gameStates[sessionId];
            }  
        }
    });

    socket.on('disconnect', () => {
        console.log(`A player disconnected: ${socket.id}`);
    });
});


httpServer.listen(3001,  () => {
    console.log('Server is running on port 3001');
});