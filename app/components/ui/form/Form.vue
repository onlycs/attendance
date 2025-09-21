<script setup lang="ts" generic="T extends z.ZodObject<{ [key: string]: z.ZodString | z.ZodOptional<z.ZodString> }>">
import { z } from "zod";

const { schema } = defineProps<{
	schema: T;
	meta: {
		[K in keyof z.infer<T>]: {
			title: string;
			placeholder?: string;
		};
	};
}>();

const emit = defineEmits<{
	submit: [values: z.infer<T>];
	cancel: [];
}>();

const keys = Object.keys(schema.shape) as (keyof z.infer<T>)[];

const refs = ref(
	Object.fromEntries(keys.map((key) => [key, null] as const)) as {
		[K in keyof z.infer<T>]: string | null;
	},
);

const errors = computed(() => {
	return Object.fromEntries(
		keys.map((key) => {
			const value = refs.value[key];

			if (value === null || value === undefined || value.trim() === "")
				return [
					key,
					schema.shape[key]?.safeParse(undefined).success
						? None
						: Some("This field is required."),
				];

			const result = schema.shape[key as string]!.safeParse(value);
			if (result.success) return [key, None];

			return [key, Some(JSON.parse(result.error.message)[0].message)];
		}) as [string, Option<string>][],
	);
});

function update(key: string, value: string | null) {
	if (value === "") value = null;
	refs.value[key] = value;
}

function submit() {
	if (Object.values(errors.value).some((e) => e.isSome())) return;
	emit("submit", refs.value);
}

function cancel() {
	emit("cancel");
}
</script>

<template>
	<form class="form">
		<div v-for="[key, _] of Object.entries(schema.shape)" :key="key">
			<label :for="key">
				{{ meta[key]!.title }}
			</label>
			
			<div class="input">
				<Input 
					:placeholder="$props.meta[key]!.placeholder" 
					@update:model-value="(ev) => update(key, ev as string | null)"
				/>
			</div>

			<div class="error">
				{{ errors[key]!.isSome() ? errors[key]!.value : "&nbsp;" }}
			</div>
		</div>

		<div class="buttons">
			<Button type="submit" kind="primary" @click.prevent="submit">
				Submit
			</Button>

			<Button type="button" kind="card-2" @click.prevent="cancel">
				Cancel
			</Button>
		</div>
	</form>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.form {
	@apply flex flex-col gap-4;
}

.input {
	@apply w-86;
}

.buttons {
	@apply flex flex-col gap-4 mt-2;
}

.error {
	@apply text-red-500 text-sm;
}
</style>