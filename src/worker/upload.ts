import { del, get, set } from "idb-keyval"

declare let self: DedicatedWorkerGlobalScope // for typescript
let SERVER_API = `http://localhost:3003/api/upload/file`
let SERVICE_WORKER_STARTER = `/sw/sw.js`

async function startServiceWorker() {



	await fetch(`${SERVICE_WORKER_STARTER}/sw.js`)
	console.log(`ATTEMPTING TO START SERVICE WORKER`)
}

import { WorkerMessage } from "../types"

let workerChannel = new BroadcastChannel("workerChannel")

self.onmessage = async (e: MessageEvent) => {
	startServiceWorker()
	let file = e.data
	uploadContent(file)
}

workerChannel.onmessage = async (e: MessageEvent) => {
	if (e.data.type == "heartBeat") {
		console.log("RECEIVED heartBeat REQUEST FROM SW")
		await set("heartBeat", true)
		workerChannel.postMessage({
			type: "heartBeat",
			status: true,
		})

	}
	if (e.data.type == "resumeUpload") {
        let file = await get("fileToUpload")
        uploadContent(file)
        await del("fileToUpload")

		// SW will still listen and serve misleading notifications
		// so waiting for 2.1 seconds before setting heartBeat to false
		setTimeout(async () => {
			await set("heartBeat", false)
		}, 2100)
	}
	if (e.data.type == "terminate") {
        console.log("WORKER TERMINATED")
        self.close()
    }
}

async function uploadContent(file: File) {
	workerChannel.postMessage({
		type: "ready",
		fileName: file.name,
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
			progress: e.loaded / e.total,
		}
		workerChannel.postMessage(messageToSend)
	}

	xhr.onload = () => {
		let messageToSend: WorkerMessage = {
			type: "status",
			status: "Done ✅",
		}
		workerChannel.postMessage(messageToSend)
	}

	// if xhr fails due to network error try to resumable upload
	xhr.onerror = async () => {
		let messageToSend: WorkerMessage = {
			type: "status",
			status: "Failed ❌",
			retry: true,
		}
		workerChannel.postMessage(messageToSend)

        // save file to indexedDB
        await set("fileToUpload", file)

		// try to resume upload
		// resumeUpload(file)
	}

	xhr.send(formData)
}


export {} // Also for typescript
