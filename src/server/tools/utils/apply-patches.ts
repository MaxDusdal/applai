export interface Patch {
  old_string: string;
  new_string: string;
}

export class PatchError extends Error {
  constructor(
    public readonly patchIndex: number,
    public readonly reason: "not_found" | "ambiguous",
    public readonly occurrences: number,
    public readonly old_string: string,
  ) {
    const detail =
      reason === "not_found"
        ? `old_string not found in content`
        : `old_string found ${occurrences} times (must be exactly 1) — provide more surrounding context to make it unique`;
    super(`Patch ${patchIndex + 1}: ${detail}`);
    this.name = "PatchError";
  }
}

export function applyPatches(content: string, patches: Patch[]): string {
  let result = content;

  for (let i = 0; i < patches.length; i++) {
    const { old_string, new_string } = patches[i]!;

    // Count occurrences
    let count = 0;
    let searchFrom = 0;
    while (true) {
      const idx = result.indexOf(old_string, searchFrom);
      if (idx === -1) break;
      count++;
      searchFrom = idx + 1;
    }

    if (count === 0) {
      throw new PatchError(i, "not_found", 0, old_string);
    }
    if (count > 1) {
      throw new PatchError(i, "ambiguous", count, old_string);
    }

    // Exactly one match — replace it
    const idx = result.indexOf(old_string);
    result = result.slice(0, idx) + new_string + result.slice(idx + old_string.length);
  }

  return result;
}
