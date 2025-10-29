import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import "./CombatSystem.css";
import CodeEditorWindow from "./CodeEditorWindow";

const CombatSystem = ({ encounterId }) => {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState(null);
  const [combatResult, setCombatResult] = useState(null); // 'victory', 'defeat', or null
  const { sessionDetails } = useRoomSession();
  const { profile } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Fetch question once when component mounts
  const fetchPythonQuestion = async () => {
    try {
      // Get a random question
      const { data: allQuestions, error: countError } = await supabase
        .from("python_questions")
        .select("python_id");

      if (countError || !allQuestions || allQuestions.length === 0) {
        console.error("Error fetching questions:", countError);
        return;
      }

      // Pick a random question ID
      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      const randomId = allQuestions[randomIndex].python_id;

      // Fetch that specific question
      const { data, error } = await supabase
        .from("python_questions")
        .select("python_text, python_time_limit, python_answer, python_id")
        .eq("python_id", randomId)
        .single();

      if (error) {
        console.error("Error fetching Python question:", error);
        return;
      }

      setQuestion(data);
      setCode("");
      setOutput("");
      setError("");
      console.log("Question loaded:", data);
    } catch (err) {
      console.error("Error in fetchPythonQuestion:", err);
    }
  };

  // Fetch question once when component mounts
  useEffect(() => {
    fetchPythonQuestion();
  }, []);

  const runCode = async () => {
    if (!code || code.trim() === "") {
      setError("Please enter some code before running.");
      return;
    }

    console.log("Running code:", code);
    setIsLoading(true);
    setError("");
    setOutput("");

    const options = {
      method: "POST",
      url: "https://ce.judge0.com/submissions",
      params: {
        base64_encoded: "false",
        wait: "false",
        fields: "*",
      },
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.REACT_APP_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      data: {
        language_id: 71,
        source_code: code,
        stdin: "",
      },
    };

    try {
      console.log("Submitting code to Judge0...");
      const response = await axios.request(options);
      const token = response.data.token;

      console.log("Submission token:", token);

      let resultResponse;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        resultResponse = await axios.request({
          method: "GET",
          url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
          params: {
            base64_encoded: "false",
            fields: "*",
          },
          headers: {
            "X-RapidAPI-Key": process.env.REACT_APP_RAPIDAPI_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
        });

        attempts++;
        console.log(
          "Polling attempt:",
          attempts,
          "Status:",
          resultResponse.data.status?.description
        );

        if (attempts >= maxAttempts) {
          throw new Error("Code execution timeout");
        }
      } while (resultResponse.data.status.id <= 2);

      console.log("Execution complete:", resultResponse.data);

      if (resultResponse.data.status.id === 3) {
        const codeOutput = resultResponse.data.stdout?.trim();
        setOutput(codeOutput || "(no output)");

        if (question && codeOutput === question.python_answer?.trim()) {
          onCorrectAnswer();
        } else {
          onWrongAnswer();
        }
      } else {
        const errorMsg =
          resultResponse.data.stderr ||
          resultResponse.data.compile_output ||
          resultResponse.data.status.description ||
          "An error has occurred.";
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Error running code:", err);

      if (err.response) {
        console.error("Response data:", err.response.data);
        console.error("Response status:", err.response.status);
        setError(
          `API Error ${err.response.status}: ${JSON.stringify(
            err.response.data
          )}`
        );
      } else if (err.request) {
        setError(
          "No response from code execution service. Check your internet connection."
        );
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePlayerDamage = async () => {
    try {
      const { data: playerData, error: playerError } = await supabase
        .from("room_players")
        .select("character_id")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      if (playerError || !playerData) {
        console.error("Error fetching player data:", playerError);
        return;
      }

      const { data: characterData, error: characterError } = await supabase
        .from("character_classes")
        .select("base_attack")
        .eq("character_id", playerData.character_id)
        .single();

      if (characterError || !characterData) {
        console.error("Error fetching character damage:", characterError);
        return;
      }

      const playerDamage = characterData.base_attack;

      const { data: encounterData, error: encounterError } = await supabase
        .from("room_encounters")
        .select("current_hp")
        .eq("encounter_id", encounterId)
        .single();

      if (encounterError || !encounterData) {
        console.error("Error fetching encounter data:", encounterError);
        return;
      }

      const newHp = Math.max(0, encounterData.current_hp - playerDamage);

      if (socket) {
        socket.emit("update_enemy_hp", {
          encounterId: encounterId,
          newHp: newHp,
        });
      }

      console.log(
        `Dealt ${playerDamage} damage! Enemy HP: ${encounterData.current_hp} → ${newHp}`
      );

      // Check if enemy is defeated
      if (newHp <= 0) {
        setCombatResult("victory");
      }
    } catch (error) {
      console.error("Error handling correct answer:", error);
    }
  };

  const calculateEnemyDamage = async () => {
    try {
      const { data: enemyData, error: enemyError } = await supabase
        .from("room_encounters")
        .select("enemy_id")
        .eq("encounter_id", encounterId)
        .single();

      if (enemyError || !enemyData) {
        console.error("Error fetching enemy data:", enemyError);
        return;
      }

      const { data: enemyDamageData, error: enemyDamageError } = await supabase
        .from("enemy_data")
        .select("base_attack")
        .eq("enemy_id", enemyData.enemy_id)
        .single();

      if (enemyDamageError || !enemyDamageData) {
        console.error("Error fetching enemy damage:", enemyDamageError);
        return;
      }

      const enemyDamage = enemyDamageData.base_attack;

      const { data: playerData, error: playerError } = await supabase
        .from("room_players")
        .select("current_hp")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      if (playerError || !playerData) {
        console.error("Error fetching player data:", playerError);
        return;
      }

      const newHp = Math.max(0, playerData.current_hp - enemyDamage);

      if (socket) {
        socket.emit("update_player_hp", {
          sessionId: sessionDetails.session_id,
          userId: profile.user_id,
          newHp: newHp,
        });
      }

      console.log(
        `Dealt ${enemyDamage} damage! Player HP: ${playerData.current_hp} → ${newHp}`
      );

      // Check if player is defeated
      if (newHp <= 0) {
        setCombatResult("defeat");
        await handleDefeat();
      }
    } catch (error) {
      console.error("Error handling wrong answer:", error);
    }
  };

  const handleDefeat = async () => {
    try {
      // Get player's max HP from character class
      const { data: playerData, error: playerError } = await supabase
        .from("room_players")
        .select("character_id")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      if (playerError || !playerData) {
        console.error("Error fetching player data:", playerError);
        return;
      }

      const { data: characterData, error: characterError } = await supabase
        .from("character_classes")
        .select("max_hp")
        .eq("character_id", playerData.character_id)
        .single();

      if (characterError || !characterData) {
        console.error("Error fetching character data:", characterError);
        return;
      }

      // Calculate 50% of max HP
      const newHp = Math.floor(characterData.max_hp * 0.5);

      // Update player HP to 50% of max
      const { error: updateError } = await supabase
        .from("room_players")
        .update({ current_hp: newHp })
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id);

      if (updateError) {
        console.error("Error updating player HP:", updateError);
        return;
      }

      // Emit socket event to update HP across all clients
      if (socket) {
        socket.emit("update_player_hp", {
          sessionId: sessionDetails.session_id,
          userId: profile.user_id,
          newHp: newHp,
        });
      }

      console.log(`Player defeated! HP restored to 50%: ${newHp}`);
    } catch (error) {
      console.error("Error handling defeat:", error);
    }
  };

  const onCorrectAnswer = async () => {
    console.log("Correct answer!");
    setOutput("Correct! Dealing damage to enemy...");
    await calculatePlayerDamage();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!combatResult) {
      await fetchPythonQuestion();
      console.log("New question loaded!");
    }
  };

  const onWrongAnswer = async () => {
    console.log("Wrong answer!");
    setOutput("Wrong answer! Receiving damage from enemy...");
    await calculateEnemyDamage();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!combatResult) {
      await fetchPythonQuestion();
      console.log("New question loaded!");
    }
  };

  const handleCombatEnd = () => {
    if (combatResult === "victory") {
      console.log("Victory! Returning to game...");
      navigate("/gameplay");
    } else if (combatResult === "defeat") {
      // Redirect to main menu for QR scan
      console.log("Defeat! Redirecting to main menu...");
      navigate("/gameplay");
    }
  };

  return (
    <div className="combat-system-container">
      {/* Combat Result Overlay */}
      {combatResult && (
        <div className="combat-result-overlay">
          <div className={`combat-result-message ${combatResult}`}>
            <h1>{combatResult === "victory" ? "VICTORY" : "DEFEAT"}</h1>
            {combatResult === "defeat" && (
              <p className="defeat-info">Your HP has been reduced to 50%</p>
            )}
            <button onClick={handleCombatEnd} className="combat-result-button">
              {combatResult === "victory" ? "Continue" : "Return to Menu"}
            </button>
          </div>
        </div>
      )}

      <div className="combat-system-question">
        {question && (
          <div className="combat-system-question-text">
            <p>{question.python_text}</p>
            <p>Time Limit: {question.python_time_limit} seconds</p>
          </div>
        )}

        <div className="editor-output-container">
          <div className="editor-wrapper">
            <CodeEditorWindow code={code} onChange={setCode} />
          </div>
          <div className="output-wrapper">
            <h4>Output:</h4>
            <pre>{error ? <span className="error">{error}</span> : output}</pre>
          </div>
        </div>
        <button onClick={runCode} disabled={isLoading || combatResult}>
          {isLoading ? "Running..." : "Run Code"}
        </button>
      </div>
    </div>
  );
};

export default CombatSystem;
