<script setup lang="ts" generic="I extends ItemBase">
import type { ModelRef } from "vue";
import type { ItemBase } from "~/utils/form/item";
import type { ItemOutput } from "~/utils/form/output";

export interface Props<I extends ItemBase> {
    item: I;
}

type Output = ItemOutput<I>[];
const props = defineProps<Props<I>>();
const ret: ModelRef<any[], string, any[], any[]> = defineModel<Output>({
    default: [],
});

onMounted(() => {
    if (!ret.value) ret.value = [] as Output;
});
</script>

<template>
    <div class="root">
        <div class="wrapper" v-for="(output, i) of ret">
            <Button kind="danger" class="trash" @click="ret.splice(i, 1)">
                <Icon name="hugeicons:delete-02" size="20" />
            </Button>

            <Select
                v-if="$props.item.isSelect()"
                v-bind="$props.item.props"
                :model-value="output"
                @update:model-value="ret[i] = $event ?? null"
            />

            <Input
                v-else-if="$props.item.isInput()"
                v-bind="$props.item.props"
                :model-value="output"
                @update:model-value="ret[i] = $event ?? null"
            />

            <OTPField
                v-else-if="$props.item.isOTP()"
                v-bind="$props.item.props"
                :model-value="output"
                @update:model-value="ret[i] = $event ?? null"
            />

            <DatePicker
                v-else-if="$props.item.isDate()"
                v-bind="$props.item.props"
                :model-value="output"
                @update:model-value="ret[i] = $event ?? null"
            />

            <TimePicker
                v-else-if="$props.item.isTime()"
                v-bind="$props.item.props"
                :model-value="output"
                @update:model-value="ret[i] = $event ?? null"
            />

            <Combobox
                v-else-if="$props.item.isCombobox()"
                v-bind="$props.item.props"
                :model-value="output"
                @update:model-value="ret[i] = $event ?? null"
            />

            <!--
            I don't actually believe the following will work correctly,
            but who the fuck is actually going to need this
            -->
            <!-- <Many
                v-else-if="$props.item.isMany()"
                :item="$props.item"
                v-model="output"
            /> -->
        </div>

        <Button kind="secondary-drop" @click="ret.push(null)">
            <Icon name="hugeicons:add-01" size="20" />
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
    @apply grid grid-rows-1 gap-2;
    grid-template-columns: auto 1fr;

    .trash {
        @apply h-full aspect-square;
    }
}
</style>
