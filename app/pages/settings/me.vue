<script setup lang="ts">
import { toast } from "vue-sonner";
import api from "~/utils/api";
import { f } from "~/utils/form";

definePageMeta({ layout: "admin-protected" });

const creds = useCreds();
const crypto = useCrypto();

const formUsername = computed(() => {
    return f.form({
        items: {
            username: f.username({
                title: "Username",
                placeholder: "_johndoe01",
                "class:container": "input",
            }),
        },
        defaults: {
            username: creds.value?.claims.username,
        },
        buttons: [
            {
                kind: "secondary",
                label: "Reset",
                icon: "hugeicons:refresh-01",
                form: "reset",
                class: "button-sm",
            },
            {
                kind: "primary",
                label: "Save",
                icon: "hugeicons:upload-01",
                form: "submit",
                class: "button-sm",
            },
        ],
        async submit(output) {
            const res = await api.admin.update({
                body: {
                    username: output.username,
                    id: creds.value!.claims.sub,
                },
            });

            if (!res.data) {
                api.error(res.error, res.response);
                return;
            }
        },
    });
});

const formPassword = f.form({
    items: {
        new_password: f.password.new({
            title: "New Password",
            "class:container": "input",
        }),
        new_password_confirm: f.password.new({
            title: "Confirm New Password",
            "class:container": "input",
        }),
    },
    buttons: [
        {
            kind: "primary",
            label: "Submit",
            icon: "hugeicons:upload-01",
            form: "submit",
            class: "col-span-3",
        },
    ],
    validate(output) {
        if (output.new_password !== output.new_password_confirm) {
            return [
                {
                    field: "new_password_confirm",
                    message: "Passwords do not match.",
                },
            ];
        }

        return [];
    },
    async submit(output) {
        const { s, v } = await srp.register(
            creds.value!.claims.username,
            output.new_password,
        );

        const k1e = await crypto.k1.encrypt(
            hex.asbytes(creds.value!.k1),
            output.new_password,
        );

        if (!k1e) {
            toast.error("Failed to encrypt master key. Please try again.");
            return;
        }

        const res = await api.auth.reregister({
            body: {
                s: hex.from(s),
                v: hex.from(v),
                k1e,
            },
        });

        if (res.error) {
            api.error(res.error, res.response);
            return;
        }
    },
});
</script>

<template>
    <div class="page">
        <Form :form="formUsername" class="col-span-3 w-4xl">
            <template #item="{ component, props, model, update }">
                <div class="title">Settings</div>

                <div class="setting">
                    <div class="info">
                        <span class="subtitle">
                            {{ props.title }}
                        </span>
                    </div>

                    <div class="end">
                        <component
                            :is="component"
                            v-bind="props"
                            :model-value="model"
                            @update:model-value="update"
                        />
                    </div>
                </div>
            </template>
        </Form>

        <div class="passchange">
            <div class="header">Change Password</div>
            <Form :form="formPassword" class="col-span-3 w-4xl" />
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply grid w-4xl gap-2 overflow-y-scroll py-4 select-none;
    grid-template-columns: 1fr auto auto;
}

.setting {
    @apply flex w-4xl items-center justify-between gap-4;
    @apply rounded-lg bg-card p-2 pl-4;
}

.title {
    @apply mt-4 mb-1 ml-2 text-lg font-normal select-none;
}

.info {
    @apply flex flex-col gap-1 select-none;

    .subtitle {
        @apply ml-1 text-sm;
    }
}

.end {
    @apply flex h-full items-center justify-center gap-2;
}

:deep(.button-sm) {
    @apply h-fit w-fit justify-self-end py-1;
}

.passchange {
    @apply col-span-3 mt-6 rounded-lg bg-card p-8;
    @apply flex flex-col items-center justify-center gap-4;

    .header {
        @apply self-start text-lg;
    }
}
</style>
