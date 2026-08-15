import { syncMarket } from "./syncMarket";
import { getSyncExitCode, getVpsRunKey } from "./syncCli";

async function main() {
  const runKey = getVpsRunKey();
  const startedAt = new Date().toISOString();
  console.log(JSON.stringify({ event: "sync_start", runKey, startedAt }));
  const result = await syncMarket(runKey);
  console.log(JSON.stringify({ event: "sync_finish", ...result }));
  process.exitCode = getSyncExitCode(result);
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "sync_crash", error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }));
  process.exitCode = 1;
});
