<template>
    <div class="footer">
        <div class="section self-start">
            <p class="message">Made with</p>
            <Icon name="hugeicons:favourite" class="text-red-500" size="16" />
            <p class="message">by</p>
            <FancyLink href="https://github.com/onlycs" class="message">
                Angad
            </FancyLink>
        </div>

        <div class="section self-end">
            <FancyLink
                href="https://github.com/onlycs/attendance"
                class="linkbox"
                dashless
                lineless
            >
                <Icon class="icon" name="hugeicons:github" />
            </FancyLink>
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.footer {
    @apply right-0 bottom-0 w-screen shrink-0;
    @apply h-10 max-md:h-8;
    @apply flex flex-row items-center justify-between px-4;
    @apply bg-drop;
    @apply z-50;
}

.section {
    @apply flex flex-row items-center;
    @apply gap-3 max-md:gap-2;
    @apply h-full;
}

.message {
    @apply max-md:text-sm;
}

.overflowing {
    @apply max-md:hidden;
}

.linkbox {
    @apply h-[18px] w-[18px];
    @apply text-white;

    .icon {
        @apply h-[18px] w-[18px];
    }
}

* {
    @apply select-none;
}
</style>
