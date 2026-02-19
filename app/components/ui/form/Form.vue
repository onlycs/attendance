<script
    setup
    lang="ts"
    generic="
    F extends Form, // a
    D extends Deps<F>,
    B extends Array<FormButton>
"
>
import type { WatchHandle } from "vue";
import type { MaybePromise } from "~/utils/gymnastics";

export interface Props<
    F extends Form,
    D extends Deps<F>,
    B extends FormButton[]
> {
    form: F;
    deps: D;
    buttons: B;
    defaults?: Partial<FormOutput<F, D>>;
    validate?: (output: FormOutput<F, D>) => MaybePromise<FormError<F>[]>;
    class?: string | string[];
}

const props = defineProps<Props<F, D, B>>();
const emit = defineEmits<
    {
        submit: [FormOutput<F, D>, ButtonContext<B>];
        cancel: [];
        "update:outputs": [outputs: FormTemporary<F>];
    }
>();
const loading = defineModel<boolean>("loading");
const dirty = defineModel<boolean>("dirty", { default: false });
const keys = Object.keys(props.form) as string[];

function collectDefaults(): Record<string, Ref<unknown | null>> {
    const entries: [string, Ref<unknown | null>][] = [];

    for (const k of keys) {
        const item = props.form[k]!;
        const itemInit = item.item === "select" ? item.default : null;
        const init = (props.defaults as any)?.[k] ?? itemInit;
        const x = ref(init);

        const unwatch = watch(x, () => {
            dirty.value = true;
            emit("update:outputs", outputs as FormTemporary<F>);
        });
        onUnmounted(() => unwatch());

        entries.push([k, x]);
    }

    return Object.fromEntries(entries);
}

function collectErrors(): Record<string, Ref<string[]>> {
    const entries: [string, Ref<string[]>][] = [];

    for (const k of keys) {
        entries.push([k, ref([] as string[])]);
    }

    return Object.fromEntries(entries);
}

const outputs = collectDefaults();
const errors = collectErrors();
const showErrors = ref(false);

function computeErrors() {
    if (!showErrors.value) return;

    for (const k of Object.keys(outputs)) {
        const item = props.form[k]!;
        const output = outputs[k]!.value;

        if (!renderkeys.value.includes(k)) {
            errors[k]!.value = [];
            outputs[k]!.value = null;
            continue;
        }

        if (
            !output
            || (Array.isArray(output) && output.length === 0)
        ) {
            errors[k]!.value = ["This field is required."];
            continue;
        }

        if (
            Array.isArray(output)
            && output.some((o) => o === null || o === undefined || o === "")
        ) {
            errors[k]!.value = ["One or more items are empty."];
            continue;
        }

        const result = item.schema.safeParse(output);

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

    if (props.validate) {
        loading.value = true;
        const validationErrors = await props.validate(output);

        await sleep(500); // submit() may mess with loading.value, so sleep the thread, rather than settimeout to avoid race condition
        loading.value = false; // prevent flashing the spinner

        if (validationErrors.length > 0) {
            for (const err of validationErrors) {
                errors[err.field]!.value.push(err.message);
            }

            showErrors.value = true;
            return;
        }
    }

    showErrors.value = false;
    dirty.value = false;
    emit("submit", output, context);
}

const actions = {
    cancel: () => emit("cancel"),
    submit,
    reset: () => {
        for (const k of keys) {
            if (
                props.form[k]!.item !== "select"
                || (props.defaults as any)?.[k] !== undefined
            ) {
                outputs[k]!.value = (props.defaults as any)?.[k] ?? null;
            }

            errors[k]!.value = [];
        }

        showErrors.value = false;
        setTimeout(() => dirty.value = false, 50); // wait for outputs to update
    },
};

const renderkeys = computed(() => {
    return keys.filter((key) =>
        Object.entries(props.deps[key] ?? ({} as Record<string, string>)).every(
            ([k2, dep]) => {
                const output = outputs[k2]!.value as string | null;
                if (output === null || !dep) return false;
                if (Array.isArray(dep)) return dep.includes(output);
                return dep === output;
            },
        )
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

defineExpose({ ...actions });
</script>

<template>
    <template v-if="!loading">
        <div
            v-for="key of renderkeys"
            :class="cn(
                'item',
                $props.form[key]?.['class:container'],
                $props.class,
            )"
            :key
        >
            <label
                :for="key as string"
                class="label"
                v-if="$props.form[key]!.title"
            >
                {{ $props.form[key]!.title }}
            </label>

            <Select
                v-if="$props.form[key]!.item === 'select'"
                v-bind="$props.form[key]!"
                v-model:selected="(outputs as any)[key].value"
            />

            <Input
                v-else-if="$props.form[key]!.item === 'input'"
                v-bind="$props.form[key]!"
                v-model="(outputs as any)[key].value"
            />

            <OTPField
                v-else-if="$props.form[key]!.item === 'otp'"
                v-bind="$props.form[key]!"
                v-model:otp="(outputs as any)[key].value"
            />

            <DatePicker
                v-else-if="$props.form[key]!.item === 'date'"
                v-bind="$props.form[key]!"
                v-model:date="(outputs as any)[key].value"
            />

            <TimePicker
                v-else-if="$props.form[key]!.item === 'time'"
                v-bind="$props.form[key]!"
                v-model:time="(outputs as any)[key].value"
            />

            <Combobox
                v-else-if="$props.form[key]!.item === 'combobox'"
                v-bind="$props.form[key]!"
                v-model:selected="(outputs as any)[key].value"
            />

            <Many
                v-else-if="$props.form[key]!.item === 'many'"
                :item="$props.form[key]!.inner"
                v-model:value="(outputs as any)[key].value"
            />

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
            v-for="button of $props.buttons"
            :key="button.form"
            v-bind="button"
            @click.prevent="() => {
                if (button.action) button.action();
                else if (button.form === 'submit') {
                    submit(button.context as ButtonContext<B>);
                } else actions[button.form]();
            }"
        >
            {{ button.label }}
        </Button>
    </template>
    <Spinner v-else class="spinner" />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.item {
    @apply flex flex-col w-full;

    .label {
        @apply text-sub text-sm ml-2 mb-0.5;
    }
}

.errors {
    @apply flex flex-col gap-2 ml-1;
    @apply mt-1 w-fit p-3;
    @apply rounded-md bg-red-500/10;

    .error {
        .icon {
            @apply inline-block w-5 h-5;
        }

        @apply flex items-center gap-2;
        @apply w-fit text-red-400 text-sm whitespace-nowrap;
    }
}

.spinner {
    @apply size-32;
}
</style>
