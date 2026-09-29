export const GRID_DIVISIONS = 20;
export const MODULE_SIZE = 1;
export const BASE_SIZE = GRID_DIVISIONS * MODULE_SIZE;
export const CHARACTER_HEIGHT_METERS = 1.8;

export function gridVertices(divisions = GRID_DIVISIONS, height = 0.015) {
  const points = [];
  const size = divisions * MODULE_SIZE;
  for (let division = 0; division <= divisions; division += 1) {
    const coordinate = -size / 2 + division * MODULE_SIZE;
    points.push(-size / 2, height, coordinate, size / 2, height, coordinate);
    points.push(coordinate, height, -size / 2, coordinate, height, size / 2);
  }
  return points;
}

export function scaleForHeight(height) {
  if (!Number.isFinite(height) || height <= 0) throw new RangeError('Character requires a positive height');
  return CHARACTER_HEIGHT_METERS / height;
}
