import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import "./PlayerInformation.css";

const PlayerInformation = ({ socket }) => {
    const { sessionDetails } = useRoomSession();
    const { profile } = useAuth();
    const [player, setPlayer] = useState(null);
    const [otherPlayers, setOtherPlayers] = useState([]);

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!sessionDetails?.session_id || !profile?.user_id) return;

            const { data: playerData, error: playerError } = await supabase
                .from('room_players')
                .select('user_id, current_hp, max_hp, character_id')
                .eq('session_id', sessionDetails.session_id)
                .eq('user_id', profile.user_id)
                .single();

            if (playerError) {
                console.error("Error fetching player:", playerError);
                return;
            }

            if (playerData.character_id) {
                const { data: characterData, error: characterError } = await supabase
                    .from('character_classes')
                    .select('character_image, character_name')
                    .eq('character_id', playerData.character_id)
                    .single();

                if (characterError) {
                    console.error("Error fetching character:", characterError);
                } else {
                    playerData.character_image = characterData.character_image;
                    playerData.character_name = characterData.character_name;
                }
            }

            const { data: userData, error: userError } = await supabase
                .from('user')
                .select('username')
                .eq('user_id', profile.user_id)
                .single();

            if (userError) {
                console.error("Error fetching user:", userError);
            } else {
                playerData.username = userData.username;
            }

            setPlayer(playerData);
        };

        fetchPlayer();
    }, [sessionDetails?.session_id, profile?.user_id]);

    useEffect(() => {
        const fetchOtherPlayers = async () => {
            if (!sessionDetails?.session_id || !profile?.user_id) return;

            const { data: playersData, error: playersError } = await supabase
                .from('room_players')
                .select('user_id, character_id')
                .eq('session_id', sessionDetails.session_id)
                .neq('user_id', profile.user_id);

            if (playersError) {
                console.error("Error fetching other players:", playersError);
                return;
            }

            const playersWithCharacters = await Promise.all(
                playersData.map(async (player) => {
                    if (player.character_id) {
                        const { data: characterData, error: characterError } = await supabase
                            .from('character_classes')
                            .select('character_image, character_name')
                            .eq('character_id', player.character_id)
                            .single();

                        if (characterError) {
                            console.error("Error fetching character:", characterError);
                            return { ...player, character_image: null, character_name: null };
                        }
                        
                        return {
                            ...player,
                            character_image: characterData.character_image,
                            character_name: characterData.character_name
                        };
                    }
                    return { ...player, character_image: null, character_name: null };
                })
            );

            setOtherPlayers(playersWithCharacters);
        };

        fetchOtherPlayers();
    }, [sessionDetails?.session_id, profile?.user_id]);

    useEffect(() => {
        if (!sessionDetails?.session_id || !profile?.user_id) return;

        // Subscribe to realtime changes for this player
        const channel = supabase
            .channel(`player_hp:${profile.user_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'room_players',
                    filter: `user_id=eq.${profile.user_id}`
                },
                (payload) => {
                    console.log('Player HP updated via realtime:', payload);
                    setPlayer(prevPlayer => ({
                        ...prevPlayer,
                        current_hp: payload.new.current_hp,
                        max_hp: payload.new.max_hp
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionDetails?.session_id, profile?.user_id]);

    useEffect(() => {
        if (!socket) return;

        // Listen for HP updates
        socket.on('player_hp_update', (updatedPlayer) => {
            if (updatedPlayer.user_id === profile?.user_id) {
                setPlayer(prevPlayer => ({
                    ...prevPlayer,
                    current_hp: updatedPlayer.current_hp,
                    max_hp: updatedPlayer.max_hp
                }));
            }
        });

        // Listen for character selection updates
        socket.on('character_selection_update', async (updatedPlayer) => {
            console.log('Received character selection update:', updatedPlayer);
            
            // Update other players if someone else selected a character
            if (updatedPlayer.user_id !== profile?.user_id) {
                const { data: characterData, error: characterError } = await supabase
                    .from('character_classes')
                    .select('character_image, character_name')
                    .eq('character_id', updatedPlayer.character_id)
                    .single();

                if (!characterError && characterData) {
                    setOtherPlayers(prevPlayers => {
                        const existingPlayerIndex = prevPlayers.findIndex(p => p.user_id === updatedPlayer.user_id);
                        
                        if (existingPlayerIndex !== -1) {
                            // Update existing player
                            const newPlayers = [...prevPlayers];
                            newPlayers[existingPlayerIndex] = {
                                ...newPlayers[existingPlayerIndex],
                                character_id: updatedPlayer.character_id,
                                character_image: characterData.character_image,
                                character_name: characterData.character_name
                            };
                            return newPlayers;
                        } else {
                            // Add new player (shouldn't happen normally, but just in case)
                            return [...prevPlayers, {
                                user_id: updatedPlayer.user_id,
                                character_id: updatedPlayer.character_id,
                                character_image: characterData.character_image,
                                character_name: characterData.character_name
                            }];
                        }
                    });
                }
            } else {
                // Update current player if they selected a character
                const { data: characterData, error: characterError } = await supabase
                    .from('character_classes')
                    .select('character_image, character_name')
                    .eq('character_id', updatedPlayer.character_id)
                    .single();

                if (!characterError && characterData) {
                    setPlayer(prevPlayer => ({
                        ...prevPlayer,
                        character_id: updatedPlayer.character_id,
                        character_image: characterData.character_image,
                        character_name: characterData.character_name
                    }));
                }
            }
        });

        return () => {
            socket.off('player_hp_update');
            socket.off('character_selection_update');
        };
    }, [socket, profile?.user_id]);

    if (!player) {
        return (
            <div className="player-information">
                <p>Loading player information...</p>
            </div>
        );
    }

    return (
        <div className="player-information">
            <div className="characters-container">
                {/* Main Player Character Image */}
                {player.character_image ? (
                    <div className="player-character-image">
                        <img src={player.character_image} alt={player.character_name || "Player Character"} />
                    </div>
                ) : (
                    <div className="no-character">
                        <p>No character selected</p>
                    </div>
                )}
                
                {/* Other Players' Character Images */}
                {otherPlayers.length > 0 && (
                    <div className="other-players-characters">
                        {otherPlayers.map((otherPlayer) => (
                            otherPlayer.character_image && (
                                <div key={otherPlayer.user_id} className="other-character-image">
                                    <img 
                                        src={otherPlayer.character_image} 
                                        alt={otherPlayer.character_name || "Character"} 
                                    />
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>

            <div className="player-details">
                <div className="player-header">
                    <h2>{player.username || 'Player'}</h2>
                </div>

                {player.current_hp !== null && player.max_hp !== null ? (
                    <div className="player-hp-section">
                        <div className="hp-bar-container">
                            <div
                                className="hp-bar-fill"
                                style={{
                                    width: `${(player.current_hp / player.max_hp) * 100}%`
                                }}
                            />
                        </div>
                        <p className="hp-text">{player.current_hp} / {player.max_hp} HP</p>
                    </div>
                ) : (
                    <p className="no-hp">Select a character to begin</p>
                )}
            </div>
        </div>
    );
};

export default PlayerInformation;