<script
    setup
    lang="ts"
    generic="
    F extends Record<string, Item>, // won't work with F extends Form, formatter gets all fucky
    D extends Deps<F>
"
>
import type { Deps, FormButton, FormOutput, Item } from "~/utils/form";
import type { ButtonProps } from "./Button.vue";

export interface Props<F extends Record<string, Item>, D extends Deps<F>> {
    form: F;
    deps: D;
    buttons: FormButton[];
    class?: string | string[];
}

const props = defineProps<Props<F, D>>();
const emit = defineEmits<{ submit: [FormOutput<F, D>]; cancel: []; }>();
const keys = Object.keys(props.form) as string[];

const outputs = Object.fromEntries(
    Object.keys(props.form).map((k) => [k, ref(null)] as const),
) as Record<string, Ref<unknown | null>>;

const errors = Object.fromEntries(
    Object.keys(props.form).map((k) => [k, ref([] as string[])] as const),
) as Record<string, Ref<string[]>>;

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

        if (!output) {
            errors[k]!.value = ["This field is required."];
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

function submit() {
    showErrors.value = true;
    computeErrors();

    if (Object.values(errors).find((err) => err.value.length > 0)) {
        return;
    }

    const output = {} as any;

    for (const k of renderkeys.value) {
        output[k] = outputs[k]!.value;
    }

    showErrors.value = false;
    emit("submit", output);
}

const actions: Record<
    Exclude<ButtonProps["form"], undefined | Function>,
    () => void
> = {
    cancel: () => emit("cancel"),
    submit: submit,
    reset: () => {
        for (const k of keys) {
            outputs[k]!.value = null;
            errors[k]!.value = [];
        }
    },
};

const renderkeys = computed(() => {
    return keys.filter((key) =>
        Object.entries(props.deps[key] ?? ({} as Record<string, string>)).every(
            ([k2, dep]) => {
                const output = outputs[k2]!.value as string | null;
                if (output === null || !dep) return false;
                return dep === output;
            },
        )
    );
});

onMounted(() => {
    for (const ref of Object.values(outputs)) {
        watch(ref, computeErrors);
    }
});
</script>

<template>
    <div
        v-for="key of renderkeys"
        :class="cn('item', $props.form[key]?.['class:container'], $props.class)"
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
            if ('action' in button) button.action();
            else actions[button.form]();
        }"
    >
        {{ button.label }}
    </Button>
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
</style>
