export function decodeSlitherSecret(secret: number[]): Buffer {
    const result = Buffer.alloc(24)
    let globalValue = 0

    for (let i = 0; i < 24; i++) {
        let value1 = secret[17 + i * 2]
        if (value1 <= 96) {
            value1 += 32
        }
        value1 = (value1 - 98 - i * 34) % 26
        if (value1 < 0) {
            value1 += 26
        }

        let value2 = secret[18 + i * 2]
        if (value2 <= 96) {
            value2 += 32
        }
        value2 = (value2 - 115 - i * 34) % 26
        if (value2 < 0) {
            value2 += 26
        }

        let interimResult = (value1 << 4) | value2
        let offset = interimResult >= 97 ? 97 : 65
        interimResult -= offset

        if (i === 0) {
            globalValue = 2 + interimResult
        }

        result[i] = (interimResult + globalValue) % 26 + offset
        globalValue += 3 + interimResult
    }

    return result
}