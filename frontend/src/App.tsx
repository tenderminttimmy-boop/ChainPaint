import "./App.css";
import { useRef, useEffect, useState } from "react";
import { ChromePicker } from "react-color";
import { Pipette, X } from "lucide-react";

const BOARD_WIDTH = 340;
const BOARD_HEIGHT = 200;
const CELL_SIZE = 5;

// This is a simplified version of the pixel board app, focused on the core canvas drawing and color picking logic.
function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // State to track the currently selected cell for editing
  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // State to track the position of the color picker and whether it's open
  const [pickerPosition, setPickerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // State to track the board's cell colors
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // The board state is a 2D array representing the colors of each cell on the board. Each cell can either be null (indicating no color) or a string representing the color.
  // Effectively, this chunk of code initializes the board state as a 2D array of null values, with dimensions defined by BOARD_HEIGHT and BOARD_WIDTH. This represents an empty board where no cells have been colored yet.
  // The useState hook is used to manage this state, allowing us to update the colors of individual cells as the user interacts with the app.
  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array.from({ length: BOARD_HEIGHT }, () =>
      Array.from({ length: BOARD_WIDTH }, () => null),
    ),
  );

  // State to track the currently selected color in the color picker. This is used to update the preview of the cell being edited and to apply the new color when the user confirms their selection.
  const [selectedColor, setSelectedColor] = useState("black");

  // The function to handle canceling the edit when the user clicks outside the picker or presses the Escape key. It closes the color picker and clears the selected cell state, returning the app to its default state.
  function handleCancelEdit() {
    setIsPickerOpen(false);
    setSelectedCell(null);
  }

  // The function that applies the selected color to the selected cell in the board state, both when previewing the color in the picker and when confirming the change.
  function handleApplyColor() {
    if (!selectedCell) return;

    // setBoard effectively updates the color of the selected cell in the board state with the currently selected color from the color picker. It creates a new copy of the board state, updates the specific cell's color, and then sets the new board state, which triggers a re-render of the canvas with the updated colors.
    // This function is called when the user clicks the "Apply" button in the color picker, and in the final version of the app, this is where you would also trigger the transaction to update the cell color on the blockchain.
    setBoard((prevBoard) => {
      // We create a new copy of the board state to avoid mutating the existing state directly. This is important in React to ensure that state updates are properly detected and trigger re-renders. We use map to create a new array for each row, effectively creating a deep copy of the 2D board array.
      const newBoard = prevBoard.map((row) => [...row]);
      // We update the color of the selected cell in the board state with the currently selected color from the color picker. This will trigger a re-render of the canvas with the new color applied to that cell.
      newBoard[selectedCell.y][selectedCell.x] = selectedColor;
      return newBoard;
    });

    // After applying the color change, we close the picker and clear the selected cell to return to the default state.
    setIsPickerOpen(false);
    setSelectedCell(null);
  }

  // The main effect that handles canvas rendering and interactions. It runs whenever the board state, selected color, selected cell, or picker open state changes, ensuring the canvas is updated accordingly.
  useEffect(() => {
    // Get the canvas element from the ref. If the canvas is not available (e.g., the component hasn't mounted yet), we return early since we won't be able to render anything.
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get the 2D drawing context from the canvas. This is what we will use to draw on the canvas. If we can't get the context, we return early since we won't be able to render anything.
    // ctx means "context" and is a common variable name for the canvas drawing context. It provides the API for drawing shapes, text, images, and other graphics on the canvas element.
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // We add a ! after every use of ctx and canvas beyond this point to tell TypeScript that we are sure these variables are not null, since we have already checked for that. This allows us to use the canvas and context without needing to check for null every time, which simplifies the code and makes it more readable.

    // This variable tracks the currently hovered cell for displaying the hover effect. It is not stored in React state because it does not need to trigger a re-render of the component; instead, we will handle the hover effect directly in the canvas rendering logic.
    // The ending part of | null = null; | indicates that this variable can either hold an object with x and y coordinates or be null when no cell is hovered. This allows us to easily check if there is a hovered cell and render the appropriate hover effect on the canvas without needing to manage this state through React's rendering cycle, which can improve performance for hover interactions.
    let hoveredCell: { x: number; y: number } | null = null;

    // This function handles keyboard events for the application.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isPickerOpen) {
        handleCancelEdit();
      }
    }

    // This function is responsible for drawing a single cell on the canvas at the specified coordinates with the given color. It uses the canvas context to fill a rectangle representing the cell. The coordinates are multiplied by the cell size to position the cell correctly on the canvas.
    function drawCell(x: number, y: number, color: string) {
      ctx!.fillStyle = color;
      // We multiply the cell coordinates by the cell size to get the correct pixel position on the canvas, and then fill a rectangle of the defined cell size to represent the cell's color. This is where the actual drawing of each cell happens based on the board state.
      ctx!.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // This function draws a border around the hovered or selected cell to provide visual feedback to the user.
    function drawHoveredCellBorder(x: number, y: number) {
      // Stroke styling for the hover effect.
      ctx!.strokeStyle = "#555";
      ctx!.lineWidth = 1;
      // We add 0.5 to the coordinates to ensure the border is drawn crisply on pixel boundaries, which helps avoid blurriness due to anti-aliasing when drawing thin lines on a canvas.
      ctx!.strokeRect(
        x * CELL_SIZE + 0.5,
        y * CELL_SIZE + 0.5,
        CELL_SIZE - 1,
        CELL_SIZE - 1,
      );
    }

    // Example: Pre-fill some cells with colors
    //board[8][10] = "red";
    //board[8][11] = "blue";
    //board[8][12] = "green";
    //board[8][13] = "purple";

    // The main function responsible for rendering the board on the canvas. It clears the canvas and then iterates through the board state to draw each cell based on its color. It also handles drawing the hover effect for the currently hovered or selected cell.
    function renderBoard() {
      // Clear the entire canvas before re-rendering the board. This ensures that we start with a blank slate for each render, preventing any artifacts from previous renders.
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Loop through the board state, dividing it into cells based on the defined cell size. For each cell, we check if it has a color in the board state and draw it on the canvas accordingly. This is the main rendering loop that updates the visual representation of the board based on the current state.
      // We loop through the board using nested loops for the x and y coordinates. The outer loop iterates over the rows (y-axis), while the inner loop iterates over the columns (x-axis). This allows us to access each cell in the board state and determine how to render it on the canvas.
      // This is where actual drawing happens. Cells are a concept we're arbitrarily defining as 5x5 pixel blocks on the canvas, and we use the board state to determine what color to fill each cell with. If a cell has a color in the board state, we call the drawCell function to fill that area of the canvas with the appropriate color.
      for (let x = 0; x < 340; x++) {
        for (let y = 0; y < 200; y++) {
          // Get the color for the current cell from the board state. This will be used to determine what color to draw for this cell on the canvas.
          const color = board[y][x];

          // The first of two possible places where displayColor can be assigned. This is the color stored in the board state.
          let displayColor = color;

          // The second of two possible places where displayColor can be assigned. If the current cell is the one being edited (selectedCell) and the color picker is open, we want to show the currently selected color for that cell instead of the color from the board state. This allows the user to see a preview of the new color as they select it in the picker.
          if (
            selectedCell &&
            x === selectedCell.x &&
            y === selectedCell.y &&
            isPickerOpen
          ) {
            displayColor = selectedColor;
          }

          // Only draw the cell if it has a color (either from the board state or the currently selected color for the cell being edited). This optimization helps reduce unnecessary drawing operations for empty cells, improving performance.
          if (displayColor) {
            drawCell(x, y, displayColor);
          }
        }
      }

      // Draw hover effect if a cell is hovered or selected
      if (selectedCell) {
        drawHoveredCellBorder(selectedCell.x, selectedCell.y);
      } else if (hoveredCell) {
        drawHoveredCellBorder(hoveredCell.x, hoveredCell.y);
      }
    }

    //
    function getCellFromMouse(event: MouseEvent) {
      // Get the bounding rectangle of the canvas to calculate the mouse position relative to the canvas. This is necessary because the canvas may not be positioned at the top-left corner of the page, and we need to account for any offsets when determining which cell is being interacted with.
      const rect = canvas!.getBoundingClientRect();
      // The amount we offset the cell we're actually detecting from the mouse, this way the cursor doesn't cover the cell you want to select.
      const hoverOffset = 4;

      // Calculate the mouse position relative to the canvas, adjusting for the hover offset to ensure the correct cell is detected even when the mouse is near the edge of a cell. This allows for a more user-friendly experience when hovering and clicking on cells.
      const mouseX = event.clientX - rect.left - hoverOffset;
      const mouseY = event.clientY - rect.top - hoverOffset;

      // Calculate the cell coordinates based on the mouse position and cell size. We use Math.floor to determine which cell the mouse is over, and Math.max to ensure we don't get negative coordinates if the mouse is near the top-left edge of the canvas.
      const cellX = Math.max(0, Math.floor(mouseX / CELL_SIZE));
      const cellY = Math.max(0, Math.floor(mouseY / CELL_SIZE));

      // Ensure the cell coordinates are within the bounds of the board
      return { x: cellX, y: cellY };
    }

    // When the canvas is clicked, we want to open the color picker for the cell that was clicked. This function handles the logic for determining which cell was clicked and setting the appropriate state to show the color picker.
    function handleCanvasClick(event: MouseEvent) {
      // If the color picker is already open, we want to close it and cancel the current edit. This allows the user to click outside the picker to dismiss it without applying changes.
      if (isPickerOpen) {
        handleCancelEdit();
        return;
      }

      // Get the cell coordinates from the mouse click position. This function calculates which cell was clicked based on the mouse position relative to the canvas and the defined cell size.
      const clickedCell = getCellFromMouse(event);

      // Get the bounding rectangle of the canvas to calculate the correct position for the color picker. This ensures that the picker appears near the clicked cell, even if the canvas is not at the top-left corner of the page.
      const rect = canvas!.getBoundingClientRect();

      // Set the selected cell to the one that was clicked, which will trigger the color picker to open and show the current color of that cell.
      setSelectedCell(clickedCell);

      // Position the color picker near the clicked cell, with a small offset to avoid covering the cell itself
      setPickerPosition({
        x: event.clientX - rect.left - 232,
        y: event.clientY - rect.top + 125,
      });

      // Open the color picker when a cell is clicked
      setIsPickerOpen(true);
    }

    // When the mouse moves over the canvas, we want to update the hovered cell state so that we can show a hover effect on the cell under the mouse cursor.
    function handleCanvasMouseMove(event: MouseEvent) {
      hoveredCell = getCellFromMouse(event);
      renderBoard();
    }

    // When the mouse leaves the canvas, we want to clear the hovered cell state so that the hover effect is removed.
    function handleCanvasMouseLeave() {
      hoveredCell = null;
      renderBoard();
    }

    // Initial render of the board
    renderBoard();

    // Add event listeners for canvas interactions and keyboard input
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup event listeners on unmount
    return () => {
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
      window.removeEventListener("keydown", handleKeyDown);
    };

    // The dependencies of this effect include the board state, the selected color, the selected cell, and whether the picker is open. Whenever any of these change, the effect will re-run and update the canvas rendering accordingly. This ensures that the UI stays in sync with the current state of the application.
  }, [board, selectedColor, selectedCell, isPickerOpen]);

  // The main render function of the React component; essentially the whole UI structure of the app.
  return (
    <div className="app">
      <h1 className="title">Pixel Board</h1>

      {/* The entire, parent color picker popup. It appears when a cell is clicked and allows the user to select a new color for that cell. */}
      {/* The position of the popup is determined by the `pickerPosition` state, which is set based on the mouse click location. */}
      {/* The color picker is only rendered when `isPickerOpen` is true and `pickerPosition` is set, ensuring it only appears when a cell is actively being edited. */}
      {/* This is not the actual div that holds the color picker, but rather the conditional rendering logic that determines when and where to show the color picker component. */}
      {/* The actual content of the color picker is defined in the nested div within. */}
      {isPickerOpen && pickerPosition && (
        // The color picker container. It includes a cancel button, a color input, and an apply button. The styling is basic and can be improved in a real application.
        <div
          style={{
            position: "absolute",
            overflow: "visible",
            left: `${pickerPosition.x}px`,
            top: `${pickerPosition.y}px`,
            backgroundColor: "white",
            border: "1px solid #b0a6a6",
            padding: "8px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/*The color picker component. Fairly simple, some styling is applies to it via CSS classes.*/}
          <ChromePicker
            color={selectedColor}
            onChange={(color) => setSelectedColor(color.hex)}
          />

          {/* The action buttons for applying or canceling the color change. */}
          <div
            style={{
              display: "flex",
              gap: "2px",
            }}
          >
            <button
              className="utility-button"
              style={{
                backgroundColor: "blue",
              }}
            >
              <Pipette size={18} />
            </button>

            <button
              style={{
                // flex: 1 is equivilent to "fill width" in figma.
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "green",
                borderRadius: "5px",
              }}
              onClick={handleApplyColor}
            >
              CONFIRM
            </button>

            <button
              className="utility-button"
              style={{
                backgroundColor: "red",
              }}
              onClick={handleCancelEdit}
            >
              <X size={23} />
            </button>
          </div>
        </div>
      )}

      {/*The canvas element where the board is rendered*/}
      <canvas
        ref={canvasRef}
        className="board-canvas"
        width={BOARD_WIDTH * CELL_SIZE}
        height={BOARD_HEIGHT * CELL_SIZE}
      />
    </div>
  );
}

// Note: In a real application, you would want to optimize the rendering logic to avoid redrawing the entire board on every change. This example focuses on demonstrating the core concepts in a straightforward way.
export default App;
