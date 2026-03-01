import type { Temporal } from "temporal-polyfill";
import { type ZodTemporal, zPlainDate, zPlainTime } from "temporal-zod";
import { z } from "zod";
import type { $ZodCheckLengthEqualsDef } from "zod/v4/core";
import type { ComboboxProps } from "~/components/ui/form/Combobox.vue";
import type { InputProps } from "~/components/ui/form/Input.vue";
import type { OTPFieldProps } from "~/components/ui/form/otp/Field.vue";
import type { SelectProps } from "~/components/ui/form/Select.vue";
import type { InstantPickerProps } from "~/components/ui/form/TimePicker.vue";

export interface ItemProps {
    title?: string;
    "class:container"?: string;
}

export abstract class ItemBase<K extends string = string, P = unknown, Z extends z.ZodType = z.ZodType> {
    constructor(public key: K, public props: P & ItemProps, public zod: Z) {}

    abstract copy(): this;

    many(): ItemMany<K, P, Z, this> {
        return new ItemMany(this);
    }

    optional(): ItemBase<K, P, z.ZodNullable<Z>> {
        const n = this.copy() as any;
        n.zod = n.zod.nullable();
        return n as ItemBase<K, P, z.ZodNullable<Z>>;
    }

    isInput(): this is ItemInput {
        return this.key === "input";
    }

    isOTP(): this is ItemOTP {
        return this.key === "otp";
    }

    isSelect(): this is ItemSelect {
        return this.key === "select";
    }

    isCombobox(): this is ItemCombobox {
        return this.key === "combobox";
    }

    isDate(): this is ItemDate {
        return this.key === "date";
    }

    isTime(): this is ItemTime {
        return this.key === "time";
    }

    isMany(): this is ItemMany {
        return this.key === "many";
    }
}

export class ItemInput extends ItemBase<"input", InputProps, z.ZodType<string>> {
    private constructor(props: InputProps & ItemProps = {}, zod: z.ZodType<string> = z.string()) {
        super("input", props, zod);
    }

    static build(props: InputProps & ItemProps = {}, zod: z.ZodType<string> = z.string()) {
        return new ItemInput(props, zod);
    }

    copy(): this {
        return new ItemInput({ ...this.props }) as this;
    }
}

export class ItemOTP extends ItemBase<"otp", OTPFieldProps, z.ZodType<string>> {
    private constructor(props: OTPFieldProps & ItemProps, zod: z.ZodType<string> = z.string()) {
        super("otp", props, zod);
    }

    static build(props: Omit<OTPFieldProps, "length"> & ItemProps, zod: z.ZodType<string>) {
        const checks = zod.def.checks?.map(c => c._zod.def) ?? [];
        const check: $ZodCheckLengthEqualsDef | undefined = checks.filter(c => c.check === "length_equals")[0] as any;

        return new ItemOTP(
            {
                ...props,
                length: check?.length ?? 6,
            },
            zod,
        );
    }

    copy(): this {
        return new ItemOTP({ ...this.props }) as this;
    }
}

export class ItemSelect<Z extends z.ZodEnum = z.ZodEnum> extends ItemBase<"select", SelectProps<z.output<Z>>, Z> {
    private constructor(props: SelectProps<z.output<Z>> & ItemProps, zod: Z) {
        super("select", props, zod);
    }

    static build<T extends Record<string, string>>(
        schema: T,
        props: Omit<SelectProps<keyof T>, "kv"> & ItemProps = {},
    ): ItemSelect<z.ZodEnum<{ [K in keyof T & string]: K; }>> {
        return new ItemSelect(
            {
                ...props,
                kv: schema,
            },
            z.enum(Object.keys(schema)) as z.ZodEnum<{ [K in keyof T & string]: K; }>,
        );
    }

    copy(): this {
        return new ItemSelect({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemCombobox<Z extends z.ZodEnum = z.ZodEnum> extends ItemBase<"combobox", ComboboxProps<z.output<Z>>, Z> {
    private constructor(props: ComboboxProps<z.output<Z>> & ItemProps, zod: Z) {
        super("combobox", props, zod);
    }

    static build<T extends Record<string, string>>(
        schema: T,
        props: Omit<ComboboxProps<keyof T>, "kv"> & ItemProps = {},
    ): ItemCombobox<z.ZodEnum<{ [K in keyof T & string]: K; }>> {
        return new ItemCombobox(
            {
                ...props,
                kv: schema,
            },
            z.enum(Object.keys(schema), "Selection missing or invalid") as z.ZodEnum<{ [K in keyof T & string]: K; }>,
        );
    }

    copy(): this {
        return new ItemCombobox({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemDate extends ItemBase<"date", InstantPickerProps, ZodTemporal<typeof Temporal.PlainDate>> {
    private constructor(props: InstantPickerProps & ItemProps, zod: ZodTemporal<typeof Temporal.PlainDate>) {
        super("date", props, zod);
    }

    static build(
        props: InstantPickerProps & ItemProps,
        zod: ZodTemporal<typeof Temporal.PlainDate> = zPlainDate,
    ) {
        return new ItemDate(props, zod);
    }

    copy(): this {
        return new ItemDate({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemTime extends ItemBase<"time", InstantPickerProps, ZodTemporal<typeof Temporal.PlainTime>> {
    private constructor(props: InstantPickerProps & ItemProps, zod: ZodTemporal<typeof Temporal.PlainTime>) {
        super("time", props, zod);
    }

    static build(
        props: InstantPickerProps & ItemProps,
        zod: ZodTemporal<typeof Temporal.PlainTime> = zPlainTime,
    ) {
        return new ItemTime(props, zod);
    }

    copy(): this {
        return new ItemTime({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemMany<
    K extends string = string,
    P = unknown,
    Z extends z.ZodType = z.ZodType,
    A extends ItemBase<K, P, Z> = ItemBase<K, P, Z>
> extends ItemBase<"many", P, z.ZodArray<Z>> {
    constructor(public base: A) {
        super("many", base.props, z.array(base.zod));
    }

    copy(): this {
        return new ItemMany(this.base.copy()) as this;
    }
}

export type Items = Record<string, ItemBase>;

export type ItemsMerge<I extends Items, K extends string, A extends ItemBase> =
    & I
    & {
        [KK in K]: A;
    };

export type ItemTyKey<A extends ItemBase> = A extends ItemBase<infer K, infer _P, infer _Z> ? K
    : never;

export type ItemTyProps<A extends ItemBase> = A extends ItemBase<infer _K, infer P, infer _Z> ? P
    : never;

export type ItemTyZ<A extends ItemBase> = A extends ItemBase<infer _K, infer _P, infer Z> ? Z
    : never;
