<script setup>
const value = ref(4);

setTimeout(() => value.value = 18, 3500);
</script>

<template>
    <NumberScroll :value />
</template>
