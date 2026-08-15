export function getVpsRunKey(now = Date.now(), explicit = process.env.SYNC_RUN_KEY, taskUid = process.env.SYNC_TASK_UID) {
  const configured = explicit?.trim();
  if (configured) return configured;
  const twoHourBucket = Math.floor(now / (2 * 60 * 60 * 1000));
  const taskPart = taskUid?.trim() ? `${taskUid.trim()}:` : "";
  return `vps:${taskPart}${twoHourBucket}`;
}

export function getSyncExitCode(result: { status?: string }) {
  return result.status === "failed" ? 1 : 0;
}
