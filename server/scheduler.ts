export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function getTwoHourBucket(now = Date.now()) {
  return Math.floor(now / TWO_HOURS_MS);
}

export function getHeartbeatRunKey(taskUid: string, now = Date.now()) {
  return `heartbeat:${taskUid}:${getTwoHourBucket(now)}`;
}
