<script setup lang="ts">
import { toast } from "vue-sonner";
import z from "zod";
import api from "~/utils/api";
import { f } from "~/utils/form";

const loading = ref(false);
const crypto = useCrypto();

const form = f.form({
    items: {
        type: f.select(
            {
                brandnew: "New Install",
                migrate: "Migrate",
            },
            { "class:container": "select" },
        ),
        token: f.input(
            {
                title: "Setup Token",
                placeholder: "From your server console",
                type: "password",
                "class:container": "input",
            },
            z.cuid2("Not a valid setup token."),
        ),
        username: f.username({
            title: "Initial Username",
            placeholder: "admin",
            "class:container": "input",
        }),
        password: f.password.new({
            title: "Initial Password",
            "class:container": "input",
        }),
        oldpassword: f.otp(
            {
                title: "Previous Password",
                type: "text",
                size: "md",
                password: true,
                "class:container": "otp",
            },
            z.string().length(8),
        ),
    },
    deps: {
        oldpassword: { type: "migrate" },
    },
    buttons: [
        {
            form: "submit",
            label: "Continue",
            class: "submit",
            kind: "primary",
        },
        {
            action: async () => {
                const res = await api.auth.onboard.token();

                if (res.error) {
                    api.error(res.error, res.response, {
                        handle401: "api-message",
                    });
                    return;
                }

                toast.success(
                    "Check your server's console for the new setup token",
                );
            },
            label: "Get a new setup token",
            class: "link",
            kind: "secondary-card",
        },
    ],
    async submit(output) {
        loading.value = true;

        const end = () => {
            setTimeout(() => loading.value = false, 500); // prevent flashing the spinner
        };

        const oldstudents = await api.auth.onboard.start({
            headers: { "x-token": output.token },
        });

        if (!oldstudents.data) {
            api.error(oldstudents.error, oldstudents.response, {
                handle401: "api-message",
            });
            return end();
        }

        if ((oldstudents.data.length !== 0) !== (output.type === "migrate")) {
            const not = output.type === "migrate" ? "" : " not";
            const act = output.type === "migrate" ? "set up" : "migrate";
            toast.error(`This is${not} a new installation. Please ${act}!`);
            return end();
        }

        // holy shit guys it's time
        const k1 = await crypto.random_bytes(32);

        if (!k1) {
            toast.error("Failed to generate the master key. Please try again");
            return end();
        }

        let newstudents: {
            id_hashed: string;
            first: string;
            last: string;
            id: string;
        }[] = [];

        if (output.type === "migrate") {
            toast.info("Decrypting all student data...");

            const decrypted = await Promise.all(
                oldstudents.data.map(async (s) => {
                    return {
                        id: await OldCrypto.decrypt(s.id, output.oldpassword),
                        first: await OldCrypto.decrypt(
                            s.first,
                            output.oldpassword,
                        ),
                        last: await OldCrypto.decrypt(
                            s.last,
                            output.oldpassword,
                        ),
                    };
                }),
            );

            toast.info("Done! Encrypting with new format...");

            const stream = decrypted.flatMap((s) => [s.id, s.first, s.last]);
            const encrypted = await crypto.encrypt(stream, k1);

            if (!encrypted) {
                toast.error("Encryption failed");
                return end();
            }

            toast.info("Done! Finalizing...");

            for (let i = 0; i < encrypted.length; i += 3) {
                newstudents.push({
                    id_hashed: oldstudents.data[i / 3]!.id_hashed,
                    id: encrypted[i]!,
                    first: encrypted[i + 1]!,
                    last: encrypted[i + 2]!,
                });
            }
        }

        const k1e = await crypto.k1.encrypt(k1, output.password);

        if (!k1e) {
            toast.error("Could not encrypt master key.");
            return end();
        }

        const { v, s } = await srp.register(output.username, output.password);

        const obfinish = await api.auth.onboard.finish({
            body: {
                students: newstudents,
                k1e,
                username: output.username,
                v: hex.from(v),
                s: hex.from(s),
                token: output.token,
            },
        });

        if (obfinish.error) {
            api.error(obfinish.error, obfinish.response, {
                handle401: "api-message",
            });
            return end();
        }

        useRouter().push(redirect.build("/", "onboard"));
    },
});
</script>
<template>
    <div :class="cn('content', loading && 'justify-center')">
        <Form
            v-if="!loading"
            :form
            class="item"
        />
        <Spinner v-else class="spinner" />
    </div>
</template>
<style scoped>
@reference "~/style/tailwind.css";

.content {
    @apply flex flex-col;
    @apply items-center p-2;

    /* desktop styles (md or above) */
    @apply md:w-[32rem] lg:w-[52rem];
    @apply h-md:min-h-[24rem] h-lg:min-h-[34rem];
    @apply h-md:md:bg-card h-md:md:rounded-lg;

    /* mobile styles (below md) */
    @apply max-md:w-full max-md:h-full;
    @apply max-h-md:w-full max-h-md:h-full;
}

.spinner {
    @apply size-32;
}
</style>
<style>
@reference "~/style/tailwind.css";

.content {
    > .item {
        &:not(.select) {
            flex: 1 0 0;
            @apply mt-6 max-md:w-[80%] md:w-96 lg:w-[32rem];
        }

        &.select {
            flex: 0 0 auto;
        }
    }

    > .submit {
        flex: 0 0 auto;
        @apply mt-8 mb-2;
    }

    > .link {
        flex: 0 0 auto;
    }
}
</style>
