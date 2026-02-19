<script setup lang="ts" generic="I extends Item">
export interface Props<I extends Item> {
    item: I;
}

type Output = (ItemOutput<I> | null)[];
const props = defineProps<Props<I>>();
const ret = defineModel<Output>("value", { default: [] });
const output_unt = ret as Ref<any[]>;

onMounted(() => {
    if (!ret.value) ret.value = [];
});
</script>

<template>
    <div class="root">
        <div class="wrapper" v-for="(output, i) of output_unt">
            <Button
                kind="danger"
                class="trash"
                @click="output_unt.splice(i, 1)"
            >
                <Icon
                    name="hugeicons:delete-02"
                    size="20"
                />
            </Button>

            <Select
                v-if="$props.item.item === 'select'"
                v-bind="$props.item"
                :selected="output"
                @update:selected="output_unt[i] = $event ?? null"
            />

            <Input
                v-else-if="$props.item.item === 'input'"
                v-bind="$props.item"
                :selected="output"
                @update:selected="output_unt[i] = $event ?? null"
            />

            <OTPField
                v-else-if="$props.item.item === 'otp'"
                v-bind="$props.item"
                :otp="output"
                @update:otp="output_unt[i] = $event ?? null"
            />

            <DatePicker
                v-else-if="$props.item.item === 'date'"
                v-bind="$props.item"
                :date="output"
                @update:date="output_unt[i] = $event ?? null"
            />

            <TimePicker
                v-else-if="$props.item.item === 'time'"
                v-bind="$props.item"
                :time="output"
                @update:time="output_unt[i] = $event ?? null"
            />

            <Combobox
                v-else-if="$props.item.item === 'combobox'"
                v-bind="$props.item"
                :selected="output"
                @update:selected="output_unt[i] = $event ?? null"
            />
        </div>

        <Button
            kind="secondary-drop"
            @click="ret.push(null)"
        >
            <Icon
                name="hugeicons:add-01"
                size="20"
            />
        </Button>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.root {
    @apply flex flex-col;
    @apply bg-drop p-2 gap-2 rounded-lg;
    @apply w-full;
}

.wrapper {
    @apply grid grid-rows-1 gap-1;
    grid-template-columns: auto 1fr;

    .trash {
        @apply h-full w-full;
    }
}
</style>
