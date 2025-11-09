// today, we witness Angad doing some more type gymnastics (ooooh) (aaaaah)

import type { FilterArrayByValue } from "@zodios/core/lib/utils.types";
import type { z } from "zod";

export interface Message<T = unknown> {
    name: string;
    schema: z.ZodType<T>;
}

export interface ZodWsApi {
    client: Message[];
    server: Message[];
}

export type ClientMessageNames<Api extends ZodWsApi> = Api["client"][number]["name"];

export type ServerMessageNames<Api extends ZodWsApi> = Api["server"][number]["name"];

export type ClientMessage<
    Api extends ZodWsApi,
    Name extends ClientMessageNames<Api>,
> = FilterArrayByValue<Api["client"], { name: Name; }>[number];

export type ServerMessage<
    Api extends ZodWsApi,
    Name extends ServerMessageNames<Api>,
> = FilterArrayByValue<Api["server"], { name: Name; }>[number];

export type ClientMessages<Api extends ZodWsApi> = Api["client"][number];
export type ServerMessages<Api extends ZodWsApi> = Api["server"][number];

export type MessageType<M extends Message> = z.output<M["schema"]>;

export type ClientStatus = "connected" | "disconnected";

export interface WsClientHooks<Api extends ZodWsApi> {
    connect: (client: ZodWsClient<Api, "connected">) => void;
    disconnect: (client: ZodWsClient<Api, "disconnected">) => void;
    messages: Partial<
        {
            [Name in ServerMessageNames<Api>]: (
                client: ZodWsClient<Api, "connected">,
                msg: MessageType<ServerMessage<Api, Name>>,
            ) => void;
        }
    >;
}

export class ZodWsClient<Api extends ZodWsApi, Status extends ClientStatus> {
    private socket: WebSocket;

    private constructor(
        readonly api: Api,
        readonly url: string,
        private readonly hooks: Partial<WsClientHooks<Api>>,
    ) {
        this.socket = null!; // to be initialized in reconnect
        this.reconnect();
    }

    public static create<Api extends ZodWsApi>(
        api: Api,
        url: string,
        hooks: Partial<WsClientHooks<Api>> = {},
    ): ZodWsClient<Api, ClientStatus> {
        return new ZodWsClient<Api, ClientStatus>(api, url, hooks);
    }

    private cast<T extends ClientStatus>(status: T): ZodWsClient<Api, T> {
        return this as unknown as ZodWsClient<Api, T>;
    }

    private async parseMessage({ data }: MessageEvent) {
        let text: string;

        if (typeof data === "string") text = data;
        else if (data instanceof Blob) text = await data.text();
        else if (data instanceof ArrayBuffer) text = Crypt.unbufferize(data);
        else {
            console.warn("Unknown data type:", typeof data, data);
            return;
        }

        this.onMessage(text);
    }

    private async onDisconnect() {
        this.hooks.disconnect?.(this.cast("disconnected"));
    }

    private async onConnect() {
        this.hooks.connect?.(this.cast("connected"));
    }

    private isRegistered(tag: string): tag is ServerMessageNames<Api> {
        return this.api.server.some((msg) => msg.name === tag);
    }

    private messageOf<Name extends ServerMessageNames<Api>>(
        name: Name,
    ): ServerMessage<Api, Name> {
        return this.api.server.find(
            (msg) => msg.name === name,
        )! as ServerMessage<Api, Name>;
    }

    private onMessage(text: string) {
        let message: any;

        try {
            message = JSON.parse(text);
        } catch (e) {
            console.error("ws: Failed to parse server message as JSON:", text);
            return;
        }

        const tag = message.type as string | undefined;

        if (!tag) {
            console.error("ws: Got server message without type tag");
            return;
        }

        if (!this.isRegistered(tag)) {
            console.error("ws: Unregistered server message type:", tag);
            return;
        }

        const schema = this.messageOf(tag).schema;
        const res = schema.safeParse(message.data);

        if (!res.success) {
            console.error(
                "ws: Failed to parse server message:",
                message.data,
                schema,
            );
            return;
        }

        this.hooks.messages?.[tag]?.(this.cast("connected"), res.data as any);
    }

    send<const Type extends ClientMessageNames<Api>>(
        this: ZodWsClient<Api, "connected">,
        type: Type,
        data: MessageType<ClientMessage<Api, Type>>,
    ) {
        const object = data ? { type, data } : { type };

        const text = JSON.stringify(object);
        this.socket.send(text);
    }

    assert<T extends ClientStatus>(status: T): this is ZodWsClient<Api, T> {
        return (
            (this.socket.readyState === WebSocket.OPEN)
                === (status === "connected")
        );
    }

    reconnect() {
        if (this.socket?.readyState === WebSocket.OPEN) return;
        this.socket = new WebSocket(this.url, []);

        this.socket.onopen = this.onConnect.bind(this);
        this.socket.onclose = this.onDisconnect.bind(this);
        this.socket.onmessage = this.parseMessage.bind(this);
        this.socket.onerror = (ev) => {
            console.error("ws: WebSocket error:", ev);
        };
    }
}
