import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../../supabaseClient';
import { useRoomSession } from '../../context/RoomSessionContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import './CombatSystem.css';
import CodeEditorWindow from './CodeEditorWindow';

const CombatSystem = ({ encounterId }) => {
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [question, setQuestion] = useState(null); // Add state for question
    const { sessionDetails } = useRoomSession();
    const { profile } = useAuth();
    const { socket } = useSocket();

    // Fetch question once when component mounts
    const fetchPythonQuestion = async () => {
        try {
            // Get a random question
            const { data: allQuestions, error: countError } = await supabase
                .from('python_questions')
                .select('python_id');
    
            if (countError || !allQuestions || allQuestions.length === 0) {
                console.error('Error fetching questions:', countError);
                return;
            }
    
            // Pick a random question ID
            const randomIndex = Math.floor(Math.random() * allQuestions.length);
            const randomId = allQuestions[randomIndex].python_id;
    
            // Fetch that specific question
            const { data, error } = await supabase
                .from('python_questions')
                .select('python_text, python_time_limit, python_answer, python_id')
                .eq('python_id', randomId)
                .single();
    
            if (error) {
                console.error('Error fetching Python question:', error);
                return;
            }
    
            setQuestion(data);
            setCode(''); // Reset code editor
            setOutput(''); // Reset output
            setError(''); // Reset error
            console.log('Question loaded:', data);
        } catch (err) {
            console.error('Error in fetchPythonQuestion:', err);
        }
    };

    // Fetch question once when component mounts
    useEffect(() => {
        fetchPythonQuestion();
    }, []);

    const runCode = async () => {
        // Validate code is not empty
        if (!code || code.trim() === '') {
            setError('Please enter some code before running.');
            return;
        }
    
        console.log('Running code:', code);
        setIsLoading(true);
        setError("");
        setOutput("");
    
        const options = {
            method: 'POST',
            url: 'https://ce.judge0.com/submissions',
            params: {
                base64_encoded: 'false',
                wait: 'false',  // Important: don't wait in initial request
                fields: '*'
            },
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': process.env.REACT_APP_RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            data: {
                language_id: 71,  // Python 3
                source_code: code,
                stdin: ""  // Add empty stdin
            }
        };
    
        try {
            console.log('Submitting code to Judge0...');
            const response = await axios.request(options);
            const token = response.data.token;
            
            console.log('Submission token:', token);
    
            // Poll for the result
            let resultResponse;
            let attempts = 0;
            const maxAttempts = 10;
            
            do {
                await new Promise(resolve => setTimeout(resolve, 1000));
                resultResponse = await axios.request({
                    method: 'GET',
                    url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
                    params: {
                        base64_encoded: 'false',
                        fields: '*'
                    },
                    headers: {
                        'X-RapidAPI-Key': process.env.REACT_APP_RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                    }
                });
                
                attempts++;
                console.log('Polling attempt:', attempts, 'Status:', resultResponse.data.status?.description);
                
                if (attempts >= maxAttempts) {
                    throw new Error('Code execution timeout');
                }
            } while (resultResponse.data.status.id <= 2);
    
            console.log('Execution complete:', resultResponse.data);
    
            if (resultResponse.data.status.id === 3) {
                // Status 3 means ran successfully
                const codeOutput = resultResponse.data.stdout?.trim();
                setOutput(codeOutput || '(no output)');
    
                // Compare with stored question answer
                if (question && codeOutput === question.python_answer?.trim()) {
                    onCorrectAnswer();
                } else {
                    onWrongAnswer();
                }
            } else {
                // Handle other statuses
                const errorMsg = resultResponse.data.stderr || 
                               resultResponse.data.compile_output || 
                               resultResponse.data.status.description ||
                               "An error has occurred.";
                setError(errorMsg);
            }
        } catch (err) {
            console.error('Error running code:', err);
            
            if (err.response) {
                console.error('Response data:', err.response.data);
                console.error('Response status:', err.response.status);
                setError(`API Error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
            } else if (err.request) {
                setError('No response from code execution service. Check your internet connection.');
            } else {
                setError(`Error: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePlayerDamage = async () => {
        try {
            // 1. Get current player's character information
            const { data: playerData, error: playerError } = await supabase
                .from('room_players')
                .select('character_id')
                .eq('session_id', sessionDetails.session_id)
                .eq('user_id', profile.user_id)
                .single();

            if (playerError || !playerData) {
                console.error('Error fetching player data:', playerError);
                return;
            }

            // 2. Get character damage
            const { data: characterData, error: characterError } = await supabase
                .from('character_classes')
                .select('base_attack')
                .eq('character_id', playerData.character_id)
                .single();

            if (characterError || !characterData) {
                console.error('Error fetching character damage:', characterError);
                return;
            }

            const playerDamage = characterData.base_attack;

            // 3. Get current enemy HP
            const { data: encounterData, error: encounterError } = await supabase
                .from('room_encounters')
                .select('current_hp')
                .eq('encounter_id', encounterId)
                .single();

            if (encounterError || !encounterData) {
                console.error('Error fetching encounter data:', encounterError);
                return;
            }

            // 4. Calculate new HP
            const newHp = Math.max(0, encounterData.current_hp - playerDamage);

            // 5. Update enemy HP via socket
            if (socket) {
                socket.emit('update_enemy_hp', {
                    encounterId: encounterId,
                    newHp: newHp
                });
            }

            console.log(`Dealt ${playerDamage} damage! Enemy HP: ${encounterData.current_hp} → ${newHp}`);

        } catch (error) {
            console.error('Error handling correct answer:', error);
        }
    };

    const calculateEnemyDamage = async () => {
        try {
            // 1. Get current enemy's character information
            const { data: enemyData, error: enemyError } = await supabase
                .from('room_encounters')
                .select('enemy_id')
                .eq('encounter_id', encounterId)
                .single();

            if (enemyError || !enemyData) {
                console.error('Error fetching enemy data:', enemyError);
                return;
            }

            // 2. Get enemy damage
            const { data: enemyDamageData, error: enemyDamageError } = await supabase
                .from('enemy_data')
                .select('base_attack')
                .eq('enemy_id', enemyData.enemy_id)
                .single();

            if (enemyDamageError || !enemyDamageData) {
                console.error('Error fetching enemy damage:', enemyDamageError);
                return;
            }

            const enemyDamage = enemyDamageData.base_attack;

            // 3. Get current player HP
            const { data: playerData, error: playerError } = await supabase
                .from('room_players')
                .select('current_hp')
                .eq('session_id', sessionDetails.session_id)
                .eq('user_id', profile.user_id)
                .single();

            if (playerError || !playerData) {
                console.error('Error fetching player data:', playerError);
                return;
            }

            // 4. Calculate new HP
            const newHp = Math.max(0, playerData.current_hp - enemyDamage);

            // 5. Update player HP via socket
            if (socket) {
                socket.emit('update_player_hp', {
                    sessionId: sessionDetails.session_id,
                    userId: profile.user_id,
                    newHp: newHp
                });
            }

            console.log(`Dealt ${enemyDamage} damage! Player HP: ${playerData.current_hp} → ${newHp}`);

        } catch (error) {
            console.error('Error handling wrong answer:', error);
        }
    };

    const onCorrectAnswer = async () => {
        console.log("Correct answer!");
        
        // Show success message
        setOutput("Correct! Dealing damage to enemy...");
        
        // Deal damage
        await calculatePlayerDamage();
        
        // Wait a moment so user can see the success message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Fetch new question
        await fetchPythonQuestion();
        
        console.log("New question loaded!");
    };

    const onWrongAnswer = async () => {
        console.log("Wrong answer!");
        
        // Show success message
        setOutput("Wrong answer! Receiving damage from enemy...");
        
        // Deal damage
        await calculateEnemyDamage();
        
        // Wait a moment so user can see the failure message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Fetch new question
        await fetchPythonQuestion();
        
        console.log("New question loaded!");
    };

    return (
        <div className="combat-system-container">
            <div className="combat-system-question">
                {question && (
                    <div className="combat-system-question-text">
                        <p>{question.python_text}</p>
                        <p>Time Limit: {question.python_time_limit} seconds</p>
                    </div>
                )}

                <div className="editor-output-container">
                    <div className="editor-wrapper">
                        <CodeEditorWindow 
                            code={code}
                            onChange={setCode}
                        />
                    </div>
                    <div className="output-wrapper">
                        <h4>Output:</h4>
                        <pre>
                            {error ? <span className="error">{error}</span> : output}
                        </pre>
                    </div>
                </div>
                <button onClick={runCode} disabled={isLoading}>
                    {isLoading ? 'Running...' : 'Run Code'}
                </button>
            </div>
        </div>
    );
};

export default CombatSystem;