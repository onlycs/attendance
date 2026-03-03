import type {
    FilterArrayByValue,
    UndefinedIfNever,
} from "@zodios/core/lib/utils.types";
import type { ButtonProps } from "~/components/ui/form/Button.vue";

export type FormButton<C extends string = string> = Partial<ButtonProps> & {
    label: string;
} & (
        | (({ form: "submit"; context?: C } | { form: "cancel" | "reset" }) & {
              action?: never;
          })
        | { form?: never; action: () => unknown }
    );

export type ButtonAction = Exclude<FormButton["form"], undefined>;

export type ButtonContext<B extends FormButton[]> = UndefinedIfNever<
    FilterArrayByValue<B, { form: "submit" }>[number]["context"]
>;
