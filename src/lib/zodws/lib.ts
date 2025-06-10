// today, we witness Angad doing some complex type gymnastics (ooooh) (aaaaah)

import type { FilterArrayByValue, Narrow } from "@zodios/core/lib/utils.types";
import type { SafeParseReturnType, z } from "zod";

export interface ZodWsClientMessage<T = unknown> {
	name: string;
	schema: z.ZodType<T>;
}

export interface ZodWsServerMessage<T = unknown> {
	name: string;
	schema: z.Schema<T>;
}

export interface ZodWsApi {
	clientMsgs: ZodWsClientMessage[];
	serverMsgs: ZodWsServerMessage[];
}

export function makeClientMsg<Message extends ZodWsClientMessage>(
	message: Narrow<Message>,
): Message {
	return message as Message;
}

export function makeClientMsgs<Messages extends ZodWsClientMessage[]>(
	messages: Narrow<Messages>,
): Messages {
	return messages as Messages;
}

export function makeServerMsg<Message extends ZodWsServerMessage>(
	message: Narrow<Message>,
): Message {
	return message as Message;
}

export function makeServerMsgs<Messages extends ZodWsServerMessage[]>(
	messages: Narrow<Messages>,
): Messages {
	return messages as Messages;
}

export function makeApi<Api extends ZodWsApi>(api: Narrow<Api>): Api {
	return api as Api;
}

export type ClientMessage<
	Api extends ZodWsApi,
	Name extends ClientMessageNames<Api>,
> = FilterArrayByValue<Api["clientMsgs"], { name: Name }>[number];

export type ServerMessage<
	Api extends ZodWsApi,
	Name extends ServerMessageNames<Api>,
> = FilterArrayByValue<Api["serverMsgs"], { name: Name }>[number];

export type ClientMessageNames<Api extends ZodWsApi> =
	Api["clientMsgs"][number]["name"];
export type ServerMessageNames<Api extends ZodWsApi> =
	Api["serverMsgs"][number]["name"];

export type ClientMessages<Api extends ZodWsApi> = Api["clientMsgs"][number];
export type ServerMessages<Api extends ZodWsApi> = Api["serverMsgs"][number];

export type MessageType<
	Message extends ZodWsClientMessage | ZodWsServerMessage,
> = z.TypeOf<Message["schema"]>;

export interface WsClientHooks<Api extends ZodWsApi> {
	onStatus?: (client: ZodWsClient<Api>, status: "open" | "close") => void;
	onError?: (client: ZodWsClient<Api>, event: Event) => void;
	messages: {
		[Name in ServerMessageNames<Api>]?: MessageType<
			ServerMessage<Api, Name>
		> extends never
			? (client: ZodWsClient<Api>) => void
			: (
					client: ZodWsClient<Api>,
					msg: MessageType<ServerMessage<Api, Name>>,
				) => void;
	};
}

export class ZodWsClient<Api extends ZodWsApi> {
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

		const schema = this.api.serverMsgs.find((msg) => msg.name === tag)
			?.schema as ServerMessages<Api>["schema"] | undefined;

		if (!schema) {
			console.error("ws: Unregistered server message type:", tag);
			return;
		}

		const res = schema.safeParse(message.data) as SafeParseReturnType<
			unknown,
			z.TypeOf<ServerMessages<Api>["schema"]>
		>;

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
