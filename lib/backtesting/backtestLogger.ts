import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "contextual-backtest";
const LOG_FILE = path.join(process.cwd(), "logs", "contextual-backtesting.log");

export async function logBacktestEvent(line: Record<string, unknown>): Promise<void> {
  const row = JSON.stringify({ at: new Date().toISOString(), ...line });
  logInfo(LOG_SCOPE, row);
  try {
    await mkdir(path.dirname(LOG_FILE), { recursive: true });
    await appendFile(LOG_FILE, `${row}\n`, "utf8");
  } catch {
    /* non-blocking */
  }
}
