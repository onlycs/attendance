import { type core, z } from "zod";
import type { $ZodCheckLengthEqualsDef } from "zod/v4/core";
import type { ButtonProps } from "~/components/ui/form/Button.vue";
import type { InputProps } from "~/components/ui/form/Input.vue";
import type { OTPFieldProps } from "~/components/ui/form/otp/Field.vue";
import type { SelectProps } from "~/components/ui/form/Select.vue";
import type { KeyOf } from "./gymnastics";

export interface ItemBase<Z extends core.SomeType = core.SomeType> {
    schema: Z;
    title?: string;
    "class:container"?: string | string[];
}

export type ItemOutput<I> = I extends ItemBase<infer Z> ? z.output<Z> : never;

export type ItemSelect<Z extends z.ZodEnum = z.ZodEnum> =
    & ItemBase<Z>
    & SelectProps<z.output<Z>>
    & { item: "select"; };

export type ItemInput =
    & ItemBase<z.ZodType<string>>
    & InputProps
    & { item: "input"; };

export type ItemOTP =
    & ItemBase<z.ZodType<string>>
    & OTPFieldProps
    & { item: "otp"; };

export type Item = ItemSelect | ItemInput | ItemOTP;
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

export type FormButton =
    & ButtonProps
    & { label: string; }
    & ({ form: string; } | { action: () => unknown; });

export const f = {
    select<T extends Record<string, string>>(
        options:
            & Omit<ItemBase<z.ZodEnum<{ [K in keyof T & string]: K; }>>, "schema">
            & { schema: T; }
            & Omit<SelectProps<keyof T & string>, "schema" | "kv">,
    ): ItemSelect<z.ZodEnum<{ [K in keyof T & string]: K; }>> {
        return {
            item: "select",
            ...options,
            schema: z.enum(Object.keys(options.schema)),
            kv: options.schema,
            default: options.default,
        } as any;
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

    username(item: Partial<Omit<ItemInput, "item" | "schema" | "type">>): ItemInput {
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

    password(item: Partial<Omit<ItemInput, "item" | "schema" | "type">>): ItemInput {
        return f.input({
            title: "Password",
            placeholder: "••••••••",
            type: "password",
            schema: z.string()
                .min(8, "Must contain at least 8 characters")
                .regex(/[A-Z]/, "Must contain at least one uppercase letter")
                .regex(/[a-z]/, "Must contain at least one lowercase letter")
                .regex(/[0-9]/, "Must contain at least one number")
                .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
            ...item,
        });
    },

    studentId(item: Partial<Omit<ItemOTP, "type" | "schema">>): ItemOTP {
        return f.otp({
            title: "Student ID",
            type: "numeric",
            schema: z.string()
                .length(5, "Student ID must contain 5 digits")
                .regex(/^\d*$/, "Student ID must contain only digits"),
            ...item,
        });
    },

    form<F extends Form, D extends Deps<F> = {}>(
        form: F,
        buttons: FormButton[],
        deps?: D,
    ): { form: F; buttons: FormButton[]; deps: D; } {
        return { form, buttons, deps: deps ?? {} as D };
    },
};
