<script setup lang="ts">
const open = ref(true);
</script>

<template>
    <div class="cntr">
        <Checkbox v-model="open" label="Open" />
    </div>
</template>
