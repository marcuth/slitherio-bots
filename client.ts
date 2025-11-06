import WebSocket from "ws"
import axios from "axios"
import { EventType } from "./enums/event-type"


type ServerData = {
    ip: string
    port: number
    ac: number
    clu: number
}

export type SlitherIoClientOptions = {
    server: {
        ip: string
        port: number
    }
    nickname: string
    skinId: number
    protocolVersion: number
}

export class SlitherIoClient {
    private socket?: WebSocket
    private pingInterval?: NodeJS.Timeout

    constructor(readonly options: SlitherIoClientOptions) {}

    private async sendStartLoginPacket() {
        const buffer = Buffer.from([99])
        this.socket?.send(buffer)

        console.log("[SlitherClient] Enviado Packet StartLogin ('c').")
    }

    private sendSetUsernameAndSkinPacket() {
        const { nickname, skinId } = this.options
        const nicknameBuffer = Buffer.from(nickname, "utf8")

        // Estrutura: [1 byte 's'] + [1 byte version] + [1 byte skinId] + [1 byte nicknameLength] + [nickname bytes]
        const bufferSize = 4 + nicknameBuffer.length
        const buffer = Buffer.alloc(bufferSize)

        // Byte 0: Tipo de Pacote 's' (115)
        buffer.writeUInt8(115, 0) 
        buffer.writeUInt8(this.options.protocolVersion - 1, 1)
        buffer.writeUInt8(skinId, 2)
        buffer.writeUInt8(nicknameBuffer.length, 3)
        nicknameBuffer.copy(buffer, 4)

        this.socket?.send(buffer)

        console.log(`[SlitherClient] Enviado Packet SetUsernameAndSkin ('s'): Nickname="${nickname}", SkinID=${skinId}.`)
    }

    private async handleMessage(data: Buffer) {
        const messageType = data.toString("ascii", 2, 3)

        switch (messageType) {
            case EventType.PreInitResponse:
                this.handlePreInitResponse(data)
                break
            case EventType.InitialSetup:
                console.log("[SlitherClient] Setup Inicial ('a') recebido. Spawn concluído!")
                this.startPinging()
                break
            default:
                break
        }
    }

    private handlePreInitResponse(data: Buffer) {
        console.log("[SlitherClient] Packet Pre-init Response ('6') recebido. Resolvendo desafio...")
        
        // A lógica do desafio envolve:
        // 1. Decodificar o JS-expression da resposta (data bytes 3-?)
        // 2. Executar o JS para obter um array de valores (o "secret" no código Java)
        // 3. Aplicar a fórmula de decodificação para obter 24 bytes de resposta.

        // --- IMPLEMENTAÇÃO SIMPLIFICADA DO CÁLCULO ---
        // A implementação real é a parte mais difícil e crítica do bot.
        // O código abaixo é uma TRANSLITERACÃO conceitual do algoritmo
        // Java/JS reverso, que retorna os 24 bytes de resposta.
        const secretBuffer = data.slice(3);

        // ✅ CORREÇÃO: Converter explicitamente o Buffer/Uint8Array para number[]
        // Array.from transforma o TypedArray em um array regular.
        const secret: number[] = Array.from(secretBuffer)
        
        // No Slither.io, a resposta é um Buffer de 24 bytes
        const secretAnswer = this.decodeSecret(secret) 
        // ---------------------------------------------------

        // O pacote de resposta para o desafio é: 
        // [1 byte: 10 ('j'?) ou 1] + [24 bytes de resposta]
        const responseBuffer = Buffer.alloc(1 + secretAnswer.length)
        
        // O primeiro byte do pacote de resposta é usualmente '1', 
        // ou depende do cálculo do cliente. Vamos usar '1' ou '10' como placeholder.
        responseBuffer.writeUInt8(1, 0) 
        secretAnswer.copy(responseBuffer, 1)

        this.socket?.send(responseBuffer)
        console.log("[SlitherClient] Resposta do desafio enviada. Enviando Packet SetUsernameAndSkin...")

        // 3. Após enviar a resposta do desafio, envie o pacote de spawn
        this.sendSetUsernameAndSkinPacket()
    }
    
    /**
     * TRANSLITERACÃO do código Java para decodificar o segredo.
     * Este é o CORE do processo anti-bot.
     * @param secret Os bytes (caracteres unicode) do Packet "6".
     * @returns Um Buffer de 24 bytes com a resposta.
     */
    private decodeSecret(secret: number[]): Buffer {
        // Os bytes do Packet "6" são interpretados como caracteres Unicode
        // e o cálculo é feito em cima do valor charCode.
        
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

    async connect() {
        const { ip, port } = this.options.server

        const url = `ws://${ip}:${port}/slither`

        console.log(`[SlitherClient] Tentando conectar a: ${url}`)

        this.socket = new WebSocket(url, {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
                "cache-control": "no-cache",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en-US,en;q=0.9",
                "pragma": "no-cache",
                "origin": "http://slither.io"
            }
        })

        this.socket.on("open", () => {
            console.log(`[SlitherClient] Conectado a ${url}.`)
            this.sendStartLoginPacket()
        })

        this.socket.on("message", (data: Buffer) => {
            this.handleMessage(data)
        })

        this.socket.on("error", (err) => {
            console.error("[SlitherClient] Erro no WebSocket:", err)
        })

        this.socket.on("close", () => {
            console.log("[SlitherClient] Conexão fechada.")
        })
    }

    private sendPingPacket() {
        // Packet Ping: [0] = 251
        const buffer = Buffer.from([251])
        this.socket?.send(buffer)
        // console.log("[SlitherClient] Enviado Ping (251).")
    }

    private startPinging() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
        }

        // Pingar a cada 250ms (crítico para manter a conexão viva)
        this.pingInterval = setInterval(() => {
            this.sendPingPacket()
        }, 250)

        console.log("[SlitherClient] Pinging iniciado (intervalo de 250ms).")
    }

    async disconnect() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = undefined
            console.log("[SlitherClient] Pinging interrompido.")
        }

        this.socket?.close()
    }

    private static to24bit(val1: number, val2: number, val3: number): number {
        return val1 * (256 ** 2) + val2 * 256 + val3
    }

    static async getServers() {
        const response = await axios.get("http://slither.io/i33628.txt")
        const contents: string = response.data
        const dropped = contents.split("").slice(1)
        const converted = dropped.map(c => c.charCodeAt(0) - 97)
        const subtracted = converted.map((n, i) => n - (7 * i))
        const moduloed = subtracted.map(n => ((n % 26) + 26) % 26)
        const evens = moduloed.filter((_, i) => i % 2 === 0).map(n => n * 16)
        const odds = moduloed.filter((_, i) => i % 2 !== 0)
        const merged = evens.map((n, i) => n + (odds[i] ?? 0))

        const result: ServerData[] = []

        let i = 0

        while (i < merged.length) {
            const ip = `${merged[i]}.${merged[i + 1]}.${merged[i + 2]}.${merged[i + 3]}`
            i += 4

            const port = SlitherIoClient.to24bit(merged[i], merged[i + 1], merged[i + 2])
            i += 3

            const ac = SlitherIoClient.to24bit(merged[i], merged[i + 1], merged[i + 2])
            i += 3

            const clu = merged[i]
            i += 1

            result.push({ ip, port, ac, clu })
        }

        return result
    }
}