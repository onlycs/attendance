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

            <component
                :is="$props.item.component"
                v-bind="$props.item.props"
                :model-value="output"
                @update:model-value="ret[i] = $event ?? null"
            />
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
    @apply gap-2 rounded-lg bg-drop p-2;
    @apply w-full;
}

.wrapper {
    @apply grid grid-rows-1 gap-2;
    grid-template-columns: auto 1fr;

    .trash {
        @apply aspect-square h-full;
    }
}
</style>
