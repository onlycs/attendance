<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { Select } from "#components";
import { Math2 } from "~/utils/math";
import type { TimeEntry, UpdateQuery } from "~/utils/zodws/api";

defineProps<{
	hashed: string;
	date: Temporal.PlainDate;
	entries: Array<Ref<TimeEntry>>;
	push: (uq: UpdateQuery) => void;
}>();

function entryLabel(entry: TimeEntry) {
	if (!entry.end) return "Ongoing";
	return Math2.formatHours(
		entry.start.until(entry.end).total({ unit: "hours" }),
	);
}
</script>

<template>
	<div class="mroot">
		<div v-for="entry in entries" class="entry" :key="entry.value.id" :id="entry.value.id">
			<div class="header">
				<Button
					kind="error-transparent"
					class="button"
					@click="() => {
						push({
							type: 'Delete',
							id: entry.value.id,
						})
					}"
				>
					<Icon
						name="hugeicons:delete-02"
						size="20"
					/>
				</Button>

				<div class="label">
					{{ entryLabel(entry.value) }}
				</div>
			</div>

			<Select
				:selected="entry.value.kind"
				:options="{
					learning: 'Learning',
					build: 'Build',
					demo: 'Outreach',
					offseason: 'Offseason',
				}"
				@update:selected="(kind) => {
					push({
						type: 'Update',
						id: entry.value.id,
						updates: [{
							type: 'kind',
							data: kind as TimeEntry['kind'],
						}]
					})
				}"
			/>

			<div class="times">
				<TimePickerModelSubmit
					:time="entry.value.start.toPlainTime()"
					@update:time="(time) => {
						push({
							type: 'Update',
							id: entry.value.id,
							updates: [{
								type: 'start',
								data: entry.value.start.with({
									hour: time.hour,
									minute: time.minute,
									second: time.second,
									millisecond: time.millisecond,
								}),
							}]
						})
					}"
					icon="tabler:door-enter"
					color="green"
				/>

				<TimePickerModelSubmit
					:time="entry.value.end ? entry.value.end.toPlainTime() : undefined"
					@update:time="(time) => {
						push({
							type: 'Update',
							id: entry.value.id,
							updates: [{
								type: 'end',
								data: (entry.value.end ?? entry.value.start).with({
									hour: time.hour,
									minute: time.minute,
									second: time.second,
									millisecond: time.millisecond,
								}),
							}]
						})
					}"
					icon="tabler:door-exit"
					color="red"
				/>
			</div>
		</div>

		<Button
			kind="background"
			class="button-add"
			@click="() => {
				const now = Temporal.Now.zonedDateTimeISO().with({
					year: date.year,
					month: date.month,
					day: date.day,
				});

				push({
					type: 'Create',
					studentId: hashed,
					signIn: now.with({ minute: now.minute - 5 }),
					signOut: now,
					hourType: 'learning',
				})
			}"
		>
			<Icon
				name="tabler:plus"
				size="20"
			/>
		</Button>
	</div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.mroot {
	@apply bg-drop rounded-lg;
	@apply border border-border;
	@apply flex flex-col gap-4 p-4;

	.entry {
		@apply bg-background rounded-lg;
		@apply p-2;
		@apply flex flex-col gap-2;

		.header {
			@apply flex flex-row items-center justify-between gap-4;

			.button {
				@apply flex flex-row justify-center items-center p-2.75;
			}

			.label {
				@apply select-none mr-2;
			}
		}

		.times {
			@apply flex flex-row items-center gap-2 w-full;
		}
	}

	.button-add {
		@apply flex items-center justify-center;
	}
}
</style>
