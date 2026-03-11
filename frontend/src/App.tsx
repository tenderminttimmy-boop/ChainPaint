import "./App.css";
import { useRef, useEffect } from "react";

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = 4;

    function drawCell(x: number, y: number, color: string) {
      ctx!.fillStyle = color;
      ctx!.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }

    const board = Array.from({ length: 200 }, () =>
      Array.from({ length: 340 }, () => null as string | null),
    );

    board[8][10] = "red";
    board[8][11] = "blue";
    board[8][12] = "green";
    board[8][13] = "purple";

    for (let x = 0; x < 340; x++) {
      for (let y = 0; y < 200; y++) {
        const color = board[y][x];

        if (color) {
          drawCell(x, y, color);
        }
      }
    }

    function handleCanvasClick(event: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();

      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const cellX = Math.floor(mouseX / cellSize);
      const cellY = Math.floor(mouseY / cellSize);

      console.log("clicked cell:", cellX, cellY);
    }

    canvas.addEventListener("click", handleCanvasClick);

    return () => {
      canvas.removeEventListener("click", handleCanvasClick);
    };
  }, []);

  return (
    <div className="app">
      <h1 className="title">Pixel Board</h1>

      <canvas
        ref={canvasRef}
        className="board-canvas"
        width={1360}
        height={800}
      />
    </div>
  );
}

export default App;
