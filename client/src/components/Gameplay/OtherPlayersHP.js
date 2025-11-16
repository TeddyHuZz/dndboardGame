import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import "./OtherPlayersHP.css";

const OtherPlayersHP = ({ socket }) => {
    const { sessionDetails } = useRoomSession();
    const { profile } = useAuth();
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        const fetchPlayers = async () => {
            if (!sessionDetails?.session_id) return;

            const { data: playersData, error: playersError } = await supabase
                .from('room_players')
                .select('user_id, current_hp, max_hp, character_id')
                .eq('session_id', sessionDetails.session_id);

            if (playersError) {
                console.error("Error fetching players:", playersError);
                return;
            }

            console.log("Players data:", playersData);

            const userIds = playersData.map(p => p.user_id);
            const { data: usersData, error: usersError } = await supabase
                .from('user')
                .select('user_id, username')
                .in('user_id', userIds);

            if (usersError) {
                console.error("Error fetching users:", usersError);
                return;
            }

            console.log("Users data:", usersData);

            const playersWithUsernames = playersData.map(player => ({
                ...player,
                user: usersData.find(u => u.user_id === player.user_id)
            }));

            const otherPlayers = playersWithUsernames.filter(p => p.user_id !== profile?.user_id);
            console.log("Final other players:", otherPlayers);
            setPlayers(otherPlayers);
        };

        fetchPlayers();
    }, [sessionDetails?.session_id, profile?.user_id]);

    useEffect(() => {
        if (!socket) return;

        socket.on('player_hp_update', (updatedPlayer) => {
            setPlayers(prevPlayers => 
                prevPlayers.map(player => 
                    player.user_id === updatedPlayer.user_id 
                        ? { 
                            ...player, 
                            current_hp: updatedPlayer.current_hp,
                            max_hp: updatedPlayer.max_hp 
                          }
                        : player
                )
            );
        });

        return () => {
            socket.off('player_hp_update');
        };
    }, [socket]);

    return (
        <div className="other-players-hp">
            <h3>Teammates</h3>
            {players.length === 0 ? (
                <p>You are a lone wolf.</p>
            ) : (
                players.map((player) => (
                    <div key={player.user_id} className="player-hp-card">
                        <div className="player-info">
                            <p className="player-username">{player.user?.username || 'Unknown'}</p>
                            <div className="hp-bar-container">
                                <div 
                                    className="hp-bar-fill" 
                                    style={{ 
                                        width: `${(player.current_hp / player.max_hp) * 100}%` 
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default OtherPlayersHP;