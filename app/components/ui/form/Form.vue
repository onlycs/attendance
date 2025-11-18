<script
    setup
    lang="ts"
    generic="
    T extends z.ZodObject<
        { [k: string]: Input; }
    >
"
>
import { zPlainDateInstance, zPlainTimeInstance } from "temporal-zod";
import { z, ZodString } from "zod";

import type { ComboboxProps } from "./Combobox.vue";
import type { OTPFieldProps } from "./otp/Field.vue";
import type { SelectProps } from "./Select.vue";
import type { InstantPickerProps } from "./TimePicker.vue";

export type ZPlainTime = typeof zPlainTimeInstance;
export type ZPlainDate = typeof zPlainDateInstance;
export type Input = ZodString | ZPlainTime | ZPlainDate;
export type Map<I extends Input, T, K, L> = I extends ZodString ? T
    : I extends ZPlainTime ? K
    : L;

export interface MetaBase {
    title: string;
}

export interface MetaInput extends MetaBase {
    type: "input";
    placeholder: string;
}

export interface MetaOTP extends MetaBase {
    type: "otp";
    otp: OTPFieldProps;
}

export interface MetaTime extends MetaBase {
    type: "time";
    time?: InstantPickerProps;
}

export interface MetaDate extends MetaBase {
    type: "date";
    date?: InstantPickerProps;
}

export interface MetaUnion extends MetaBase {
    type: "union";
    union: ComboboxProps;
}

export interface MetaSelect extends MetaBase {
    type: "select";
    select: SelectProps<any>;
}

export type MetaString = MetaInput | MetaOTP | MetaUnion | MetaSelect;
export type Meta<I extends Input> = Map<I, MetaString, MetaTime, MetaDate>;

type Key = keyof T["shape"];
type Value<K extends Key> = z.output<T["shape"][K]>;
type KeyMeta<K extends Key> = Meta<T["shape"][K]>;

const { schema, meta } = defineProps<{
    schema: T;
    meta: { [K in Key]: KeyMeta<K>; };
}>();

const emit = defineEmits<{
    submit: [values: { [K in Key]: Value<K>; }];
    cancel: [];
}>();

const keys: Key[] = Object.keys(schema.shape);

const refs: Ref<{ [K in Key]: Value<K> | null; }> = ref(
    Object.fromEntries(keys.map((key) => [key, null] as const)) as any,
);

const errors: ComputedRef<{ [K in Key]: Option<string>; }> = computed(() => {
    const empty = keys
        .map((key) => [key, refs.value[key]] as const)
        .filter(([k, v]) =>
            !v || typeof v === "string" && v.trim() === ""
            || (meta[k].type === "otp"
                && (v as string).length != meta[k].otp.length)
        )
        .map(([k, _]) => k);

    if (empty.length > 0) {
        return Object.fromEntries(
            keys.map((k) => [
                k,
                empty.includes(k) ? Some("This field is required") : None,
            ]),
        );
    }

    const parsed = schema.safeParse(refs.value);

    if (!parsed.error) {
        return Object.fromEntries(keys.map((key) => [key, None])) as any;
    }

    const issues = parsed.error.issues;
    const paths: { [K in Key]?: string; } = Object.fromEntries(
        issues.map((issue) => [issue.path[0] as Key, issue.message]),
    ) as any;

    return Object.fromEntries(
        keys.map((key) => paths[key] ? [key, Some(paths[key]!)] : [key, None]),
    );
});

function update<K extends Key>(key: K, value: Value<K>) {
    refs.value[key] = value;
}

function submit() {
    if (Object.values(errors.value).some((e) => e.isSome())) return;
    emit("submit", refs.value as any);
}

function get<K extends Key>(key: K): Value<K> | null {
    return refs.value[key];
}

function cancel() {
    emit("cancel");
}
</script>

<template>
    <form class="form">
        <div v-for="key of keys" :key>
            <label :for="key as string">
                {{ $props.meta[key]!.title }}
            </label>

            <div class="input">
                <TimePicker
                    v-if="$props.meta[key].type === 'time'"
                    v-bind="$props.meta[key].time"
                    background="bg"
                    :time="get(key) as any"
                    @update:time="(ev) => update(key, ev as any)"
                />

                <DatePicker
                    v-else-if="$props.meta[key].type === 'date'"
                    v-bind="$props.meta[key].date"
                    background="bg"
                    :date="get(key) as any"
                    @update:date="(ev) => update(key, ev as any)"
                />

                <OTPField
                    v-else-if="$props.meta[key].type === 'otp'"
                    v-bind="$props.meta[key].otp"
                    :otp="get(key) as string ?? ''"
                    @update:otp="(ev) => refs[key] = ev as any"
                />

                <Input
                    v-else-if="$props.meta[key].type === 'input'"
                    :placeholder="$props.meta[key].placeholder"
                    @update:model-value="(ev) => update(key, ev ?? '' as any)"
                />

                <Combobox
                    v-else-if="$props.meta[key].type === 'union'"
                    v-bind="$props.meta[key].union"
                    :model-value="get(key) as string ?? ''"
                    @update:model-value="(ev) => update(key, ev as any)"
                />

                <Select
                    v-else-if="$props.meta[key].type === 'select'"
                    v-bind="$props.meta[key].select"
                    background="bg"
                    :selected="get(key) as string ?? ''"
                    @update:selected="(ev) => update(key, ev as any)"
                />
            </div>

            <div class="error">
                {{
                    errors[key]!.isSome()
                    ? errors[key]!.value
                    : "&nbsp;"
                }}
            </div>
        </div>

        <div class="buttons">
            <Button type="submit" kind="primary" @click.prevent="submit">
                Submit
            </Button>

            <Button type="button" kind="card-2" @click.prevent="cancel">
                Cancel
            </Button>
        </div>
    </form>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.form {
    @apply flex flex-col gap-10 mt-4;
}

.input {
    @apply w-[28rem];
}

.buttons {
    @apply flex flex-col gap-4 mt-2;
}

.error {
    @apply text-red-500 text-sm fixed mt-1;
}
</style>
