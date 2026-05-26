function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getCommandConfig() {
  return {
    enabled: parseBool(process.env.NEXT_PUBLIC_COMMAND_ENABLED ?? process.env.COMMAND_ENABLED, true),
    historyMax: 24,
    storageHistory: "gp-command-history",
    storageMutedLeagues: "gp-command-muted-leagues",
    terminalCommandKey: "gp-terminal-command",
    opsCommandKey: "gp-ops-command",
  };
}

export function isCommandSystemEnabled(): boolean {
  return getCommandConfig().enabled;
}
