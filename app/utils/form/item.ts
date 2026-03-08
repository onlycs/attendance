import {
    Checkbox,
    Combobox,
    DatePicker,
    Input,
    Many,
    OTPField,
    Select,
    TimePicker,
} from "#components";
import type { Temporal } from "temporal-polyfill";
import { type ZodTemporal, zPlainDate, zPlainTime } from "temporal-zod";
import type { Component } from "vue";
import { z } from "zod";
import type { $ZodCheckLengthEqualsDef } from "zod/v4/core";
import type { CheckboxProps } from "~/components/ui/form/Checkbox.vue";
import { type ComboboxProps } from "~/components/ui/form/Combobox.vue";
import type { DatePickerProps } from "~/components/ui/form/DatePicker.vue";
import { type InputProps } from "~/components/ui/form/Input.vue";
import { type SelectProps } from "~/components/ui/form/Select.vue";
import { type InstantPickerProps } from "~/components/ui/form/TimePicker.vue";
import { type OTPFieldProps } from "~/components/ui/form/otp/Field.vue";

export interface ItemProps {
    title?: string;
    "class:container"?: string;
    class?: string;
}

export abstract class ItemBase<P = unknown, Z extends z.ZodType = z.ZodType> {
    constructor(
        public props: P & ItemProps,
        public zod: Z,
        public readonly component: Component,
    ) {}

    abstract copy(): this;

    many(): ItemMany<P, Z, this> {
        return new ItemMany(this);
    }

    optional(): ItemBase<P, z.ZodNullable<Z>> {
        const n = this.copy() as any;
        n.zod = n.zod.nullable();
        return n as ItemBase<P, z.ZodNullable<Z>>;
    }
}

export class ItemInput extends ItemBase<InputProps, z.ZodType<string>> {
    private constructor(
        props: InputProps & ItemProps = {},
        zod: z.ZodType<string> = z.string(),
    ) {
        super(props, zod, Input);
    }

    static build(
        props: InputProps & ItemProps = {},
        zod: z.ZodType<string> = z.string(),
    ) {
        return new ItemInput(props, zod);
    }

    copy(): this {
        return new ItemInput({ ...this.props }) as this;
    }
}

export class ItemOTP extends ItemBase<OTPFieldProps, z.ZodType<string>> {
    private constructor(
        props: OTPFieldProps & ItemProps,
        zod: z.ZodType<string> = z.string(),
    ) {
        super(props, zod, OTPField);
    }

    static build(
        props: Omit<OTPFieldProps, "length"> & ItemProps,
        zod: z.ZodType<string>,
    ) {
        const checks = zod.def.checks?.map((c) => c._zod.def) ?? [];
        const check: $ZodCheckLengthEqualsDef | undefined = checks.filter(
            (c) => c.check === "length_equals",
        )[0] as any;

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

export class ItemSelect<Z extends z.ZodEnum = z.ZodEnum> extends ItemBase<
    SelectProps<z.output<Z>>,
    Z
> {
    private constructor(props: SelectProps<z.output<Z>> & ItemProps, zod: Z) {
        super(props, zod, Select);
    }

    static build<T extends Record<string, string>>(
        schema: T,
        props: Omit<SelectProps<keyof T>, "kv"> & ItemProps = {},
    ): ItemSelect<z.ZodEnum<{ [K in keyof T & string]: K }>> {
        return new ItemSelect(
            {
                ...props,
                kv: schema,
            },
            z.enum(Object.keys(schema)) as z.ZodEnum<{
                [K in keyof T & string]: K;
            }>,
        );
    }

    copy(): this {
        return new ItemSelect({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemCheckbox extends ItemBase<CheckboxProps, z.ZodType<boolean>> {
    private constructor(
        props: CheckboxProps & ItemProps,
        zod: z.ZodType<boolean> = z.boolean(),
    ) {
        super(props, zod, Checkbox);
    }

    static build(
        props: CheckboxProps & ItemProps = {},
        zod: z.ZodType<boolean> = z.boolean(),
    ) {
        return new ItemCheckbox(props, zod);
    }

    copy(): this {
        return new ItemCheckbox({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemCombobox<Z extends z.ZodEnum = z.ZodEnum> extends ItemBase<
    ComboboxProps<z.output<Z>>,
    Z
> {
    private constructor(props: ComboboxProps<z.output<Z>> & ItemProps, zod: Z) {
        super(props, zod, Combobox);
    }

    static build<T extends Record<string, string>>(
        schema: T,
        props: Omit<ComboboxProps<keyof T>, "kv"> & ItemProps = {},
    ): ItemCombobox<z.ZodEnum<{ [K in keyof T & string]: K }>> {
        return new ItemCombobox(
            {
                ...props,
                kv: schema,
            },
            z.enum(
                Object.keys(schema),
                "Selection missing or invalid",
            ) as z.ZodEnum<{ [K in keyof T & string]: K }>,
        );
    }

    copy(): this {
        return new ItemCombobox({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemDate extends ItemBase<
    DatePickerProps,
    ZodTemporal<typeof Temporal.PlainDate>
> {
    private constructor(
        props: DatePickerProps & ItemProps,
        zod: ZodTemporal<typeof Temporal.PlainDate>,
    ) {
        super(props, zod, DatePicker);
    }

    static build(
        props: DatePickerProps & ItemProps,
        zod: ZodTemporal<typeof Temporal.PlainDate> = zPlainDate,
    ) {
        return new ItemDate(props, zod);
    }

    copy(): this {
        return new ItemDate({ ...this.props }, this.zod.clone()) as this;
    }
}

export class ItemTime extends ItemBase<
    InstantPickerProps,
    ZodTemporal<typeof Temporal.PlainTime>
> {
    private constructor(
        props: InstantPickerProps & ItemProps,
        zod: ZodTemporal<typeof Temporal.PlainTime>,
    ) {
        super(props, zod, TimePicker);
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
    P = unknown,
    Z extends z.ZodType = z.ZodType,
    A extends ItemBase<P, Z> = ItemBase<P, Z>,
> extends ItemBase<{ item: A }, z.ZodArray<Z>> {
    constructor(public base: A) {
        super(
            {
                ...base.props,
                item: base,
            },
            z.array(base.zod),
            Many,
        );
    }

    copy(): this {
        return new ItemMany(this.base.copy()) as this;
    }
}

export type Items = Record<string, ItemBase<unknown, z.ZodType>>;

export type ItemsMerge<
    I extends Items,
    K extends string,
    A extends ItemBase,
> = I & {
    [KK in K]: A;
};

export type ItemTyProps<A extends ItemBase> =
    A extends ItemBase<infer P, infer _Z> ? P : never;

export type ItemTyZ<A extends ItemBase> =
    A extends ItemBase<infer _P, infer Z> ? Z : never;
