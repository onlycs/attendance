// today, we witness Angad doing some more type gymnastics (ooooh) (aaaaah)

import type { FilterArrayByValue } from "@zodios/core/lib/utils.types";
import type { z } from "zod";

export interface Message<T = unknown> {
	name: string;
	schema: z.ZodType<T>;
}

export interface WebsocketApi {
	client: Message[];
	server: Message[];
}

export type ClientMessageNames<Api extends WebsocketApi> =
	Api["client"][number]["name"];

export type ServerMessageNames<Api extends WebsocketApi> =
	Api["server"][number]["name"];

export type ClientMessage<
	Api extends WebsocketApi,
	Name extends ClientMessageNames<Api>,
> = FilterArrayByValue<Api["client"], { name: Name }>[number];

export type ServerMessage<
	Api extends WebsocketApi,
	Name extends ServerMessageNames<Api>,
> = FilterArrayByValue<Api["server"], { name: Name }>[number];

export type ClientMessages<Api extends WebsocketApi> = Api["client"][number];
export type ServerMessages<Api extends WebsocketApi> = Api["server"][number];

export type MessageType<M extends Message> = z.infer<M["schema"]>;

export interface WsClientHooks<Api extends WebsocketApi> {
	onStatus?: (client: ZodWsClient<Api>, status: "open" | "close") => void;
	onError?: (client: ZodWsClient<Api>, event: Event) => void;
	messages: {
		[Name in ServerMessageNames<Api>]?: (
			client: ZodWsClient<Api>,
			msg: MessageType<ServerMessage<Api, Name>>,
		) => void;
	};
}

export class ZodWsClient<Api extends WebsocketApi> {
	readonly socket: WebSocket;
	private ready = false;
	private queue: string[] = [];

	constructor(
		readonly api: Api,
		readonly url: string,
		private readonly hooks: WsClientHooks<Api>,
		readonly protocols?: string | string[],
	) {
		this.socket = new WebSocket(url, protocols);
		this.socket.onmessage = async (ev: MessageEvent) => {
			let text: string;

			if (typeof ev.data === "string") {
				text = ev.data;
			} else if (ev.data instanceof Blob) {
				text = await ev.data.text();
			} else if (ev.data instanceof ArrayBuffer) {
				text = new TextDecoder("utf-8").decode(ev.data);
			} else {
				console.warn("Unknown data type:", typeof ev.data, ev.data);
				return;
			}

			this.onmessage(text);
		};

		this.socket.onerror = (ev: Event) => hooks.onError?.(this, ev);
		this.socket.onclose = () => hooks.onStatus?.(this, "close");
		this.socket.onopen = () => {
			this.ready = true;
			this.clearqueue();
			hooks.onStatus?.(this, "open");
		};
	}

	private onmessage(messagestr: string) {
		const message = JSON.parse(messagestr);
		const tag = message.type as string | undefined;

		if (!tag) {
			console.error("ws: Got server message without type tag");
			return;
		}

		const schema = this.api.server.find((msg) => msg.name === tag)?.schema as
			| ServerMessages<Api>["schema"]
			| undefined;

		if (!schema) {
			console.error("ws: Unregistered server message type:", tag);
			return;
		}

		const res = schema.safeParse(message.data);

		if (!res.success) {
			console.error(
				"ws: Failed to parse server message:",
				message.data,
				schema,
			);
			return;
		}

		this.hooks.messages[tag as ServerMessageNames<Api>]?.(this, res.data);
	}

	private clearqueue() {
		for (const el of this.queue) {
			this.socket.send(el);
		}
	}

	send<
		const Type extends ClientMessageNames<Api>,
		Data extends MessageType<ClientMessage<Api, Type>>,
	>(
		type: Type,
		...[data]: Data extends undefined ? [data?: undefined] : [data: Data]
	) {
		const object = data
			? { type, data: data as Data }
			: ({ type } as { type: Type; data?: Data });
		const text = JSON.stringify(object);

		if (this.ready) {
			this.socket.send(text);
		} else {
			this.queue.push(text);
		}
	}
}
