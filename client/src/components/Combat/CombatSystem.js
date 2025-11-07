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
  // FIX: Removed the local `encounter` state, as we now use the prop.
  // const [encounter, setEncounter] = useState(null);
  const { sessionDetails, players, setPlayers } = useRoomSession();
  const { profile } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

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
  }, [encounter]); // Depend on the encounter prop

  if (!question) {
    return <div>Loading Question...</div>;
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
    if (!profile || !sessionDetails) return;

    try {
      const { data: playerData } = await supabase
        .from("room_players")
        .select("character_id")
        .eq("session_id", sessionDetails.session_id)
        .eq("user_id", profile.user_id)
        .single();

      const { data: characterData } = await supabase
        .from("character_classes")
        .select("base_attack")
        .eq("character_id", playerData.character_id)
        .single();

      const playerDamage = characterData.base_attack;

      const { data: encounterData } = await supabase
        .from("room_encounters")
        .select("current_hp")
        // FIX: Use the encounter ID from the prop
        .eq("encounter_id", encounter.encounter_id)
        .single();

      const newHp = Math.max(0, encounterData.current_hp - playerDamage);

      if (newHp <= 0) {
        await supabase
          .from("room_encounters")
          .update({ is_alive: false, current_hp: 0 })
          // FIX: Use the encounter ID from the prop
          .eq("encounter_id", encounter.encounter_id);
        setCombatResult("victory");
      }

      if (socket) {
        // FIX: Use the encounter ID from the prop
        socket.emit("update_enemy_hp", {
          encounterId: encounter.encounter_id,
          newHp,
        });
      }
    } catch (error) {
      console.error("Error handling correct answer:", error);
    }
  };

  const calculateEnemyDamage = async () => {
    if (!profile || !sessionDetails) return;

    try {
      const { data: enemyData } = await supabase
        .from("room_encounters")
        .select("enemy_id")
        // FIX: Use the encounter ID from the prop
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

      setPlayers(
        players.map((p) =>
          p.user_id === profile.user_id ? { ...p, current_hp: newHp } : p
        )
      );

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
    setOutput("Correct! Dealing damage to enemy...");
    await calculatePlayerDamage();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!combatResult) {
      await fetchPythonQuestion();
    }
  };

  const onWrongAnswer = async () => {
    setOutput("Wrong answer! Receiving damage from enemy...");
    await calculateEnemyDamage();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!combatResult) {
      await fetchPythonQuestion();
    }
  };

  const handleCombatEnd = () => {
    navigate("/gameplay");
  };

  return (
    <div className="combat-system-container">
      {combatResult && (
        <div className="combat-result-overlay">
          <div className={`combat-result-message ${combatResult}`}>
            <h1>{combatResult === "victory" ? "VICTORY" : "DEFEAT"}</h1>
            {combatResult === "defeat" && (
              <p className="defeat-info">Your HP has been reduced to 50%</p>
            )}
            <button onClick={handleCombatEnd} className="combat-result-button">
              {combatResult === "victory" ? "Continue" : "Return to Game"}
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
