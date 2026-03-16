import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChromePicker } from "react-color";
import { Pipette, X, Plus, Minus, CircleHelp, Moon, Sun } from "lucide-react";
import walletDisconnectedIcon from "./assets/disconnected.svg";
import walletConnectedIcon from "./assets/connected.svg";
import {
  drawCell,
  drawHoveredCellBorder,
  worldToScreen,
} from "./boardRenderer";

const BOARD_WIDTH = 510;
const BOARD_HEIGHT = 300;
const CELL_SIZE = 5;
const POPUP_WIDTH = 244;
const POPUP_HEIGHT = 312;

type CellPosition = {
  x: number;
  y: number;
};

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

type DragState = {
  isDragging: boolean;
  didDrag: boolean;
  startMouseX: number;
  startMouseY: number;
  startCameraX: number;
  startCameraY: number;
};

type Viewport = {
  width: number;
  height: number;
};

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
  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array.from({ length: BOARD_HEIGHT }, () =>
      Array.from({ length: BOARD_WIDTH }, () => null),
    ),
  );

  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isWalletButtonHovered, setIsWalletButtonHovered] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isIntroVisible, setIsIntroVisible] = useState(true);
  const [isAppVisible, setIsAppVisible] = useState(false);

  const [camera, setCamera] = useState(() => {
    const initialZoom = getMinZoom(window.innerWidth, window.innerHeight) * 1.3;
    return getCenteredCamera(
      window.innerWidth,
      window.innerHeight,
      initialZoom,
    );
  });

  const [viewport, setViewport] = useState<Viewport>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selectedColor, setSelectedColor] = useState("black");

  const viewportRef = useRef(viewport);
  const renderBoardRef = useRef<(() => void) | null>(null);
  const selectedCellRef = useRef(selectedCell);
  const selectedColorRef = useRef(selectedColor);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredCellRef = useRef<CellPosition | null>(null);
  const cameraRef = useRef(camera);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    didDrag: false,
    startMouseX: 0,
    startMouseY: 0,
    startCameraX: 0,
    startCameraY: 0,
  });

  const isPickerOpenRef = useRef(isPickerOpen);
  const isEyedropperActiveRef = useRef(isEyedropperActive);

  useEffect(() => {
    const showAppTimer = window.setTimeout(() => {
      setIsAppVisible(true);
    }, 50);

    const hideIntroTimer = window.setTimeout(() => {
      setIsIntroVisible(false);
    }, 700);

    return () => {
      window.clearTimeout(showAppTimer);
      window.clearTimeout(hideIntroTimer);
    };
  }, []);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    if (!canvasRef.current) return;

    setCanvasRect(canvasRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    isPickerOpenRef.current = isPickerOpen;
  }, [isPickerOpen]);

  useEffect(() => {
    isEyedropperActiveRef.current = isEyedropperActive;
  }, [isEyedropperActive]);

  const getDisplayedCellColor = useCallback(
    (x: number, y: number) => {
      const selectedCell = selectedCellRef.current;

      if (
        selectedCell &&
        isPickerOpenRef.current &&
        x === selectedCell.x &&
        y === selectedCell.y
      ) {
        return selectedColorRef.current;
      }

      return board[y][x] ?? "#ffffff";
    },
    [board],
  );

  const getDisplayedCellColorRef = useRef(getDisplayedCellColor);

  useEffect(() => {
    getDisplayedCellColorRef.current = getDisplayedCellColor;
  }, [getDisplayedCellColor]);

  const clampCamera = useCallback(
    (nextCamera: Camera) => {
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

  const clampCameraRef = useRef(clampCamera);

  useEffect(() => {
    clampCameraRef.current = clampCamera;
  }, [clampCamera]);

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
        clampCameraRef.current({
          ...prev,
          zoom: Math.max(prev.zoom, minZoom),
        }),
      );
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleCanvasWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    const rect = (
      event.currentTarget as HTMLCanvasElement
    ).getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    setCamera((prevCamera) => {
      const zoomSensitivity = 0.0015;
      const zoomAmount = -event.deltaY * zoomSensitivity;

      const viewport = viewportRef.current;
      const minZoom = getMinZoom(viewport.width, viewport.height);
      const nextZoom = Math.max(
        minZoom,
        Math.min(8, prevCamera.zoom + zoomAmount),
      );

      const zoomRatio = nextZoom / prevCamera.zoom;

      const newCameraX = mouseX - (mouseX - prevCamera.x) * zoomRatio;
      const newCameraY = mouseY - (mouseY - prevCamera.y) * zoomRatio;

      return clampCameraRef.current({
        zoom: nextZoom,
        x: newCameraX,
        y: newCameraY,
      });
    });
  }, []);

  const handleCanvasMouseDown = useCallback((event: MouseEvent) => {
    if (isPickerOpenRef.current) return;

    const camera = cameraRef.current;

    dragStateRef.current = {
      isDragging: true,
      didDrag: false,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startCameraX: camera.x,
      startCameraY: camera.y,
    };
  }, []);

  const handleWindowMouseMove = useCallback((event: MouseEvent) => {
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
      clampCameraRef.current({
        x: dragState.startCameraX + deltaX,
        y: dragState.startCameraY + deltaY,
        zoom: prevCamera.zoom,
      }),
    );
  }, []);

  const handleWindowMouseUp = useCallback(() => {
    dragStateRef.current.isDragging = false;
    dragStateRef.current.didDrag = false;
  }, []);

  const zoomBy = useCallback((direction: 1 | -1) => {
    const viewport = viewportRef.current;

    setCamera((prevCamera) => {
      const zoomStep = 0.35 * direction;
      const minZoom = getMinZoom(viewport.width, viewport.height);
      const nextZoom = Math.max(
        minZoom,
        Math.min(8, prevCamera.zoom + zoomStep),
      );

      const centerX = viewport.width / 2;
      const centerY = viewport.height / 2;
      const zoomRatio = nextZoom / prevCamera.zoom;

      const newCameraX = centerX - (centerX - prevCamera.x) * zoomRatio;
      const newCameraY = centerY - (centerY - prevCamera.y) * zoomRatio;

      return clampCameraRef.current({
        zoom: nextZoom,
        x: newCameraX,
        y: newCameraY,
      });
    });
  }, []);

  const renderBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = viewport.width;
    const displayHeight = viewport.height;
    const internalWidth = Math.round(displayWidth * dpr);
    const internalHeight = Math.round(displayHeight * dpr);

    if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
      canvas.width = internalWidth;
      canvas.height = internalHeight;
    }

    const hoveredCell = hoveredCellRef.current;
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

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

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
          drawCell(ctx, x, y, displayColor, CELL_SIZE, camera);
        }
      }
    }

    if (isPickerOpen && isEyedropperActive && hoveredCell) {
      drawHoveredCellBorder(
        ctx,
        hoveredCell.x,
        hoveredCell.y,
        CELL_SIZE,
        camera,
      );
    } else if (selectedCell) {
      drawHoveredCellBorder(
        ctx,
        selectedCell.x,
        selectedCell.y,
        CELL_SIZE,
        camera,
      );
    } else if (hoveredCell) {
      drawHoveredCellBorder(
        ctx,
        hoveredCell.x,
        hoveredCell.y,
        CELL_SIZE,
        camera,
      );
    }
  }, [
    board,
    camera,
    viewport,
    selectedCell,
    selectedColor,
    isPickerOpen,
    isEyedropperActive,
  ]);

  const handleCancelEdit = useCallback(() => {
    setIsPickerOpen(false);
    setSelectedCell(null);
    setIsEyedropperActive(false);
  }, []);

  function handleApplyColor() {
    if (!selectedCell) return;

    setBoard((prevBoard) => {
      const newBoard = prevBoard.map((row) => [...row]);
      newBoard[selectedCell.y][selectedCell.x] = selectedColor;
      return newBoard;
    });

    handleCancelEdit();
  }

  useEffect(() => {
    renderBoard();
  }, [renderBoard]);

  useEffect(() => {
    renderBoardRef.current = renderBoard;
  }, [renderBoard]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isPickerOpenRef.current) {
        handleCancelEdit();
      }
    }

    function getCellFromMouse(event: MouseEvent) {
      const camera = cameraRef.current;
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

      if (isPickerOpenRef.current && isEyedropperActiveRef.current) {
        const sampledColor = getDisplayedCellColorRef.current(
          clickedCell.x,
          clickedCell.y,
        );
        setSelectedColor(sampledColor);
        setIsEyedropperActive(false);
        return;
      }

      if (isPickerOpenRef.current) {
        handleCancelEdit();
        return;
      }

      setSelectedCell(clickedCell);

      setIsPickerOpen(true);
    }

    function handleCanvasMouseMove(event: MouseEvent) {
      const nextHoveredCell = getCellFromMouse(event);

      const hoveredCell = hoveredCellRef.current;

      if (
        hoveredCell &&
        hoveredCell.x === nextHoveredCell.x &&
        hoveredCell.y === nextHoveredCell.y
      ) {
        return;
      }

      hoveredCellRef.current = nextHoveredCell;

      if (isPickerOpenRef.current && isEyedropperActiveRef.current) {
        const sampledColor = getDisplayedCellColorRef.current(
          nextHoveredCell.x,
          nextHoveredCell.y,
        );

        if (sampledColor !== selectedColorRef.current) {
          setSelectedColor(sampledColor);
        }
      }

      renderBoardRef.current?.();
    }

    function handleCanvasMouseLeave() {
      if (!hoveredCellRef.current) return;

      hoveredCellRef.current = null;
      renderBoardRef.current?.();
    }

    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);
    canvas.addEventListener("mousedown", handleCanvasMouseDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      canvas.removeEventListener("wheel", handleCanvasWheel);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
      canvas.removeEventListener("mousedown", handleCanvasMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    handleCanvasWheel,
    handleCanvasMouseDown,
    handleWindowMouseMove,
    handleWindowMouseUp,
    handleCancelEdit,
  ]);

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

  const popupGap = CELL_SIZE * 1.5 * camera.zoom;

  const popupPosition = pickerPosition
    ? (() => {
        const defaultLeft = pickerPosition.x - POPUP_WIDTH - popupGap;
        const flippedLeft =
          pickerPosition.x + CELL_SIZE * camera.zoom + popupGap;
        const defaultTop = pickerPosition.y;
        const flippedTop =
          pickerPosition.y - POPUP_HEIGHT + CELL_SIZE * camera.zoom;
        const wouldOverflowLeft = defaultLeft < 0;
        const wouldOverflowBottom = defaultTop + POPUP_HEIGHT > viewport.height;

        return {
          x: wouldOverflowLeft ? flippedLeft : defaultLeft,
          y: wouldOverflowBottom ? flippedTop : defaultTop,
        };
      })()
    : null;

  const [isWalletHoverFlipEnabled, setIsWalletHoverFlipEnabled] =
    useState(true);

  const shouldShowConnectedIcon = isWalletHoverFlipEnabled
    ? isWalletConnected !== isWalletButtonHovered
    : isWalletConnected;

  const walletIconSrc = shouldShowConnectedIcon
    ? walletConnectedIcon
    : walletDisconnectedIcon;

  const walletAddressPreview = "0x...8dh4";

  return (
    <div
      className={`app ${isDarkMode ? "app--dark" : "app--light"} ${isAppVisible ? "app--visible" : ""}`}
    >
      {isIntroVisible && (
        <div
          className={`intro-splash ${isAppVisible ? "intro-splash--fade" : ""}`}
        >
          <div className="intro-splash__title">BitPlace</div>
        </div>
      )}
      <div className="hud">
        <div className="hud-left">
          <div className="title-group">
            <h1 className="app-title">BitPlace</h1>

            <button
              className={`help-icon-button ${
                isHelpOpen ? "help-icon-button--active" : ""
              }`}
              onClick={() => setIsHelpOpen((prev) => !prev)}
              aria-label="Help"
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </div>

        <div className="hud-right">
          <div className="hud-controls">
            <button
              className="hud-icon-button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              aria-label={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <button
            className={`hud-button ${
              isWalletConnected
                ? "hud-button--connected"
                : "hud-button--disconnected"
            }`}
            onMouseEnter={() => setIsWalletButtonHovered(true)}
            onMouseLeave={() => {
              setIsWalletButtonHovered(false);
              setIsWalletHoverFlipEnabled(true);
            }}
            onClick={(event) => {
              setIsWalletConnected((prev) => !prev);
              setIsWalletHoverFlipEnabled(false);
              event.currentTarget.blur();
            }}
          >
            <span
              className={`wallet-label ${
                isWalletConnected ? "wallet-label--visible" : ""
              }`}
            >
              {walletAddressPreview}
            </span>

            <img
              src={walletIconSrc}
              alt={isWalletConnected ? "Wallet connected" : "Connect wallet"}
              className="wallet-icon"
            />
          </button>
        </div>
      </div>

      {isHelpOpen && (
        <div className="help-popup">
          <div className="help-popup__title">About BitPlace</div>
          <div className="help-popup__body">
            BitPlace is a permanent public pixel board on Arbitrum One.
            <br />
            <br />
            Everyone can view the canvas. Connect a wallet to paint.
            <br />
            <br />
            Each wallet gets 5 free pixels per 24 hours, then extra paints cost
            a small fee.
          </div>
        </div>
      )}

      <div className="zoom-controls">
        <button
          className="hud-icon-button"
          onClick={() => zoomBy(1)}
          aria-label="Zoom in"
        >
          <Plus size={18} />
        </button>

        <button
          className="hud-icon-button"
          onClick={() => zoomBy(-1)}
          aria-label="Zoom out"
        >
          <Minus size={18} />
        </button>
      </div>

      {isPickerOpen && popupPosition && (
        <div
          style={{
            position: "absolute",
            overflow: "visible",
            height: "312px",
            width: "244px",
            left: `${popupPosition!.x}px`,
            top: `${popupPosition!.y}px`,
            backgroundColor: isDarkMode ? "#2a2a2a" : "white",
            border: isDarkMode ? "1px solid #4a4a4a" : "1px solid #b0a6a6",
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
                  background: isDarkMode ? "#2a2a2a" : "#ffffff",
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
        className={`board-canvas ${isDarkMode ? "board-canvas--dark" : "board-canvas--light"}`}
        style={{
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
        }}
      />
    </div>
  );
}

export default App;
