import "./App.css";
import { useState } from "react";

function App() {
  const totalCells = 340 * 200;
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  return (
    <div className="app">
      <h1 className="title">Pixel Board</h1>

      <div className="board">
        {Array.from({ length: totalCells }).map((_, index) => (
          <div
            key={index}
            className={`cell ${hoveredCell === index ? "cell-hovered" : ""}`}
            onMouseEnter={() => setHoveredCell(index)}
            onMouseLeave={() => setHoveredCell(null)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
