declare let self: DedicatedWorkerGlobalScope // for typescript
let SERVER_API = `http://localhost:3003/api/upload/file`

import { WorkerMessage } from "../types"

let workerChannel = new BroadcastChannel("workerChannel")

self.onmessage = async (e: MessageEvent) => {

    let file = e.data
    
    workerChannel.postMessage({
        type: "ready",
        fileName: file.name
    })

    // You probably won't need this. 
    // I'm using this because of the stuff that has to do with `Express` and `Multer`
    let formData = new FormData()
    formData.append("file", file)

    let xhr = new XMLHttpRequest()
    xhr.open("POST", SERVER_API)
    
    xhr.upload.onprogress = (e) => {
        let messageToSend: WorkerMessage = {
            type: "progress",
            progress: e.loaded / e.total
        }
        workerChannel.postMessage(messageToSend)
    }

    xhr.onload = () => {
        let messageToSend: WorkerMessage = {
            type: "status",
            status: "Done ✅"
        }
        workerChannel.postMessage(messageToSend)
    }

    xhr.send(formData)

}

export {} // Also for typescript