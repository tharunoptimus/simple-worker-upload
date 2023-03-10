import { WorkerMessage } from "./types"
let documentTitle = document.title
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

let checkEndpoint: HTMLDivElement | null =
	document.querySelector(".checkEndpoint")

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

		// workerChannel.postMessage({
		// 	type: "callWorker",
		// 	fileName: file.name,
		// })
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
		document.title = `${progress?.toFixed(2)}% Uploading Video`
	}

	if (type === "status") {
		let status = data?.status
		statusSpan.innerText = status
		document.title = documentTitle
		selectedFileName.innerText = ""
	}
}

async function checkForEndpoint() {
	try {
		await fetch("http://localhost:3003/ping")
		console.log("END_POINT IS UP")
	} catch (error) {
		checkEndpoint?.classList.remove("hidden")
		console.log(error)
	}
}

async function registerServiceWorker() {
	try {
		
		await navigator.serviceWorker.register(
			new URL("./sw/sw.js", import.meta.url),
			{
				type: "module",
			}
		)
	} catch (error) {
		console.log(error)
	}
}

async function getPushNotificationAccess() {
	try {
		let permission = await Notification.requestPermission()
		if (permission === "granted") {
			console.log("Permission Granted")
		} else {
			console.log("Permission Denied")
		}
	} catch (error) {
		console.log(error)
	}
}

checkForEndpoint()
registerServiceWorker()
getPushNotificationAccess()