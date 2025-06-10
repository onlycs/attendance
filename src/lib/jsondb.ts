import { FilterArrayByValue, Merge, Narrow } from '@zodios/core/lib/utils.types';
import { z } from 'zod';

export interface DbColumn<T = unknown> {
    name: string;
    schema: z.ZodType<T>;
}

export interface DbTable {
    columns: DbColumn[];
}

export function makeColumn<Column extends DbColumn>(column: Narrow<Column>): Column {
    return column as Column;
}

export function makeColumns<Columns extends DbColumn[]>(columns: Narrow<Columns>): Columns {
    return columns as Columns;
}

export function makeTable<Table extends DbTable>(column: Narrow<Table>): Table {
    return column as Table;
}

type OptionalKeys<T> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];
type RequiredKeys<T> = { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T];
type OptionalIfUndefined<T> = Merge<Pick<Partial<T>, OptionalKeys<T>>, Pick<T, RequiredKeys<T>>>;

type Names<Table extends DbTable> = Table['columns'][number]['name'];
type ColumnOf<Table extends DbTable, Name extends Names<Table>> = FilterArrayByValue<Table['columns'], { name: Name }>[number];
type SchemaOf<Table extends DbTable, Name extends Names<Table>> = ColumnOf<Table, Name>['schema'];
type TypeOf<Table extends DbTable, Name extends Names<Table>> = z.TypeOf<SchemaOf<Table, Name>>;
type DataRow<Table extends DbTable> = OptionalIfUndefined<{ [Name in Names<Table>]: TypeOf<Table, Name> }>;
type DataFilter<Table extends DbTable> = { [Name in Names<Table>]?: TypeOf<Table, Name> | ((val: TypeOf<Table, Name>) => boolean) };
type DataFilterPreds<Table extends DbTable> = { [Name in Names<Table>]?: (val: TypeOf<Table, Name>) => boolean };

type ValueUpdate<Table extends DbTable> = Partial<DataRow<Table>>;
type MapUpdate<Table extends DbTable> = Partial<{ [Name in Names<Table>]: <T extends TypeOf<Table, Name>>(data: T) => T }>;
type ReplaceUpdate<Table extends DbTable> = <Row extends DataRow<Table>>(data: Row) => Row;

function schemaOf<Table extends DbTable, Name extends Names<Table>>(table: Table, name: Name): SchemaOf<Table, Name> | undefined {
    return table.columns.find(col => col.name == name)?.schema;
}

function makePredicates<Table extends DbTable>(filter: DataFilter<Table>): DataFilterPreds<Table> {
    const entires = Object.entries(filter)
        .map(([k, v]) => [k, typeof v == 'function' ? v : (data: unknown) => data == v] as [string, (data: unknown) => boolean]);

    return Object.fromEntries(entires) as DataFilterPreds<Table>;
}

export class JsonDb<Table extends DbTable> {
    private data: Array<DataRow<Table>> = [];

    constructor(public readonly table: Table, toParse: object[] | string = []) {
        if (!Array.isArray(toParse)) {
            toParse = JSON.parse(toParse);
        }

        for (const row of toParse) {
            const building = {} as DataRow<Table>;

            for (const [key, value] of Object.entries(row)) {
                const schema = schemaOf(table, key);
                if (!schema) continue;

                const parsed = schema.parse(value) as TypeOf<Table, Names<Table>>;
                building[key as keyof DataRow<Table>] = parsed as DataRow<Table>[keyof DataRow<Table>]; // idk
            }

            this.data.push(building);
        }
    }

    insert(...rows: Array<DataRow<Table>>) {
        for (const row of rows) {
            this.data.push(row);
        }
    }

    delete(filter: DataFilter<Table>) {
        const preds = makePredicates(filter);

        return this.data
            .map((data, i) => [data, i] as const) // save the index
            .filter(([data, _]) => Object.entries(data).every(([k, v]) => preds[k as Names<Table>]?.(v) ?? true)) // filter only matching
            .map(([_, i]) => i) // keep only index
            .reverse() // reverse (remove rtl)
            .map(idx => this.data.splice(idx, 1)[0]); // collect removed elements
    }

    get(filter: DataFilter<Table>) {
        const preds = makePredicates(filter);
        const matching = this.data
            .filter(data => Object.entries(data).every(([k, v]) => preds[k as Names<Table>]?.(v) ?? true));

        return matching;
    }

    update(filter: DataFilter<Table>, update: MapUpdate<Table> | ValueUpdate<Table> | ReplaceUpdate<Table>) {
        const preds = makePredicates(filter);
        let updatefn: (data: DataRow<Table>) => DataRow<Table>;

        if (typeof update == 'function') {
            updatefn = update;
        } else if (typeof update == 'object') {
            if (typeof Object.values(update)[0] == 'function') {
                const replaceMap = update as MapUpdate<Table>;
                updatefn = (obj: DataRow<Table>) => {
                    for (const key of Object.keys(update)) {
                        const objKey = key as keyof DataRow<Table>;
                        obj[objKey] = replaceMap[objKey]?.(obj[objKey]) ?? obj[objKey];
                    }
                    return obj;
                };
            } else {
                const replaceMap = update as ValueUpdate<Table>;
                updatefn = (obj: DataRow<Table>) => {
                    for (const key of Object.keys(update)) {
                        const objKey = key as keyof DataRow<Table>;
                        obj[objKey] = replaceMap[objKey] ?? obj[objKey];
                    }
                    return obj;
                };
            }
        }

        this.data
            .filter(data => Object.entries(data).every(([k, v]) => preds[k as Names<Table>]?.(v) ?? true))
            .forEach(data => data = updatefn(data));
    }

    serialize() {
        return JSON.stringify(this.data);
    }
}

export const StudentData = makeTable({
    columns: [
        {
            name: 'id',
            schema: z.string(),
        },
        {
            name: 'first',
            schema: z.string(),
        },
        {
            name: 'mi',
            schema: z.string().optional(),
        },
        {
            name: 'last',
            schema: z.string(),
        },
    ],
});
