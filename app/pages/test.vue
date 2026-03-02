<script setup lang="ts">
const open = ref(true);
</script>

<template>
    <div class="cntr">
        <Dialog v-model:open="open"></Dialog>
    </div>
</template>
