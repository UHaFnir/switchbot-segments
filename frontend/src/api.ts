// WebSocket-API der Integration (custom_components/switchbot_segments/websocket.py).
import type { Layout } from "./geometry";
import type { TemplateRequest } from "./template-picker";

export interface Connection {
  sendMessagePromise<T>(msg: Record<string, unknown>): Promise<T>;
  subscribeMessage<T>(callback: (msg: T) => void, msg: Record<string, unknown>): Promise<() => Promise<void>>;
}

export interface Hass {
  connection: Connection;
  language: string;
}

export interface StripInfo {
  entry_id: string;
  title: string;
  segment_count: number;
  layout: Layout;
  layout_saved: boolean;
  colors: string[] | null;
  preview_active: boolean;
  presets: Record<string, string[]>;
  active_preset: string | null;
  live_delay_ms?: number;
}

const P = "switchbot_segments";

export const fetchStrips = (hass: Hass) => hass.connection.sendMessagePromise<StripInfo[]>({ type: `${P}/strips` });

export const readColors = (hass: Hass, entryId: string) =>
  hass.connection.sendMessagePromise<StripInfo>({ type: `${P}/read`, entry_id: entryId });

export const saveLayout = (hass: Hass, entryId: string, layout: Layout) =>
  hass.connection.sendMessagePromise<null>({ type: `${P}/save_layout`, entry_id: entryId, layout });

/** Vorschau starten; die zurueckgegebene Funktion beendet sie (Backend stellt dann wieder her). */
export const startPreview = (hass: Hass, entryId: string) =>
  hass.connection.subscribeMessage<unknown>(() => undefined, { type: `${P}/preview/start`, entry_id: entryId });

export const updatePreview = (hass: Hass, entryId: string, layout: Layout) =>
  hass.connection.sendMessagePromise<{ frames: number }>({ type: `${P}/preview/update`, entry_id: entryId, layout });

export const applyColors = (hass: Hass, entryId: string, colors: string[]) =>
  hass.connection.sendMessagePromise<{ frames: number }>({ type: `${P}/apply_colors`, entry_id: entryId, colors });

const presetCommand = (action: "save" | "apply" | "delete") => (hass: Hass, entryId: string, name: string) =>
  hass.connection.sendMessagePromise<StripInfo>({ type: `${P}/${action}_preset`, entry_id: entryId, name });

export const savePreset = presetCommand("save");
export const applyPreset = presetCommand("apply");
export const deletePreset = presetCommand("delete");

export const renderTemplate = (hass: Hass, entryId: string, request: TemplateRequest, layout: Layout) =>
  hass.connection.sendMessagePromise<{ colors: string[] }>({
    type: `${P}/render_template`,
    entry_id: entryId,
    layout,
    ...request,
  });
