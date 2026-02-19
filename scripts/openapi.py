import re

export_list: list[str] = []

with open("app/utils/api/hey/sdk.gen.ts", "r") as f:
    gen = f.read()

    lines = [line for line in gen.split("\n") if line.strip().startswith("export const")]

    export_list = [line.split(" ")[2] for line in lines]

type Exports = dict[str, "Exports"] | str
exports: dict[str, Exports] = {}

for export in export_list:
    parts = re.split(r"(?=[A-Z])", export)
    current_level: dict[str, Exports] = exports

    for i, part in enumerate(parts):
        part = part[0].lower() + part[1:]  # lowercase first letter
        last = i == len(parts) - 1

        if last:
            if isinstance(current_level.get(part), dict):
                raise ValueError(f"Conflict in export names for {export}")
            current_level[part] = export
        else:
            if part not in current_level:
                current_level[part] = {}
            if isinstance(current_level[part], str):
                raise ValueError(f"Conflict in export names for {export}")
            current_level = current_level[part] # type: ignore

# if there is an object with only one key, we can flatten it (make sure to join names with underscores to avoid conflicts)
# only for shape {a: {b: c}} -> {a_b: c}
def flatten(obj: dict[str, Exports]) -> dict[str, Exports]:
    for k, v in list(obj.items()):
        if isinstance(v, dict) and len(v) == 1:
            k2, v2 = next(iter(v.items()))
            obj[f"{k}_{k2}"] = v2
            del obj[k]

    return {k: flatten(v) if isinstance(v, dict) else v for k, v in obj.items()}

def construct_obj(obj: dict[str, Exports]) -> str:
    result = "{"

    for k, v in obj.items():
        result += f'"{k}": '
        if isinstance(v, str):
            result += v
        else:
            result += construct_obj(v)
        result += ", "

    result += "}"
    return result

js_obj = construct_obj(flatten(exports))

with open("app/utils/api/client.ts", "w+") as f:
    f.write(f'import {{ {','.join(export_list)} }} from "./hey/sdk.gen";\n\n')
    f.write(f"export default {js_obj} as const;")
