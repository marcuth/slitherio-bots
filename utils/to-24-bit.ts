export function to24bit(val1: number, val2: number, val3: number): number {
    return val1 * (256 ** 2) + val2 * 256 + val3
}