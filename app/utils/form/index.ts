import { z } from "zod";
import type { InputProps } from "~/components/ui/form/Input.vue";
import type { OTPFieldProps } from "~/components/ui/form/otp/Field.vue";
import type { SelectProps } from "~/components/ui/form/Select.vue";
import type { HourType } from "../api";
import api, { HourTypeTitles } from "../api";
import type { ButtonContext, FormButton } from "./button";
import type { Deps } from "./deps";
import {
    type ItemBase,
    ItemCombobox,
    ItemDate,
    ItemInput,
    ItemOTP,
    type ItemProps,
    type Items,
    ItemSelect,
    ItemTime,
} from "./item";
import type { FormOutput, FormOutputLoose } from "./output";

export type FormError<I extends Items> = {
    field: keyof I & string;
    message: string;
};

export interface Form<
    I extends Items,
    D extends Deps<I>,
    B extends FormButton[],
> {
    items: I;
    deps: D;
    buttons: B;
    submit: (data: FormOutput<I, D>, ctx: ButtonContext<B>) => unknown;
    cancel: () => unknown;
    validate: (data: FormOutput<I, D>) => MaybePromise<FormError<I>[]>;
    defaults: FormOutputLoose<I>;
}

export class FormBuilder<
    I extends Items = {},
    D extends Deps<I> = {},
    B extends FormButton[] = [],
> {
    public _submit?: (data: FormOutput<I, D>, ctx: ButtonContext<B>) => unknown;
    public _cancel?: () => unknown;
    public _validate?: (data: FormOutput<I, D>) => MaybePromise<FormError<I>[]>;
    public _defaults: FormOutputLoose<I> = {};

    private constructor(
        public _items: I,
        public _deps: D,
        public _buttons: B,
    ) {}

    static empty() {
        return new FormBuilder({}, {}, [] as FormButton[]);
    }

    items<I2 extends Record<string, ItemBase>>(
        items: I2,
    ): FormBuilder<I2, {}, B> {
        return new FormBuilder(items, {}, this._buttons);
    }

    deps<D2 extends Deps<I>>(deps: D2): FormBuilder<I, D2, B> {
        return new FormBuilder(this._items, deps, this._buttons);
    }

    buttons<B extends FormButton[]>(buttons: B): FormBuilder<I, D, B> {
        return new FormBuilder(this._items, this._deps, buttons);
    }

    submit(
        h: (data: FormOutput<I, D>, ctx: ButtonContext<B>) => unknown,
    ): this {
        this._submit = h;
        return this;
    }

    cancel(h: () => unknown): this {
        this._cancel = h;
        return this;
    }

    validate(h: (data: FormOutput<I, D>) => MaybePromise<FormError<I>[]>) {
        this._validate = h;
        return this;
    }

    defaults(d: FormOutputLoose<I>) {
        this._defaults = d;
        return this;
    }

    build(): Form<I, D, B> {
        return {
            items: this._items,
            deps: this._deps,
            buttons: this._buttons,
            submit: this._submit ?? (() => {}),
            cancel: this._cancel ?? (() => {}),
            validate: this._validate ?? (() => []),
            defaults: this._defaults,
        };
    }
}

export const f = {
    input: ItemInput.build,
    otp: ItemOTP.build,
    select: ItemSelect.build,
    combobox: ItemCombobox.build,
    date: ItemDate.build,
    time: ItemTime.build,

    // project-specific items
    hourtype: {
        any: (
            props: Omit<SelectProps<keyof HourType>, "kv"> & ItemProps = {},
        ) => {
            return f.select<Record<HourType, string>>(HourTypeTitles, {
                title: "Hour Type",
                ...props,
            });
        },
        async available(
            props: Omit<SelectProps<keyof HourType>, "kv"> & ItemProps = {},
        ) {
            const available = await api.roster.allowed();
            const ht = f.hourtype.any();
            const allowed = available.data ?? ht.zod.options;
            const titles = Object.fromEntries(
                allowed.map((k) => [k, ht.props.kv[k]] as const),
            );

            return f.select<Partial<Record<HourType, string>>>(titles, {
                title: "Hour Type",
                ...props,
            });
        },
    },
    username(props: InputProps & ItemProps = {}) {
        return f.input(
            {
                title: "Username",
                placeholder: "_johndoe01",
                ...props,
                type: "username",
                autocomplete: "username",
            },
            z
                .string()
                .min(3, "Must contain at least 3 characters")
                .max(32, "Must contain at most 32 characters")
                .regex(
                    /^[a-zA-Z0-9_]+$/,
                    "Only letters, numbers, and underscores are allowed",
                ),
        );
    },
    password: {
        new(props: InputProps & ItemProps = {}) {
            return f.input(
                {
                    title: "Password",
                    placeholder: "••••••••",
                    ...props,
                    type: "password",
                    autocomplete: "new-password",
                },
                z
                    .string()
                    .min(8, "Must contain at least 8 characters")
                    .regex(
                        /[A-Z]/,
                        "Must contain at least one uppercase letter",
                    )
                    .regex(
                        /[a-z]/,
                        "Must contain at least one lowercase letter",
                    )
                    .regex(/[0-9]/, "Must contain at least one number")
                    .regex(
                        /[^A-Za-z0-9]/,
                        "Must contain at least one special character",
                    ),
            );
        },
        current(props: InputProps & ItemProps = {}) {
            return f.input(
                {
                    title: "Password",
                    placeholder: "••••••••",
                    ...props,
                    type: "password",
                    autocomplete: "current-password",
                },
                z.string(),
            );
        },
    },
    studentId(props: Omit<OTPFieldProps, "length" | "type"> & ItemProps = {}) {
        return f.otp(
            {
                title: "Student ID",
                type: "numeric",
                ...props,
            },
            z
                .string()
                .length(5, "Student ID must contain 5 digits")
                .regex(/^\d*$/, "Student ID must contain only digits"),
        );
    },

    form<I extends Items, D extends Deps<I> = {}, B extends FormButton[] = []>(
        partial: Optionalize<
            Form<I, D, B>,
            "buttons" | "deps" | "submit" | "cancel" | "validate" | "defaults"
        > & {
            buttons?: Narrow<B>;
            deps?: Narrow<D>;
        },
    ): Form<I, D, B> {
        return {
            buttons: [] as any as B,
            deps: {} as any as D,
            submit: () => {},
            cancel: () => {},
            validate: () => [],
            defaults: {},
            ...partial,
        };
    },

    permit<S extends string[]>(...valid: S): S[number][] {
        return valid;
    },
};
