import { AgGridVue } from "ag-grid-vue3";

import {
    ClientSideRowModelModule,
    ModuleRegistry,
    NumberFilterModule,
    PaginationModule,
    RowSelectionModule,
    TextEditorModule,
    TextFilterModule,
    ValidationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([
    TextEditorModule,
    TextFilterModule,
    NumberFilterModule,
    ClientSideRowModelModule,
    ValidationModule,
    PaginationModule,
    RowSelectionModule,
]);

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component("AgGridVue", AgGridVue);
});
