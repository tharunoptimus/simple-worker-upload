import { WorkerMessage } from "./types"

// Channel to communicate with the worker
let workerChannel: BroadcastChannel = new BroadcastChannel("workerChannel")

// Grab the elements from the DOM
let uploadButton: HTMLButtonElement | null =
	document.querySelector(".uploadButton")
let fileUpload: HTMLDivElement | null = document.querySelector(".fileUpload")

let selectedFileName: HTMLSpanElement | any =
	document.querySelector(".selectedFileName")
let statusSpan: HTMLSpanElement | any = document.querySelector(".status")
let progressBar: HTMLProgressElement | any = document.querySelector(".progress")

// Add event listener to the buttons
uploadButton?.addEventListener("click", pickAndSendFile)

function pickAndSendFile() {
	let fileInput = document.createElement("input")
	fileInput.type = "file"
	fileInput.onchange = async (e) => {
		fileUpload?.classList.remove("hidden")

		let file = (e.target as HTMLInputElement).files![0]

		let worker = new Worker(
			new URL("./worker/upload.ts", import.meta.url),
			{
				type: "module",
			}
		)

		worker.postMessage(file)
	}

	fileInput.click()
}

// Listen for messages from the broadcast channel
workerChannel.onmessage = (e: MessageEvent) => {
	let data: WorkerMessage = e.data

	let { type } = data

	if (type === "ready") {
		let fileName = data?.fileName
		selectedFileName.innerText = `Uploading: ${fileName}`
	}

	if (type === "progress") {
		let progress = data?.progress
		progress! *= 100
		progressBar.value = progress
	}

	if (type === "status") {
		let status = data?.status
		statusSpan.innerText = status
	}
}