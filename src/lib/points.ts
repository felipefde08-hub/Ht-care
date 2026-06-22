export const HEART_POINTS = {
  onboarding: 100,
  checkin: 50,
  mission: 10,
  dataUpdate: 5,
} as const;

export type PointAction = keyof typeof HEART_POINTS;

export function getPointValue(action: PointAction) {
  return HEART_POINTS[action];
}
