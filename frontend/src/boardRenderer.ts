export function worldToScreen(
  x: number,
  y: number,
  cellSize: number,
  camera: { x: number; y: number; zoom: number },
) {
  return {
    x: x * cellSize * camera.zoom + camera.x,
    y: y * cellSize * camera.zoom + camera.y,
  };
}

export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  cellSize: number,
  camera: { x: number; y: number; zoom: number },
) {
  const screen = worldToScreen(x, y, cellSize, camera);
  const scaledCellSize = cellSize * camera.zoom;

  ctx.fillStyle = color;
  ctx.fillRect(screen.x, screen.y, scaledCellSize, scaledCellSize);
}

export function drawHoveredCellBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  camera: { x: number; y: number; zoom: number },
) {
  const screen = worldToScreen(x, y, cellSize, camera);
  const scaledCellSize = cellSize * camera.zoom;

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    screen.x + 0.5,
    screen.y + 0.5,
    scaledCellSize - 1,
    scaledCellSize - 1,
  );
}
