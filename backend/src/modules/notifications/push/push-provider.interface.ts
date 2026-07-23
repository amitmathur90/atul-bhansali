export interface PushProvider {
  send(deviceTokens: string[], title: string, body: string, data?: Record<string, unknown>): Promise<void>;
}
