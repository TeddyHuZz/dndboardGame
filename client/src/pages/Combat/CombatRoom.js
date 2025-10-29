import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useRoomSession } from '../../context/RoomSessionContext';
import { useAuth } from '../../context/AuthContext';
import EnemyInformation from '../../components/Combat/EnemyInformation';
import GameSettings from '../../components/Gameplay/GameSettings';
import OtherPlayersHP from '../../components/Gameplay/OtherPlayersHP';
import PlayerInformation from '../../components/Gameplay/PlayerInformation';
import CombatSystem from '../../components/Combat/CombatSystem';
import './CombatRoom.css';

const CombatRoom = ({ socket }) => {
    const { enemySlug } = useParams();
    const navigate = useNavigate();
    const { sessionDetails } = useRoomSession();
    const { profile } = useAuth();
    const [encounterId, setEncounterId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initializeCombat = async () => {
            // Validate session
            if (!sessionDetails?.session_id) {
                console.error('No session found');
                navigate('/game-dashboard');
                return;
            }

            try {
                // 1. Get enemy data from enemy_data table
                const { data: enemyData, error: enemyError } = await supabase
                    .from('enemy_data')
                    .select('enemy_id, enemy_name, base_hp')
                    .eq('enemy_slug', enemySlug)
                    .single();

                if (enemyError || !enemyData) {
                    setError('Enemy not found');
                    console.error('Error fetching enemy:', enemyError);
                    return;
                }

                // 2. Check if encounter already exists for this session
                const { data: existingEncounter, error: checkError } = await supabase
                    .from('room_encounters')
                    .select('encounter_id, current_hp, is_alive')
                    .eq('session_id', sessionDetails.session_id)
                    .eq('enemy_id', enemyData.enemy_id)
                    .maybeSingle();

                if (checkError) {
                    console.error('Error checking encounter:', checkError);
                }

                let finalEncounterId;

                if (existingEncounter) {
                    finalEncounterId = existingEncounter.encounter_id;
                    console.log('Existing encounter found:', finalEncounterId);
                } else {
                    // 3. Create NEW encounter in room_encounters
                    const { data: newEncounter, error: insertError } = await supabase
                        .from('room_encounters')
                        .insert({
                            session_id: sessionDetails.session_id,
                            enemy_id: enemyData.enemy_id,
                            current_hp: enemyData.base_hp,
                            max_hp: enemyData.base_hp,
                            is_alive: true
                        })
                        .select('encounter_id')
                        .single();

                    if (insertError) {
                        setError('Failed to create encounter');
                        console.error('Error creating encounter:', insertError);
                        return;
                    }

                    finalEncounterId = newEncounter.encounter_id;
                    console.log('New encounter created:', finalEncounterId);

                    // 4. Notify other players via socket
                    if (socket) {
                        socket.emit('combat_started', {
                            sessionId: sessionDetails.session_id,
                            encounterId: finalEncounterId,
                            enemyId: enemyData.enemy_id,
                            enemyName: enemyData.enemy_name
                        });
                    }
                }

                setEncounterId(finalEncounterId);
                setLoading(false);

            } catch (err) {
                console.error('Error initializing combat:', err);
                setError('Failed to initialize combat');
                setLoading(false);
            }
        };

        initializeCombat();
    }, [enemySlug, sessionDetails?.session_id, socket, navigate]);

    if (loading) {
        return <div className="combat-room">Loading combat...</div>;
    }

    if (error) {
        return (
            <div className="combat-room">
                <div className="error-message">{error}</div>
                <button onClick={() => navigate('/gameplay')}>Back to Game</button>
            </div>
        );
    }

    return (
        <div className="combat-room-information">
            <div className="combat-room-background">
                <img src="/images/banners/game-dashboard-banner.jpg" alt="Combat Room Background" />
            </div>
            <div className="combat-room-top">
                <div className="combat-room-top-right">
                    <GameSettings />
                </div>
                <div className="combat-room-top-left">
                    {encounterId && (
                        <EnemyInformation 
                            socket={socket} 
                            encounterId={encounterId} 
                        />
                    )}
                </div>
            </div>

            <div className="combat-room-side-panel">
                <OtherPlayersHP socket={socket} />
            </div>

            <div className="combat-room-middle">
                <PlayerInformation socket={socket} />
            </div>

            <div className="combat-room-bottom">
                <CombatSystem encounterId={encounterId} />
            </div>
        </div>
    );
};

export default CombatRoom;