export type TelegramDestinationType = "user" | "group" | "channel";

export type TelegramDispatchPipeline =
  | "signal"
  | "premium"
  | "autonomous"
  | "notification"
  | "admin_test";

export type TelegramDispatchLogStatus = "sent" | "sandbox" | "failed" | "skipped";

export interface TelegramDestination {
  id: string;
  name: string;
  type: TelegramDestinationType;
  chat_id: string;
  active: boolean;
  tags: string[];
  created_at: string;
  updated_at?: string;
}

export interface TelegramDestinationInput {
  name: string;
  type: TelegramDestinationType;
  chat_id: string;
  active?: boolean;
  tags?: string[];
}

export interface TelegramRouteContext {
  pipeline: TelegramDispatchPipeline;
  alertType?: string;
  priority?: string;
  tags?: string[];
  fixtureId?: string;
  signalId?: string;
}

export interface TelegramDispatchLogRow {
  id: string;
  destination_id: string | null;
  destination_name: string | null;
  chat_id: string | null;
  pipeline: string;
  alert_type: string | null;
  priority: string | null;
  fixture_id: string | null;
  signal_id: string | null;
  status: TelegramDispatchLogStatus;
  error_message: string | null;
  message_preview: string | null;
  telegram_message_id: string | null;
  latency_ms: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TelegramRoutedSendResult {
  ok: boolean;
  sandbox: boolean;
  delivered: number;
  failed: number;
  skipped: number;
  results: {
    destinationId: string | null;
    destinationName: string | null;
    chatId: string;
    ok: boolean;
    error?: string;
    messageId?: string;
  }[];
  error?: string;
}
