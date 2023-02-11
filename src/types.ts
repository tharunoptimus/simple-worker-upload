export interface WorkerMessage {
    type: string
    fileName?: string
    progress?: number
    status?: string
}