// Here, we see the Angad do Vue gymnastics
// hackity hacks galore
// future me: don't touch this please

import { defineComponent, h } from "vue";
import { OTPInput } from "vue-input-otp";

type Props = InstanceType<typeof OTPInput>["$props"];

export default defineComponent({
    name: "OTPInput",
    inheritAttrs: false,
    setup(props: Props, { attrs, slots }) {
        return () => h(OTPInput, { ...attrs, ...props }, slots);
    },
});
