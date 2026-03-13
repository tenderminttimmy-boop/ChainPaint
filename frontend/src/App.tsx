import "./App.css";
import { useRef, useEffect, useState, useCallback } from "react";
import { ChromePicker } from "react-color";
import { Pipette, X } from "lucide-react";
import {
  drawCell,
  drawHoveredCellBorder,
  worldToScreen,
} from "./boardRenderer";

const BOARD_WIDTH = 510;
const BOARD_HEIGHT = 300;
const CELL_SIZE = 5;

const getBoardWorldWidth = () => BOARD_WIDTH * CELL_SIZE;
const getBoardWorldHeight = () => BOARD_HEIGHT * CELL_SIZE;

const getMinZoom = (viewportWidth: number, viewportHeight: number) => {
  return Math.max(
    viewportWidth / getBoardWorldWidth(),
    viewportHeight / getBoardWorldHeight(),
  );
};

const getCenteredCamera = (
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
) => {
  const boardPixelWidth = getBoardWorldWidth() * zoom;
  const boardPixelHeight = getBoardWorldHeight() * zoom;

  return {
    zoom,
    x: (viewportWidth - boardPixelWidth) / 2,
    y: (viewportHeight - boardPixelHeight) / 2,
  };
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [camera, setCamera] = useState(() => {
    const initialZoom = getMinZoom(window.innerWidth, window.innerHeight) * 1.3;
    return getCenteredCamera(
      window.innerWidth,
      window.innerHeight,
      initialZoom,
    );
  });

  const dragStateRef = useRef<{
    isDragging: boolean;
    didDrag: boolean;
    startMouseX: number;
    startMouseY: number;
    startCameraX: number;
    startCameraY: number;
  }>({
    isDragging: false,
    didDrag: false,
    startMouseX: 0,
    startMouseY: 0,
    startCameraX: 0,
    startCameraY: 0,
  });

  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setCanvasRect(rect);
  }, []);

  const [isEyedropperActive, setIsEyedropperActive] = useState(false);

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const pickerPosition =
    selectedCell && isPickerOpen && canvasRect
      ? (() => {
          const screenPosition = worldToScreen(
            selectedCell.x,
            selectedCell.y,
            CELL_SIZE,
            camera,
          );

          return {
            x: screenPosition.x + canvasRect.left,
            y: screenPosition.y + canvasRect.top,
          };
        })()
      : null;

  const popupWidth = 244;
  const popupHeight = 312;
  const popupGap = CELL_SIZE * 1.5 * camera.zoom;

  const popupPosition = pickerPosition
    ? (() => {
        const defaultLeft = pickerPosition.x - popupWidth - popupGap;
        const flippedLeft =
          pickerPosition.x + CELL_SIZE * camera.zoom + popupGap;

        const defaultTop = pickerPosition.y;
        const flippedTop =
          pickerPosition.y - popupHeight + CELL_SIZE * camera.zoom;

        const wouldOverflowLeft = defaultLeft < 0;
        const wouldOverflowBottom = defaultTop + popupHeight > viewport.height;

        return {
          x: wouldOverflowLeft ? flippedLeft : defaultLeft,
          y: wouldOverflowBottom ? flippedTop : defaultTop,
        };
      })()
    : null;

  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array.from({ length: BOARD_HEIGHT }, () =>
      Array.from({ length: BOARD_WIDTH }, () => null),
    ),
  );

  const [selectedColor, setSelectedColor] = useState("black");

  const getDisplayedCellColor = useCallback(
    (x: number, y: number) => {
      if (
        selectedCell &&
        isPickerOpen &&
        x === selectedCell.x &&
        y === selectedCell.y
      ) {
        return selectedColor;
      }

      return board[y][x] ?? "#ffffff";
    },
    [board, selectedColor, selectedCell, isPickerOpen],
  );

  const clampCamera = useCallback(
    (nextCamera: { x: number; y: number; zoom: number }) => {
      const boardPixelWidth = BOARD_WIDTH * CELL_SIZE * nextCamera.zoom;
      const boardPixelHeight = BOARD_HEIGHT * CELL_SIZE * nextCamera.zoom;

      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;

      const minX = Math.min(0, viewportWidth - boardPixelWidth);
      const minY = Math.min(0, viewportHeight - boardPixelHeight);

      const maxX = 0;
      const maxY = 0;

      return {
        ...nextCamera,
        x: Math.max(minX, Math.min(maxX, nextCamera.x)),
        y: Math.max(minY, Math.min(maxY, nextCamera.y)),
      };
    },
    [viewport],
  );

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({ width, height });

      if (canvasRef.current) {
        setCanvasRect(canvasRef.current.getBoundingClientRect());
      }

      const minZoom = getMinZoom(width, height);

      setCamera((prev) =>
        clampCamera({
          ...prev,
          zoom: Math.max(prev.zoom, minZoom),
        }),
      );
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clampCamera]);

  const handleCanvasWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const rect = (
        event.currentTarget as HTMLCanvasElement
      ).getBoundingClientRect();

      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      setCamera((prevCamera) => {
        const zoomSensitivity = 0.0015;
        const zoomAmount = -event.deltaY * zoomSensitivity;

        const minZoom = getMinZoom(viewport.width, viewport.height);
        const nextZoom = Math.max(
          minZoom,
          Math.min(8, prevCamera.zoom + zoomAmount),
        );

        const zoomRatio = nextZoom / prevCamera.zoom;

        const newCameraX = mouseX - (mouseX - prevCamera.x) * zoomRatio;
        const newCameraY = mouseY - (mouseY - prevCamera.y) * zoomRatio;

        return clampCamera({
          zoom: nextZoom,
          x: newCameraX,
          y: newCameraY,
        });
      });
    },
    [clampCamera, viewport],
  );

  const handleCanvasMouseDown = useCallback(
    (event: MouseEvent) => {
      if (isPickerOpen) return;

      dragStateRef.current = {
        isDragging: true,
        didDrag: false,
        startMouseX: event.clientX,
        startMouseY: event.clientY,
        startCameraX: camera.x,
        startCameraY: camera.y,
      };
    },
    [camera.x, camera.y, isPickerOpen],
  );

  const handleWindowMouseMove = useCallback(
    (event: MouseEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState.isDragging) return;

      const deltaX = event.clientX - dragState.startMouseX;
      const deltaY = event.clientY - dragState.startMouseY;

      const dragThreshold = 5;

      if (!dragState.didDrag) {
        if (
          Math.abs(deltaX) < dragThreshold &&
          Math.abs(deltaY) < dragThreshold
        ) {
          return;
        }

        dragStateRef.current.didDrag = true;
      }

      setCamera((prevCamera) =>
        clampCamera({
          x: dragState.startCameraX + deltaX,
          y: dragState.startCameraY + deltaY,
          zoom: prevCamera.zoom,
        }),
      );
    },
    [clampCamera],
  );

  const handleWindowMouseUp = useCallback(() => {
    dragStateRef.current.isDragging = false;
  }, []);

  function handleCancelEdit() {
    setIsPickerOpen(false);
    setSelectedCell(null);
    setIsEyedropperActive(false);
  }

  function handleApplyColor() {
    if (!selectedCell) return;

    setBoard((prevBoard) => {
      const newBoard = prevBoard.map((row) => [...row]);
      newBoard[selectedCell.y][selectedCell.x] = selectedColor;
      return newBoard;
    });

    setIsPickerOpen(false);
    setSelectedCell(null);
    setIsEyedropperActive(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let hoveredCell: { x: number; y: number } | null = null;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isPickerOpen) {
        handleCancelEdit();
      }
    }

    function renderBoard() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      const scaledCellSize = CELL_SIZE * camera.zoom;

      const startX = Math.max(0, Math.floor(-camera.x / scaledCellSize));
      const startY = Math.max(0, Math.floor(-camera.y / scaledCellSize));

      const endX = Math.min(
        BOARD_WIDTH,
        Math.ceil((viewport.width - camera.x) / scaledCellSize),
      );

      const endY = Math.min(
        BOARD_HEIGHT,
        Math.ceil((viewport.height - camera.y) / scaledCellSize),
      );

      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          const color = board[y][x];

          let displayColor = color;

          if (
            selectedCell &&
            x === selectedCell.x &&
            y === selectedCell.y &&
            isPickerOpen
          ) {
            displayColor = selectedColor;
          }

          if (displayColor) {
            drawCell(ctx!, x, y, displayColor, CELL_SIZE, camera);
          }
        }
      }

      if (isPickerOpen && isEyedropperActive && hoveredCell) {
        drawHoveredCellBorder(
          ctx!,
          hoveredCell.x,
          hoveredCell.y,
          CELL_SIZE,
          camera,
        );
      } else if (selectedCell) {
        drawHoveredCellBorder(
          ctx!,
          selectedCell.x,
          selectedCell.y,
          CELL_SIZE,
          camera,
        );
      } else if (hoveredCell) {
        drawHoveredCellBorder(
          ctx!,
          hoveredCell.x,
          hoveredCell.y,
          CELL_SIZE,
          camera,
        );
      }
    }

    function getCellFromMouse(event: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const hoverOffset = 4;

      const mouseX = event.clientX - rect.left - hoverOffset;
      const mouseY = event.clientY - rect.top - hoverOffset;

      const scaledCellSize = CELL_SIZE * camera.zoom;

      const cellX = Math.max(
        0,
        Math.floor((mouseX - camera.x) / scaledCellSize),
      );
      const cellY = Math.max(
        0,
        Math.floor((mouseY - camera.y) / scaledCellSize),
      );

      return { x: cellX, y: cellY };
    }

    function handleCanvasClick(event: MouseEvent) {
      if (dragStateRef.current.didDrag) {
        dragStateRef.current.didDrag = false;
        return;
      }
      const clickedCell = getCellFromMouse(event);

      if (isPickerOpen && isEyedropperActive) {
        const sampledColor = getDisplayedCellColor(
          clickedCell.x,
          clickedCell.y,
        );
        setSelectedColor(sampledColor);
        setIsEyedropperActive(false);
        return;
      }

      if (isPickerOpen) {
        handleCancelEdit();
        return;
      }

      setSelectedCell(clickedCell);

      setIsPickerOpen(true);
    }

    function handleCanvasMouseMove(event: MouseEvent) {
      const nextHoveredCell = getCellFromMouse(event);

      if (
        hoveredCell &&
        hoveredCell.x === nextHoveredCell.x &&
        hoveredCell.y === nextHoveredCell.y
      ) {
        return;
      }

      hoveredCell = nextHoveredCell;

      if (isPickerOpen && isEyedropperActive) {
        const sampledColor = getDisplayedCellColor(
          hoveredCell.x,
          hoveredCell.y,
        );

        if (sampledColor !== selectedColor) {
          setSelectedColor(sampledColor);
        }
      }

      renderBoard();
    }

    function handleCanvasMouseLeave() {
      hoveredCell = null;
      renderBoard();
    }

    renderBoard();

    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);
    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("mousedown", handleCanvasMouseDown);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      canvas.removeEventListener("wheel", handleCanvasWheel);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("mousedown", handleCanvasMouseDown);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    board,
    selectedColor,
    selectedCell,
    isPickerOpen,
    isEyedropperActive,
    getDisplayedCellColor,
    camera,
    handleCanvasWheel,
    handleCanvasMouseDown,
    handleWindowMouseMove,
    handleWindowMouseUp,
    viewport,
  ]);

  return (
    <div className="app">
      {isPickerOpen && popupPosition && (
        <div
          style={{
            position: "absolute",
            overflow: "visible",
            height: "312px",
            width: "244px",
            left: `${popupPosition!.x}px`,
            top: `${popupPosition!.y}px`,
            backgroundColor: "white",
            border: "1px solid #b0a6a6",
            zIndex: 10,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "8px",
            boxSizing: "border-box",
            padding: "8px",
            borderRadius: "4px",
          }}
        >
          <ChromePicker
            styles={{
              default: {
                picker: {
                  width: "100%",
                  boxSizing: "border-box",
                },
              },
            }}
            color={selectedColor}
            onChange={(color) => setSelectedColor(color.hex)}
          />

          <div
            style={{
              display: "flex",
              gap: "2px",
              width: "100%",
            }}
          >
            <button
              className={`utility-button${isEyedropperActive ? " active-tool" : ""}`}
              onClick={() => setIsEyedropperActive(!isEyedropperActive)}
              style={{
                backgroundColor: "#1756d5",
              }}
            >
              <Pipette size={18} />
            </button>

            <button
              className="utility-button"
              style={{
                flex: 1,
                backgroundColor: "#0bc11d",
              }}
              onClick={handleApplyColor}
            >
              CONFIRM
            </button>

            <button
              className="utility-button"
              style={{
                backgroundColor: "#d63a3a",
              }}
              onClick={handleCancelEdit}
            >
              <X size={23} />
            </button>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="board-canvas"
        width={viewport.width}
        height={viewport.height}
      />
    </div>
  );
}

export default App;
