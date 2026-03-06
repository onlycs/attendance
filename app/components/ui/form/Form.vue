<script
    setup
    lang="ts"
    generic="I extends Items, D extends Deps<I>, B extends FormButton[]"
>
import type { WatchHandle } from "vue";
import type { Form } from "~/utils/form";
import type { ButtonContext, FormButton } from "~/utils/form/button";
import type { Deps } from "~/utils/form/deps";
import { ItemMany, type Items } from "~/utils/form/item";
import type { FormRefs } from "~/utils/form/output";
import { type UndefParam, undefparam } from "~/utils/gymnastics";

export interface FormControlInner<I extends Items, B extends FormButton[]> {
    cancel: () => void;
    clear: () => void;
    submit: UndefParam<ButtonContext<B>>;
    reset: () => void;
    outputs: FormRefs<I>;
}

export type FormControl<F> =
    F extends Form<infer I, any, infer B> ? FormControlInner<I, B> : never;

type F = Form<I, D, B>;

const { form } = defineProps<{ form: F; class?: string | string[] }>();
const emit = defineEmits<{ "update:outputs": [outputs: FormRefs<I>] }>();
const loading = defineModel<boolean>("loading");
const dirty = defineModel<boolean>("dirty", { default: false });

const keys = Object.keys(form.items);
const watchers = [] as WatchHandle[];

onUnmounted(() => {
    for (const unwatch of watchers) unwatch();
    watchers.splice(0, watchers.length);
});

function collectDefaults(): FormRefs<I> {
    if (watchers.length > 0) {
        for (const unwatch of watchers) unwatch();
        watchers.splice(0, watchers.length);
    }

    const entries: [string, Ref<unknown | null>][] = [];

    for (const k of keys) {
        const init = form.defaults[k] ?? null;
        const x = ref(init);

        watchers.push(
            watch(
                x,
                () => {
                    dirty.value = true;
                    emit("update:outputs", outputs);
                },
                { deep: form.items[k] instanceof ItemMany },
            ),
        );

        entries.push([k, x]);
    }

    return Object.fromEntries(entries) as FormRefs<I>;
}

function emptyErrors(): Record<string, Ref<string[]>> {
    const entries: [keyof I, Ref<string[]>][] = [];

    for (const k of keys) {
        entries.push([k as keyof I, ref([] as string[])]);
    }

    return Object.fromEntries(entries) as Record<string, Ref<string[]>>;
}

const outputs = collectDefaults();
const errors = emptyErrors();
const showErrors = ref(false);

function computeErrors() {
    if (!showErrors.value) return;

    for (const k of Object.keys(outputs)) {
        const item = form.items[k]!;
        const _output = outputs[k]!.value;

        // cast item to null if empty
        const isNull = ["", null, undefined].includes(_output as any);
        const output = isNull ? null : _output;

        if (!renderkeys.value.includes(k)) {
            errors[k]!.value = [];
            outputs[k]!.value = null;
            continue;
        }

        if (!item.zod.safeParse(null).success && output === null) {
            errors[k]!.value = ["This field is required."];
            continue;
        }

        const result = item.zod.safeParse(output);

        if (!result.success) {
            const msgs = result.error.issues.map((issue) => issue.message);
            errors[k]!.value = msgs;
            continue;
        }

        errors[k]!.value = [];
    }

    if (!Object.values(errors).find((err) => err.value.length > 0)) {
        showErrors.value = false;
    }
}

async function submit(context: ButtonContext<B>) {
    showErrors.value = true;
    computeErrors();

    if (Object.values(errors).find((err) => err.value.length > 0)) {
        return;
    }

    const output = {} as any;

    for (const k of renderkeys.value) {
        output[k] = outputs[k]!.value;
    }

    loading.value = true;
    const validationErrors = await form.validate(output);

    await sleep(500); // submit() may mess with loading.value, so sleep the thread, rather than settimeout to avoid race condition
    loading.value = false; // sleep then set false to avoid flashing the spinner.

    if (validationErrors.length > 0) {
        for (const err of validationErrors) {
            errors[err.field]!.value.push(err.message);
        }

        showErrors.value = true;
        return;
    }

    showErrors.value = false;
    dirty.value = false;
    form.submit(output, context);
}

const control: FormControl<F> = {
    cancel: form.cancel,
    submit: undefparam(submit),
    reset: () => {
        for (const k of keys) {
            if (form.defaults[k] !== undefined) {
                outputs[k]!.value = form.defaults[k] ?? null;
            }

            errors[k]!.value = [];
        }

        showErrors.value = false;
        setTimeout(() => (dirty.value = false), 50); // wait for outputs to update
    },
    clear: () => {
        for (const k of keys) {
            outputs[k]!.value = null;
            errors[k]!.value = [];
        }

        showErrors.value = false;
        setTimeout(() => (dirty.value = false), 50); // wait for outputs to update
    },
    outputs,
};

const renderkeys = computed(() => {
    return keys.filter((key) =>
        Object.entries(form.deps[key] ?? ({} as Record<string, string>)).every(
            ([k2, dep]) => {
                const output = outputs[k2]!.value as string | null;
                if (output === null || !dep) return false;
                if (Array.isArray(dep)) return dep.includes(output);
                return dep === output;
            },
        ),
    );
});

const hooks: WatchHandle[] = [];
onMounted(() => {
    for (const ref of Object.values(outputs)) {
        hooks.push(watch(ref, computeErrors));
    }
});
onUnmounted(() => {
    for (const hook of hooks) hook();
});

defineExpose(control);
</script>

<template>
    <template v-if="!loading">
        <div
            v-for="key of renderkeys"
            :class="
                cn(
                    'item',
                    form.items[key]!.props['class:container'],
                    $props.class,
                )
            "
            :key
        >
            <slot
                name="item"
                :props="form.items[key]!.props as any"
                :component="form.items[key]!.component"
                :model="(outputs as any)[key].value as unknown"
                :update="(val: unknown) => ((outputs as any)[key]!.value = val)"
            >
                <label
                    :for="key as string"
                    :class="
                        cn(
                            'label',
                            showErrors &&
                                errors[key]!.value.length > 0 &&
                                '!text-red-400',
                        )
                    "
                    v-if="form.items[key]!.props.title"
                >
                    {{ form.items[key]!.props.title }}
                </label>

                <component
                    :is="form.items[key]!.component"
                    v-bind="form.items[key]!.props"
                    v-model="(outputs as any)[key].value"
                />
            </slot>

            <div class="w-2" v-if="showErrors">
                <div class="errors" v-if="errors[key]!.value.length > 0">
                    <div class="error" v-for="error of errors[key]?.value">
                        <Icon name="hugeicons:alert-circle" class="icon" />
                        <span>{{ error }}</span>
                    </div>
                </div>
            </div>
        </div>

        <Button
            v-for="button of form.buttons"
            :key="button.form"
            v-bind="button"
            @click.prevent="
                () => {
                    if (button.action) button.action();
                    else if (button.form === 'submit') {
                        submit(button.context as ButtonContext<B>);
                    } else control[button.form]();
                }
            "
        >
            {{ button.label }}
        </Button>
    </template>
    <Spinner v-else class="spinner" />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.item {
    @apply flex w-full flex-col;

    .label {
        @apply mb-0.5 ml-2 text-sm text-sub;
    }
}

.errors {
    @apply ml-1 flex flex-col gap-2;
    @apply mt-1 w-fit p-3;
    @apply rounded-md bg-red-500/10;

    .error {
        .icon {
            @apply inline-block h-5 w-5;
        }

        @apply flex items-center gap-2;
        @apply w-fit text-sm whitespace-nowrap text-red-400;
    }
}

.spinner {
    @apply size-32;
}
</style>
