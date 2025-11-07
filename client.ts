import crypto from "node:crypto"
import WebSocket from "ws"
import axios from "axios"

import { decodeSlitherSecret } from "./utils/decode-slither-secret"
import { lowercaseAlphabet } from "./utils/alphabet"
import { EventType } from "./enums/event-type"
import { to24bit } from "./utils/to-24-bit"

export type ServerData = {
    ip: string
    port: number
    ac: number
    clu: number
}

export type SlitherClientOptions = {
    server: {
        ip: string
        port: number
    }
    nickname: string
    skinId: number
    version: number
}

export type SlitherClientState = {
    isAlive: boolean
    snakeId?: number
}

export type SlitherConnectToFirstServer = Omit<SlitherClientOptions, "server">

export class SlitherClient {
    private socket?: WebSocket
    private pingInterval?: NodeJS.Timeout
    readonly state: SlitherClientState

    constructor(readonly options: SlitherClientOptions) {
        this.state = {
            isAlive: false
        }
    }

    private async sendStartLoginPacket() {
        const buffer = Buffer.from([0x01, 0xC3])
        this.socket?.send(buffer)
    }

    private isValidVersion(version: string) {
        if (typeof version !== "string") return false

        for (let i = 0; i < version.length; i++) {
            const c = version.charCodeAt(i)

            if (!(65 <= c && c <= 122)) return false
        }

        return true
    }

    private gotServerVersion(version: string) {
        if (!this.isValidVersion(version)) {
            return
        }

        let randomId = ""

        for (let i = 0; i < 24; i++) {
            const doUpper = Math.random() < 0.5
            const baseChar = lowercaseAlphabet[i % lowercaseAlphabet.length]
            let code = baseChar.charCodeAt(0)

            if (doUpper) {
                code -= 32
            }

            code += crypto.randomInt(0, 26)
            code = Math.max(65, Math.min(122, code))
            randomId += String.fromCharCode(code)
        }

        const idba = Buffer.from(randomId, "utf8")

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(idba)
        } else {
            throw new Error("WebSocket not open; cannot send idba yet.")
        }
    }

    private sendInitialSetup() {
        const { nickname, skinId } = this.options
        const nicknameBuffer = Buffer.from(nickname, "utf8")

        const bufferSize = 4 + nicknameBuffer.length
        const buffer = Buffer.alloc(bufferSize)
        const header = Buffer.alloc(5)

        header.writeUInt8(0x02, 0)
        header.writeUInt16BE(this.options.version, 1)
        header.writeUInt8(skinId, 3)
        header.writeUInt8(nicknameBuffer.length, 4)

        this.socket?.send(buffer)

        console.log(`[SlitherClient] Enviado Packet SetUsernameAndSkin ('s'): Nickname="${nickname}", SkinID=${skinId}.`)
    }

    private handleAddOrRemoveSnake(data: Buffer) {

    }

    private async handleMessage(data: Buffer) {
        const messageType = data.toString("ascii", 2, 3)

        console.log("[SlitherClient] Nova mensagem", messageType)

        switch (messageType) {
            case EventType.PreInitResponse:
                console.log("[SlitherClient] Pre Init response")
                this.handlePreInit(data)
                break
            case EventType.InitialSetup:
                console.log("[SlitherClient] Setup Inicial ('a') recebido. Spawn concluído!")
                break
            case EventType.AddOrRemoveSnake:
                console.log("[SlitherClient] Add or remove snake")
                this.handleAddOrRemoveSnake(data)
                break
            default:
                break
        }
    }

    handlePreInit(data: Buffer) {
        const secret = Array.from(data).slice(3)
        const answer = decodeSlitherSecret(secret)
        this.socket?.send(answer)
        this.sendInitialSetup()
    }

    async boost() {
        const packet = Buffer.from([253])
        this.socket?.send(packet)
    }

    async stopBoost() {
        const packet = Buffer.from([254])
        this.socket?.send(packet)
    }

    async connect() {
        if (this.socket) {
            throw new Error("You're already connected!")
        }

        const { ip, port } = this.options.server

        const url = `ws://${ip}:${port}/slither`

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

    async disconnect() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = undefined
            console.log("[SlitherClient] Pinging interrompido.")
        }

        this.socket?.close()
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

            const port = to24bit(merged[i], merged[i + 1], merged[i + 2])
            i += 3

            const ac = to24bit(merged[i], merged[i + 1], merged[i + 2])
            i += 3

            const clu = merged[i]
            i += 1

            result.push({ ip, port, ac, clu })
        }

        return result
    }

    static async createWithFirstServer(options: SlitherConnectToFirstServer) {
        const servers = await SlitherClient.getServers()
        const firstServer = servers[0]
        
        const client = new SlitherClient({
            server: firstServer,
            ...options
        })

        return client
    }
}