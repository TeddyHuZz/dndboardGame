import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useRoomSession } from "../../context/RoomSessionContext";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import "./CombatSystem.css";
import CodeEditorWindow from "./CodeEditorWindow";

// FIX: Accept the full `encounter` object as a prop, not the ID.
const CombatSystem = ({ encounter }) => {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState(null);
  const [combatResult, setCombatResult] = useState(null);
  const { sessionDetails, players, setPlayers } = useRoomSession();
  const { profile } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Debug: Log context values on mount
  useEffect(() => {
    console.log("🔍 CombatSystem mounted with:");
    console.log("  - profile:", profile);
    console.log("  - sessionDetails:", sessionDetails);
    console.log("  - encounter:", encounter);
    console.log("  - socket:", socket ? "connected" : "not connected");
  }, []);

  const fetchPythonQuestion = async () => {
    try {
      const { data: allQuestions, error: countError } = await supabase
        .from("python_questions")
        .select("python_id");

      if (countError || !allQuestions || allQuestions.length === 0) {
        console.error("Error fetching questions:", countError);
        return;
      }

      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      const randomId = allQuestions[randomIndex].python_id;

      const { data, error } = await supabase
        .from("python_questions")
        .select(
          "python_text, python_time_limit, python_answer, python_id, function_name, test_harness"
        )
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
    } catch (err) {
      console.error("Error in fetchPythonQuestion:", err);
    }
  };

  useEffect(() => {
    if (encounter) {
      fetchPythonQuestion();
    }
  }, [encounter]);

  useEffect(() => {
    if (!socket) return;

    const handleCombatVictory = (data) => {
      console.log("🎉 Victory event received:", data);
      
      // Only set victory if it's for this encounter
      if (data.encounterId === encounter?.encounter_id) {
        setCombatResult("victory");
      }
    };

    socket.on("combat_victory", handleCombatVictory);

    return () => {
      socket.off("combat_victory", handleCombatVictory);
    };
  }, [socket, encounter?.encounter_id]);

  // NOW the conditional returns can come
  if (!question) {
    return <div>Loading Question...</div>;
  }

  if (!profile || !sessionDetails) {
    return (
      <div className="combat-system-container">
        <div style={{ color: "white", padding: "2rem", textAlign: "center" }}>
          <p>Loading player data...</p>
          <p style={{ fontSize: "0.8rem", color: "#888" }}>
            {!profile && "Waiting for profile..."}
            {!sessionDetails && "Waiting for session details..."}
          </p>
        </div>
      </div>
    );
  }

  const runCode = async () => {
    if (!code || code.trim() === "") {
      setError("Please enter some code before running.");
      return;
    }
    if (!question) {
      setError("Question not loaded. Please wait.");
      return;
    }

    setIsLoading(true);
    setError("");
    setOutput("");

    const finalCode = `
# Player's submitted code
${code}

# Test harness provided by the system
${question.test_harness}
`;

    const options = {
      method: "POST",
      url: "https://ce.judge0.com/submissions",
      params: { base64_encoded: "false", wait: "false", fields: "*" },
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.REACT_APP_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      data: { language_id: 71, source_code: finalCode, stdin: "" },
    };

    try {
      const response = await axios.request(options);
      const token = response.data.token;

      let resultResponse;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        resultResponse = await axios.request({
          method: "GET",
          url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
          params: { base64_encoded: "false", fields: "*" },
          headers: {
            "X-RapidAPI-Key": process.env.REACT_APP_RAPIDAPI_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
        });
        attempts++;
      } while (resultResponse.data.status.id <= 2 && attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error("Code execution timeout");
      }

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
      const errorMessage = err.response
        ? JSON.stringify(err.response.data)
        : err.message;
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePlayerDamage = async () => {
    // Double-check at the point of execution
    if (!profile) {
      console.error("❌ Missing profile at calculatePlayerDamage execution");
      setOutput("Error: Player profile not loaded. Please refresh the page.");
      return;
    }
    
    if (!sessionDetails) {
      console.error("❌ Missing sessionDetails at calculatePlayerDamage execution");
      setOutput("Error: Session details not loaded. Please refresh the page.");
      return;
    }

    try {
      console.log("🎯 Starting calculatePlayerDamage...");
      console.log("  - profile.user_id:", profile.user_id);
      console.log("  - sessionDetails.session_id:", sessionDetails.session_id);
      console.log("  - encounter.encounter_id:", encounter.encounter_id);

      const { data: playerData, error: playerError } = await supabase
        .from("room_players")
        .select("character_id")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      if (playerError) {
        console.error("Error fetching player data:", playerError);
        setOutput("Error: Could not fetch player data.");
        return;
      }

      console.log("Player data:", playerData);

      const { data: characterData, error: characterError } = await supabase
        .from("character_classes")
        .select("base_attack")
        .eq("character_id", playerData.character_id)
        .single();

      if (characterError) {
        console.error("Error fetching character data:", characterError);
        setOutput("Error: Could not fetch character data.");
        return;
      }

      const playerDamage = characterData.base_attack;
      console.log("Player damage:", playerDamage);

      const { data: encounterData, error: encounterError } = await supabase
        .from("room_encounters")
        .select("current_hp")
        .eq("encounter_id", encounter.encounter_id)
        .single();

      if (encounterError) {
        console.error("Error fetching encounter data:", encounterError);
        setOutput("Error: Could not fetch encounter data.");
        return;
      }

      console.log("Enemy current HP:", encounterData.current_hp);

      const newHp = Math.max(0, encounterData.current_hp - playerDamage);
      console.log("Enemy new HP:", newHp);

      // FIXED: Always update the current_hp in the database
      const updateData = { current_hp: newHp };
      if (newHp <= 0) {
        updateData.is_alive = false;
        setCombatResult("victory");
        console.log("🎉 Enemy defeated!");
      }

      const { error: updateError } = await supabase
        .from("room_encounters")
        .update(updateData)
        .eq("encounter_id", encounter.encounter_id);

      if (updateError) {
        console.error("Error updating enemy HP:", updateError);
        setOutput("Error: Could not update enemy HP.");
        return;
      }

      console.log("✅ Enemy HP updated in database");

      // Emit socket event for real-time updates
      if (socket) {
        console.log("📡 Emitting update_enemy_hp event");
        socket.emit("update_enemy_hp", {
          encounterId: encounter.encounter_id,
          newHp,
        });
      } else {
        console.warn("⚠️ Socket not connected, HP update may not reflect immediately");
      }
    } catch (error) {
      console.error("Error in calculatePlayerDamage:", error);
      setOutput("Error: An unexpected error occurred.");
    }
  };

  const calculateEnemyDamage = async () => {
    if (!profile || !sessionDetails) {
      console.error("Missing profile or sessionDetails in calculateEnemyDamage");
      return;
    }

    try {
      const { data: enemyData } = await supabase
        .from("room_encounters")
        .select("enemy_id")
        .eq("encounter_id", encounter.encounter_id)
        .single();

      const { data: enemyDamageData } = await supabase
        .from("enemy_data")
        .select("base_attack")
        .eq("enemy_id", enemyData.enemy_id)
        .single();

      const enemyDamage = enemyDamageData.base_attack;

      const { data: playerData } = await supabase
        .from("room_players")
        .select("current_hp")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      const newHp = Math.max(0, playerData.current_hp - enemyDamage);

      // Update local state
      setPlayers(
        players.map((p) =>
          p.user_id === profile.user_id ? { ...p, current_hp: newHp } : p
        )
      );

      // Update database
      await supabase
        .from("room_players")
        .update({ current_hp: newHp })
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id);

      // Emit socket event
      if (socket) {
        socket.emit("update_player_hp", {
          sessionId: sessionDetails.session_id,
          userId: profile.user_id,
          newHp,
        });
      }

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
      const { data: playerData } = await supabase
        .from("room_players")
        .select("character_id")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      const { data: characterData } = await supabase
        .from("character_classes")
        .select("max_hp")
        .eq("character_id", playerData.character_id)
        .single();

      const newHp = Math.floor(characterData.max_hp * 0.5);

      setPlayers(
        players.map((p) =>
          p.user_id === profile.user_id ? { ...p, current_hp: newHp } : p
        )
      );

      await supabase
        .from("room_players")
        .update({ current_hp: newHp })
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id);

      if (socket) {
        socket.emit("update_player_hp", {
          sessionId: sessionDetails.session_id,
          userId: profile.user_id,
          newHp,
        });
      }
    } catch (error) {
      console.error("Error handling defeat:", error);
    }
  };

  const onCorrectAnswer = async () => {
    console.log("✅ Correct answer!");
    console.log("  - profile:", profile);
    console.log("  - sessionDetails:", sessionDetails);
    setOutput("Correct! Dealing damage to enemy...");
    await calculatePlayerDamage();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!combatResult) {
      await fetchPythonQuestion();
    }
  };

  const onWrongAnswer = async () => {
    console.log("❌ Wrong answer!");
    setOutput("Wrong answer! Receiving damage from enemy...");
    await calculateEnemyDamage();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!combatResult) {
      await fetchPythonQuestion();
    }
  };

  const handleCombatEnd = () => {
    if (combatResult === "defeat") {
      // Navigate to start game page when defeated
      navigate("/game-dashboard");
    } else {
      // Navigate to gameplay page when victorious
      navigate("/gameplay");
    }
  };

  return (
    <div className="combat-system-container">
      {combatResult && (
        <div className="combat-result-overlay">
          <div className={`combat-result-message ${combatResult}`}>
            <h1>{combatResult === "victory" ? "VICTORY" : "DEFEAT"}</h1>
            {combatResult === "defeat" && (
              <p className="defeat-info">You have been defeated!</p>
            )}
            <button onClick={handleCombatEnd} className="combat-result-button">
              {combatResult === "victory" ? "Continue" : "Return to Start"}
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
