import { API_URL } from '@lib/api';
import { makeApi, makeClientMsg, makeServerMsg, WsClientHooks, ZodWsClient } from './lib';
import { z } from 'zod';

export const WS_URL = API_URL.replaceAll('http', 'ws') + '/ws';

const Subscription = z.enum([
    'StudentData',
]);

const Subscribe = makeClientMsg({
    name: 'Subscribe',
    schema: Subscription,
});

const Update = makeClientMsg({
    name: 'Update',
    schema: z.object({
        sub: Subscription,
        value: z.string(),
    }),
});

const StudentDataResponse = makeServerMsg({
    name: 'StudentData',
    schema: z.string(),
});

const ErrorSchema = z.object({
    type: z.enum(['Serde', 'Sqlx', 'Closed', 'Send']),
    source: z.string().optional(),
    location: z.string().optional(),
});

const ErrorResponse = makeServerMsg({
    name: 'Error',
    schema: z.object({
        message: z.string(),
        meta: ErrorSchema,
    }),
});

const Api = makeApi({
    clientMsgs: [Subscribe, Update],
    serverMsgs: [StudentDataResponse, ErrorResponse],
});

export const makeWebsocket = (hooks: WsClientHooks<typeof Api>) => new ZodWsClient(Api, WS_URL, hooks);
