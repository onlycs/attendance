import type { Narrow } from "@zodios/core/lib/utils.types";

/// Constrain T as much as possible using zodios voodoo magic
export function narrow<T>(a: Narrow<T>): Narrow<T> {
	return a;
}
