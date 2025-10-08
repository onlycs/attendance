<script setup lang="ts">
import { toast } from 'vue-sonner';
import { ApiClient, apiToast } from '~/utils/api';

const auth = useAuth();
const router = useRouter();
const transition = injectTransition();

async function submit(id: string) {
    const exists = await ApiClient.fetch("student/exists", {
		params: { id: Crypt.sha256(id) },
	});

	if (exists.isErr()) {
		apiToast(exists.error, router.push);
		return;
	}

	if (!exists.value) {
		// student doesn't exist
		toast.warning(
			"You don't have any hours logged. Come back when you get some hours!",
		);
		auth.clear();
		return;
	}

	if (auth.student.value.status !== "ok") {
		auth.student.value.set(id);
	}

	transition.out.trigger().then(() => router.push("/student"));
}
</script>

<template>
	<div class="page">
		<FocusCard
			:animate="false"
			:showText="true"
			:customize="Customize.StrokeWidth(0.5)"
			icon="hugeicons:arrow-up-01"
			title="Back"
			class="back"
			@click="$router.push('/')"
		/>
		<div class="fullscreen">
		    <div class="textbox">
				<Icon name="hugeicons:mortarboard-01" size="64" :customize="Customize.StrokeWidth(0.5)" mode="svg" />
			    Student ID
			</div>
			<div />
			<FormStudentId class="form studentid" size="lg" @submit="submit" />
			<div />
		</div>
	</div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply w-full h-full p-4 gap-4;
    @apply flex flex-col;

    .back {
        @apply w-full;
    }

    .fullscreen {
        @apply w-full h-full bg-drop rounded-lg relative;
        @apply items-center justify-around flex flex-col;

        .textbox {
            @apply absolute flex items-center gap-6 top-8;
            @apply text-xl select-none;
        }
    }
}
</style>
