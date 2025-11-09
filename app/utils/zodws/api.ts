import { API_URL } from "../api";
import { type WsClientHooks, ZodWsClient } from "./lib";
import { AuthenticateMessage } from "./schema/auth";
import { ErrorMessage } from "./schema/error";
import { ReplicateIncoming, ReplicateOutgoing } from "./schema/replicate";

export const WS_URL = `${API_URL.replaceAll("http", "ws")}/ws`;

export const WebsocketApi = narrow({
    client: [AuthenticateMessage, ReplicateOutgoing],
    server: [ReplicateIncoming, ErrorMessage],
});

export const makeWebsocket = (
    hooks: Partial<WsClientHooks<typeof WebsocketApi>>,
) => ZodWsClient.create(WebsocketApi, WS_URL, hooks);
