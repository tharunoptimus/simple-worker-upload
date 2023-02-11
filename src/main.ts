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

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
