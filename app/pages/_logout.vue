<script setup>
const { auth } = useAuth();
const router = useRouter();

auth.clear();
onMounted(() => setTimeout(() => router.push("/"), 100));
</script>

<template></template>
