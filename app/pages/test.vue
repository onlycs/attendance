<script setup lang="ts">
import { zPlainTime } from "temporal-zod";

const { form, deps, buttons } = f.form({
    test: f.many({
        title: "tests",
        inner: f.time({
            schema: zPlainTime,
        }),
    }),
}, [
    {
        label: "submit",
        form: "submit",
    },
]);
</script>

<template>
    <div class="cntr">
        <Form :form :deps :buttons />
    </div>
</template>
