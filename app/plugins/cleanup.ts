export default defineNuxtPlugin(() => {
    const hooks: (() => unknown)[] = [];
    const cleanup = () => {
        hooks.splice(0);
        hooks.push(cleanup);
    };

    hooks.push(cleanup);

    return {
        provide: {
            cleanup: {
                // note: the way we register the run() function, new component may register a hook before old unloads
                // to fix it, add a short delay before adding the hook
                add: ((f: () => unknown) =>
                    setTimeout(() => hooks.push(f), 10)) as (
                    f: unknown,
                ) => void,
                run: () => hooks.reverse().forEach((f) => f()),
            },
        },
    };
});
