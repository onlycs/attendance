<script setup lang="ts">
import { h } from "vue";
import { toast } from "vue-sonner";
import z from "zod";
import FancyLink from "~/components/ui/FancyLink.vue";
import { type FormControl } from "~/components/ui/form/Form.vue";
import api, {
    PermissionTitles,
    type Permission,
    type Permissions,
} from "~/utils/api";
import { f } from "~/utils/form";

definePageMeta({ layout: "admin-protected" });

const res = await api.student.id_config.query();
if (!res.data) api.error(res.error, res.response);

const form_student = f.form({
    items: {
        length: f.input(
            {
                title: "id-length",
                class: "!rounded-md form-input",
            },
            z.string().regex(/^\d+$/, "Must be an integer"),
        ),
        regex: f.input(
            {
                title: "id-regex",
                class: "!rounded-md form-input",
            },
            z.string(),
        ),
    },
    defaults: {
        length: res.data?.length.toString() ?? "",
        regex: res.data?.regex ?? "",
    },
    async submit(data) {
        const res = await api.student.id_config.update({
            body: {
                length: parseInt(data.length),
                regex: data.regex,
            },
        });

        if (res.error) api.error(res.error, res.response);
    },
    validate(data) {
        if (!data.regex.startsWith("^")) {
            return [{ field: "regex", message: "Regex must start with `^`" }];
        }

        if (!data.regex.endsWith("$")) {
            return [{ field: "regex", message: "Regex must end with `$`" }];
        }

        try {
            new RegExp(data.regex);
            return [];
        } catch {
            return [{ field: "regex", message: "Invalid regex" }];
        }
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
});

const Subtitles = {
    "id-length": "Length",
    "id-regex": "Regex",
} as any;

const Descs = {
    "id-length": "The required length of student IDs. Must be an integer.",
    "id-regex": () =>
        h("div", [
            "The regex that student IDs must match. ",
            h(
                FancyLink,
                {
                    href: "https://regexr.com/",
                    target: "_blank",
                    text: "sub",
                },
                "Learn more.",
            ),
        ]),
} as any;

const loading = ref(false);

const { admins } = useAdminData();
const adminNames = adminUsernames(admins);
const selected = ref<string | null>(null);

const perms = ref<Permissions>();
const control = ref<FormControl<any>>();

watch(selected, async (uid) => {
    if (!uid) return;

    perms.value = undefined;
    const res = await api.admin.permissions.query({ path: { id: uid } });
    if (!res.data) api.error(res.error, res.response);

    setTimeout(() => (perms.value = res.data!), 500); // prevent flashing the spinner
});

const perms_form = computed(() => {
    if (!perms.value) return null;

    const checkboxes = Object.fromEntries(
        Object.entries(perms.value).map(([perm, value]) => [
            perm as Permission,
            f.checkbox({ label: PermissionTitles[perm as Permission] }),
        ]),
    ) as Record<Permission, ReturnType<typeof f.checkbox>>;

    return f.form({
        items: checkboxes,
        defaults: perms.value,
        buttons: [
            {
                kind: "primary",
                label: "Save Permissions",
                icon: "hugeicons:upload-01",
                form: "submit",
                class: "col-span-3",
                context: "submit",
            },
            {
                kind: "danger-card",
                label: "Delete Account",
                class: "col-span-3 -mt-4!",
                form: "submit",
                context: "delete",
            },
        ],
        async submit(data, ctx) {
            if (ctx === "delete") {
                const res = await api.admin.delete({
                    body: { admin_id: selected.value! },
                });
                if (res.error) api.error(res.error, res.response);

                selected.value = null;
                return;
            }

            const res = await api.admin.permissions.update({
                path: { id: selected.value! },
                body: data,
            });

            if (res.error) {
                control.value!.reset();
                api.error(res.error, res.response);
            }
        },
    });
});

const dialog = ref(false);
const dialog_loading = ref(false);
const invite_url = ref("");
const creds = useCreds();
const crypto = useCrypto();

const invite_checkboxes = Object.fromEntries(
    Object.entries(PermissionTitles).map(([perm, title]) => [
        perm as Permission,
        f.checkbox({ label: title }),
    ]),
) as Record<Permission, ReturnType<typeof f.checkbox>>;

const invite_form = f.form({
    items: invite_checkboxes,
    defaults: {
        roster: true,
        hours_view: true,
        student_view: true,
    },
    buttons: [
        {
            kind: "primary",
            label: "Create Invite",
            icon: "hugeicons:upload-01",
            form: "submit",
            class: "col-span-3",
        },
    ],
    async submit(data) {
        const k1 = hex.asbytes(creds.value!.k1);

        dialog_loading.value = true;
        dialog.value = true;

        const end = () => {
            setTimeout(() => {
                dialog.value = false;
                dialog_loading.value = false;
            }, 500); // ensure the dialog shows for at least 500ms to prevent flashing
        };

        const res = await api.auth.invite({ body: { permissions: data } });
        if (!res.data) {
            api.error(res.error, res.response);
            return end();
        }

        const k2 = hex.asbytes(res.data.k2);
        const k3 = await crypto.invite.encryptk1(k1, k2);

        if (!k3) {
            toast.error("Failed to encrypt master key. Please try again.");
            return end();
        }

        const url = new URL(window.location.origin);
        url.pathname = "/invite";
        url.searchParams.set("k3", k3);
        url.searchParams.set("token", res.data.token);

        invite_url.value = url.toString();
        dialog_loading.value = false;
    },
});

function copy() {
    navigator.clipboard.writeText(invite_url.value);
    toast.success("Invite URL copied to clipboard");
}
</script>

<template>
    <RequirePerms
        :required="['student_edit', 'admin_invite', 'admin_edit', 'admin_view']"
    >
        <div class="page">
            <Form
                :form="form_student"
                class="col-span-3 w-4xl"
                v-model:loading="loading"
            >
                <template #item="{ component, props, model, update }">
                    <div class="title" v-if="props.title === 'id-length'">
                        Student ID Configuration
                    </div>

                    <div class="setting">
                        <div class="info">
                            <span class="subtitle">
                                {{ Subtitles[props.title] }}
                            </span>

                            <span
                                v-if="typeof Descs[props.title] === 'string'"
                                class="desc"
                            >
                                {{ Descs[props.title] }}
                            </span>

                            <span v-else class="desc">
                                <component :is="Descs[props.title]" />
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

            <div class="title col-span-3 -mb-1!">Admin Management</div>
            <Combobox
                :kv="adminNames"
                v-model="selected"
                class="col-span-3"
                placeholder="Select an admin"
            />
            <HiddenText
                v-if="!selected"
                class="unselected"
                icon="hugeicons:view"
            >
                Select an admin to edit their permissions.
            </HiddenText>
            <HiddenText
                v-else-if="$admin.value?.claims.sub === selected"
                class="unselected"
                icon="hugeicons:square-lock-01"
            >
                Admins cannot edit their own permissions.
            </HiddenText>
            <div class="selected" v-else-if="perms_form">
                <Form ref="control" :form="perms_form" />
            </div>
            <div class="selected flex items-center justify-center" v-else>
                <Spinner class="spinner size-24" />
            </div>

            <div class="title col-span-3 -mb-1!">Invitation</div>
            <div class="selected">
                <span class="col-span-3 -mt-2! -mb-2! -ml-2! text-sub">
                    Select Permissions
                </span>

                <Form :form="invite_form" />
            </div>
        </div>
    </RequirePerms>

    <Dialog
        v-model:open="dialog"
        :xButton="!dialog_loading"
        :escape="!dialog_loading"
    >
        <template v-if="!dialog_loading" #title>Invitation</template>
        <Spinner v-if="dialog_loading" class="mb-4 size-32" />

        <div class="copyable">
            <p class="copytxt">{{ invite_url.repeat(10) }}</p>
            <Button class="clipboard" kind="secondary-drop" @click="copy">
                <Icon name="lets-icons:copy-alt" size="20" />
            </Button>
        </div>
    </Dialog>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply grid w-4xl gap-2 overflow-y-scroll py-4;
    grid-template-columns: 1fr auto auto;
}

.setting {
    @apply flex w-4xl items-center justify-between gap-4;
    @apply rounded-lg bg-card p-2 pl-4;
}

.info {
    @apply flex flex-col gap-1 select-none;

    .subtitle {
        @apply text-sm;
    }

    .desc {
        @apply text-xs text-sub;
    }
}

.title {
    @apply mt-4 mb-1 ml-2 text-lg font-normal select-none;
}

.end {
    @apply flex h-full items-center justify-center gap-2;
}

.unselected {
    @apply col-span-3 rounded-lg bg-card;
}

.selected {
    @apply col-span-3 rounded-lg bg-card;

    @apply grid grid-cols-3 gap-8 p-8;
}

:deep(.form-input) {
    @apply px-4! py-3!;
}

:deep(.button-sm) {
    @apply h-fit w-fit justify-self-end py-1;
}

:deep(.spinner) {
    @apply col-span-3 self-center justify-self-center;
}

.copyable {
    @apply w-full rounded-md bg-drop p-3 pl-4 select-none;
    @apply flex flex-row items-center justify-between gap-4;

    .copytxt {
        @apply min-w-0 truncate text-sm text-sub;
    }

    .clipboard {
        @apply size-8 shrink-0 p-0;
    }
}
</style>
