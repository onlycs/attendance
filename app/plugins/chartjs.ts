import { CategoryScale, Chart, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";

export default defineNuxtPlugin(() => {
    Chart.register(CategoryScale, Legend, LinearScale, LineElement, PointElement, Title, Tooltip);

    Chart.defaults.backgroundColor = "#191919";
    Chart.defaults.color = "#929292";
    Chart.defaults.borderColor = "#4d4d4d";
});
