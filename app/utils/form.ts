import type { FilterArrayByValue } from "@zodios/core/lib/utils.types";
import type { Temporal } from "temporal-polyfill";
import type { ZodTemporal } from "temporal-zod";
import { type core, z } from "zod";
import type { $ZodCheckLengthEqualsDef } from "zod/v4/core";
import type { ButtonProps } from "~/components/ui/form/Button.vue";
import type { ComboboxProps } from "~/components/ui/form/Combobox.vue";
import type { InputProps } from "~/components/ui/form/Input.vue";
import type { OTPFieldProps } from "~/components/ui/form/otp/Field.vue";
import type { SelectProps } from "~/components/ui/form/Select.vue";
import type { InstantPickerProps } from "~/components/ui/form/TimePicker.vue";
import type { HourType } from "./api";
import api from "./api";
import type { KeyOf, MaybePromise, Optionalize } from "./gymnastics";

export interface ItemBase<Z extends core.SomeType = core.SomeType> {
    schema: Z;
    title?: string;
    "class:container"?: string | string[];
}

export type ItemOutput<I> = I extends ItemBase<infer Z> ? z.output<Z> : never;

export type ItemSelect<Z extends z.ZodEnum = z.ZodEnum> =
    & ItemBase<Z>
    & SelectProps<z.output<Z>>
    & { item: "select"; default: z.output<Z>; };

export type ItemInput =
    & ItemBase<z.ZodType<string>>
    & InputProps
    & { item: "input"; };

export type ItemOTP =
    & ItemBase<z.ZodType<string>>
    & OTPFieldProps
    & { item: "otp"; };

export type ItemTime =
    & ItemBase<ZodTemporal<typeof Temporal.PlainTime>>
    & InstantPickerProps
    & { item: "time"; };

export type ItemDate =
    & ItemBase<ZodTemporal<typeof Temporal.PlainDate>>
    & InstantPickerProps
    & { item: "date"; };

export type ItemCombobox<Z extends z.ZodEnum = z.ZodEnum> =
    & ItemBase<Z>
    & ComboboxProps<z.output<Z>>
    & { item: "combobox"; };

export type Item = ItemSelect | ItemInput | ItemOTP | ItemTime | ItemDate | ItemCombobox;
export type Form = Record<string, Item>;

export type Deps<F extends Form> = {
    [K in keyof F]?: {
        [K2 in keyof F]?: ItemOutput<F[K2]> extends string ? string : never;
    };
};

// dprint-ignore
export type DepOutput<F extends Form, K extends keyof F, D extends Deps<F>> = K extends keyof D
    ? ItemOutput<F[K]> | undefined
    : ItemOutput<F[K]>;

export type IndependentOutputs<F extends Form, D extends Deps<F>> = {
    // use KeyOf rather than keyof because D[keyof D] may be never, and keyof never != never
    [K in Exclude<keyof F, KeyOf<D[keyof D]> | keyof D>]: ItemOutput<F[K]>;
};

export type DependentOutputs<F extends Form, K extends keyof F & keyof D, D extends Deps<F>> =
    | ({ [_K in K]: ItemOutput<F[K]>; } & D[K])
    | ({ [_K in K]?: never; } & ({ [K2 in keyof D[K] & keyof F]: Exclude<ItemOutput<F[K2]>, D[K][K2]>; }));

export type FormOutput<F extends Form, D extends Deps<F>> =
    & IndependentOutputs<F, D>
    & ValueIntersection<{ [K in keyof F & keyof D]: DependentOutputs<F, K, D>; }>;

export type FormTemporary<F extends Form> = {
    [K in keyof F]: Ref<ItemOutput<F[K]> | null | undefined>;
};

export type FormButton<C extends string = string> =
    & Partial<ButtonProps>
    & { label: string; }
    & (
        | (
            & (
                | { form: "submit"; context?: C; }
                | { form: "cancel" | "reset"; }
            )
            & {
                action?: never;
            }
        )
        | { form?: never; action: () => unknown; }
    );

export type ButtonAction = Exclude<FormButton["form"], undefined>;

// dprint-ignore
export type ButtonContext<B extends FormButton[]> = FilterArrayByValue<B, { form: 'submit' }>[number]['context'];

export type FormError<F extends Form> = {
    field: keyof F & string;
    message: string;
};

export const f = {
    select<T extends Record<string, string>>(
        options:
            & Omit<ItemBase<z.ZodEnum<{ [K in keyof T & string]: K; }>>, "schema">
            & { schema: T; default: keyof T; }
            & Omit<SelectProps<keyof T & string>, "schema" | "kv">,
    ): ItemSelect<z.ZodEnum<{ [K in keyof T & string]: K; }>> {
        return {
            item: "select",
            ...options,
            schema: z.enum(Object.keys(options.schema)),
            kv: options.schema,
        } as any;
    },

    combobox<O extends Record<string, string>>(
        options:
            & Omit<ItemBase<z.ZodEnum<{ [K in keyof O & string]: K; }>>, "schema">
            & { schema: O; }
            & Omit<ComboboxProps<keyof O & string>, "kv">,
    ): ItemCombobox<z.ZodEnum<{ [K in keyof O & string]: K; }>> {
        return {
            item: "combobox",
            ...options,
            schema: z.enum(Object.keys(options.schema)) as z.ZodEnum<{ [K in keyof O & string]: K; }>,
            kv: options.schema,
        };
    },

    hourtype(
        item:
            & { default?: HourType; }
            & Omit<ItemBase<z.ZodAny>, "schema">
            & Omit<SelectProps<HourType>, "schema" | "kv"> = {},
    ) {
        return f.select<Record<HourType, string>>({
            title: "Hour Type",
            default: "build",
            ...item,
            schema: {
                "build": "Build",
                "learning": "Learning",
                "demo": "Outreach",
                "offseason": "Offseason",
            },
        });
    },

    async hourtype_available(
        item:
            & { default?: HourType; }
            & Omit<ItemBase<z.ZodAny>, "schema">
            & Omit<SelectProps<HourType>, "schema" | "kv"> = {},
    ) {
        const available = await api.roster.allowed();
        const ht = f.hourtype();
        const allowed = available.data ?? ht.schema.options;
        const titles = Object.fromEntries(allowed.map(al => [al, ht.kv[al]] as const));

        return f.select<Partial<Record<HourType, string>>>({
            title: "Hour Type",
            default: allowed.includes("build") ? "build" : "offseason",
            ...item,
            schema: titles,
        });
    },

    input(item: Omit<ItemInput, "item">): ItemInput {
        return {
            ...item,
            item: "input",
        };
    },

    otp(item: ItemBase<z.ZodType<string>> & Omit<OTPFieldProps, "length">): ItemOTP {
        const checks = item.schema.def.checks?.map(c => c._zod.def) ?? [];
        const check: $ZodCheckLengthEqualsDef | undefined = checks.filter(c => c.check === "length_equals")[0] as any;

        return {
            ...item,
            item: "otp",
            length: check?.length ?? 6,
        };
    },

    username(item: Partial<Omit<ItemInput, "item" | "schema" | "type">> = {}): ItemInput {
        return f.input({
            title: "Username",
            placeholder: "_johndoe01",
            type: "username",
            schema: z.string()
                .min(3, "Must contain at least 3 characters")
                .max(30, "Must contain at most 30 characters")
                .regex(/^[a-zA-Z0-9_]+$/, "Only numbers, letters, and underscores are allowed"),
            ...item,
        });
    },

    password: {
        new(item: Partial<Omit<ItemInput, "item" | "schema" | "type">> = {}): ItemInput {
            return f.input({
                title: "Password",
                placeholder: "••••••••",
                type: "password",
                autocomplete: "new-password",
                schema: z.string()
                    .min(8, "Must contain at least 8 characters")
                    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
                    .regex(/[a-z]/, "Must contain at least one lowercase letter")
                    .regex(/[0-9]/, "Must contain at least one number")
                    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
                ...item,
            });
        },
        current(item: Partial<Omit<ItemInput, "item" | "schema" | "type">> = {}): ItemInput {
            return f.input({
                title: "Password",
                placeholder: "••••••••",
                type: "password",
                autocomplete: "current-password",
                schema: z.string(),
                ...item,
            });
        },
    },

    studentId(item: Partial<Omit<ItemOTP, "type" | "schema">> = {}): ItemOTP {
        return f.otp({
            title: "Student ID",
            type: "numeric",
            schema: z.string()
                .length(5, "Student ID must contain 5 digits")
                .regex(/^\d*$/, "Student ID must contain only digits"),
            ...item,
        });
    },

    date(item: Omit<ItemDate, "item">): ItemDate {
        return {
            ...item,
            item: "date",
        };
    },

    time(item: Omit<ItemTime, "item">): ItemTime {
        return {
            ...item,
            item: "time",
        };
    },

    form<F extends Form, D extends Deps<F> = {}, B extends FormButton[] = []>(
        form: F,
        buttons: MaybeRef<Narrow<B>> = [] as any,
        etc: {
            deps?: D;
            submit?: (data: FormOutput<F, D>, context: ButtonContext<B>) => unknown;
            cancel?: () => unknown;
            validate?: (data: FormOutput<F, D>) => MaybePromise<FormError<F>[]>;
            defaults?: Partial<FormOutput<F, D>>;
        } = {},
    ): {
        form: F;
        buttons: MaybeRef<B>;
        deps: D;
        submit: (data: FormOutput<F, D>, context: ButtonContext<B>) => unknown;
        cancel: () => unknown;
        validate?: (data: FormOutput<F, D>) => MaybePromise<FormError<F>[]>;
        defaults?: Partial<FormOutput<F, D>>;
    } {
        return {
            form,
            buttons: buttons as MaybeRef<B>,
            submit: etc.submit ?? (() => {}),
            cancel: etc.cancel ?? (() => {}),
            deps: etc.deps ?? {} as D,
            validate: etc.validate,
            defaults: etc.defaults,
        };
    },
} as const;
