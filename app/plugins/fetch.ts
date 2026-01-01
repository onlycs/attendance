import api from "~/utils/api";

export default defineNuxtPlugin(() => {
    return { provide: { api } };
});
