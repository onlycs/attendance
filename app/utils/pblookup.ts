/// Position-based lookup

interface SortInstance<T> {
    min: number;
    max: number;
    data: T;
}

class SortStore<T> {
    constructor(private data: SortInstance<T>[] = []) {}

    insert(newItem: SortInstance<T>) {
        // Find insertion position using binary search
        let left = 0;
        let right = this.data.length;

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (this.data[mid]!.min < newItem.min) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        // Check for overlaps with adjacent elements
        const insertPos = left;

        // Check overlap with previous element
        if (insertPos > 0 && this.data[insertPos - 1]!.max > newItem.min) {
            throw new Error("Overlapping insert: conflicts with previous element");
        }

        // Check overlap with next element
        if (
            insertPos < this.data.length
            && this.data[insertPos]!.min < newItem.max
        ) {
            throw new Error("Overlapping insert: conflicts with next element");
        }

        // Insert at the correct position
        this.data.splice(insertPos, 0, newItem);
    }

    query(value: number): Option<T> {
        if (this.data.length === 0) return None;

        // Binary search for the range containing the value
        let left = 0;
        let right = this.data.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const item = this.data[mid]!;

            if (value >= item.min && value < item.max) {
                return Some(item.data);
            } else if (value < item.min) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return None;
    }

    queryOrInsert(value: number, def: () => SortInstance<T>): T {
        const existing = this.query(value);
        if (existing.isSome()) {
            return existing.value;
        }

        const newData = def();
        this.insert(newData);
        return newData.data;
    }
}

export class PBLookup<T> {
    public constructor(
        private values: SortStore<SortStore<T>> = new SortStore(),
    ) {}

    insert(minX: number, maxX: number, minY: number, maxY: number, data: T) {
        // Validate input ranges
        if (minX >= maxX || minY >= maxY) {
            throw new Error("Invalid range: min must be less than max");
        }

        this.values
            .queryOrInsert(minX, () => ({
                min: minX,
                max: maxX,
                data: new SortStore(),
            }))
            .insert({ min: minY, max: maxY, data });
    }

    query(x: number, y: number): Option<T> {
        const yStore = this.values.query(x);
        if (!yStore.isSome()) return None;
        return yStore.value.query(y);
    }

    clear() {
        this.values = new SortStore();
    }
}
