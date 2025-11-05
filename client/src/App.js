// ...existing imports...
import LoadGame from "./components/GameFile/LoadGame";

function App() {
  return (
    <Routes>
      {/* ...existing routes... */}
      <Route path="/load-game" element={<LoadGame />} />
      {/* ...rest of routes... */}
    </Routes>
  );
}

export default App;