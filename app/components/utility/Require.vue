<script setup lang="ts">
const router = useRouter();
const props = defineProps<{
    redirects: Record<string, () => boolean>;
}>();

onMounted(() => {
    for (const [url, matches] of Object.entries(props.redirects)) {
        if (!matches()) continue;
        router.push(url);
        break;
    }
});
</script>
