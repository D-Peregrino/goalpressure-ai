import { isNetworkEngineEnabled, getNetworkConfig } from "@/lib/network/networkConfig";
import { logNetworkEvent } from "@/lib/network/networkLogger";
import { listSharedSignals, createSharedSignal, voteOnSignal } from "@/lib/network/signalExchange";
import { refreshCollectiveConsensus } from "@/lib/network/collectiveConsensus";
import { listOperatorProfiles, rebuildOperatorsFromSignals, ensureOperatorProfile } from "@/lib/network/operatorProfiles";
import { buildMarketConsensus } from "@/lib/network/marketConsensus";
import { listNetworkTimeline, synthesizeTimelineFromActivity, refreshTimelineFromSignal } from "@/lib/network/networkTimeline";
import type {
  NetworkFeedPayload,
  PostSignalInput,
  PostVoteInput,
} from "@/lib/network/network.types";

export async function buildNetworkFeed(): Promise<NetworkFeedPayload | null> {
  if (!isNetworkEngineEnabled()) return null;

  const signals = await listSharedSignals();
  const consensus = await refreshCollectiveConsensus(signals);
  const operators = await rebuildOperatorsFromSignals(signals);
  const storedTimeline = await listNetworkTimeline();
  const synthesized = synthesizeTimelineFromActivity(signals, consensus);
  const timeline =
    storedTimeline.length > synthesized.length ? storedTimeline : synthesized;

  const { emerging } = buildMarketConsensus(consensus);
  const heatmap = emerging;

  await logNetworkEvent({
    event: "feed_built",
    signals: signals.length,
    consensus: consensus.length,
    sandbox: getNetworkConfig().sandbox,
  });

  return { signals, consensus, timeline, heatmap, operators };
}

export async function postNetworkSignal(
  userId: string,
  displayName: string,
  input: PostSignalInput
) {
  if (!isNetworkEngineEnabled()) {
    return { ok: false, error: "network_desabilitado" };
  }

  await ensureOperatorProfile(userId, displayName);
  const result = await createSharedSignal(userId, displayName, input);
  if (!result.ok || !result.signal) return result;

  const signals = await listSharedSignals();
  const consensus = await refreshCollectiveConsensus(signals);
  const ctx = consensus.find((c) => c.fixtureId === input.fixtureId);
  await refreshTimelineFromSignal(result.signal, ctx);
  await rebuildOperatorsFromSignals(signals);

  return result;
}

export async function postNetworkVote(userId: string, input: PostVoteInput) {
  if (!isNetworkEngineEnabled()) {
    return { ok: false, error: "network_desabilitado" };
  }

  const result = await voteOnSignal(userId, input.signalId, input.vote);
  if (result.ok) {
    const signals = await listSharedSignals();
    await rebuildOperatorsFromSignals(signals);
  }
  return result;
}

export { buildMarketConsensus, marketConsensusLabel } from "@/lib/network/marketConsensus";
