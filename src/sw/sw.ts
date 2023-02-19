import { del, get, set } from "idb-keyval"
let SERVER_API = `http://localhost:3003/api/upload/file`

interface SyncManager {
	getTags(): Promise<string[]>
	register(tag: string): Promise<void>
}

declare global {
	interface ServiceWorkerRegistration {
		readonly sync: SyncManager
	}

	interface SyncEvent extends ExtendableEvent {
		readonly lastChance: boolean
		readonly tag: string
	}

	interface ServiceWorkerGlobalScopeEventMap {
		sync: SyncEvent
	}
}

declare let self: ServiceWorkerGlobalScope

const CACHE = "content-v1" // Name of the Current Cache
const OFFLINE = "/offline" // The Offline HTML Page

const AVATARS = "avatars" // Name of the Image Network Cache

const CDNS = "cdn-cache" // Name of the CDN Cache

const CACHE_ASSETS = [
	// The Necessary Files for the Service Worker to work
	OFFLINE,
	"/",
]

// The Install Event is fired when the Service Worker is first installed.
// This is where we can set up things in the Service Worker that are required
// The Pre-Cache is done at the install event.
self.addEventListener(
	"install",
	(event: ExtendableEvent): Promise<void> | void => {
		event.waitUntil(
			caches
				.open(CACHE) // Opening the Cache
				.then((cache) => cache.addAll(CACHE_ASSETS)) // Adding the Listed Assets to the Cache
			// .then(self.skipWaiting()) // The Service Worker takes control of the page immediately
		)
		// The Service Worker takes control of the page immediately
		return self.skipWaiting() 
	}
)

// The Activate Event is fired when the Service Worker is first installed.
// This is where we can clean up old caches.
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				// Remove caches that are not required anymore
				// This filters the current cache, Image Network Cache and CDN Cache
				return cacheNames.filter(
					(cacheName) =>
						CACHE !== cacheName &&
						AVATARS !== cacheName &&
						CDNS !== cacheName
				)
			})
			.then((unusedCaches) => {
				console.log("DESTROYING CACHE", unusedCaches.join(","))
				return Promise.all(
					unusedCaches.map((unusedCache) => {
						return caches.delete(unusedCache)
					})
				)
			})
			.then(() => self.clients.claim()) // The Service Worker takes control of all pages immediately
	)
})

self.addEventListener("fetch", (event) => {
	// Requests to other domains and requests other than GET to this web app will always fetch from network
	if (
		!event.request.url.startsWith(self.location.origin) ||
		event.request.method !== "GET"
	) {
		return void event.respondWith(
			fetch(event.request).catch((err) =>
				console.log(err)
			) as Promise<Response>
		)
	}

	// Cache First Falling Back to Network Strategy for Local Assets
	event.respondWith(
		caches.match(event.request).then((response) => {
			if (response) {
				return response
			}

			return fetch(event.request)
				.then(async (response) => {
					let cache = await caches.open(CACHE)
					cache.put(event.request, response.clone())
					return response
				})
				.catch((_) => {
					return caches.open(CACHE).then((cache) => {
						const offlineRequest = new Request(OFFLINE)
						return cache.match(offlineRequest)
					})
				})
		}) as Promise<Response>
	)
	return
})

// ---------------------------------------- BACKGROUND SYNC ----------------------------------------

async function requestBackgroundSync(
	backgroundSyncTagName: string
): Promise<void> {
	try {
		await self.registration.sync.register(backgroundSyncTagName)
	} catch (error) {
		console.log("Unable to REGISTER background sync", error)
		setTimeout(() => requestBackgroundSync(backgroundSyncTagName), 10000)
	}
}

self.addEventListener("sync", (event) => {
	if (event.tag === "retryUpload") {
		console.log("Executing Background Sync of tagname: " + event.tag)
		event.waitUntil(resumeWorkerUpload())
	}
})

// ---------------------------------------- --------------- ----------------------------------------

// basic function for sending local push notifications with just a title
async function sendLocalNotification(title: string) {
	await self.registration.showNotification(title)
}



async function resumeWorkerUpload() {
	console.log("SENDING heartBeat TO WORKER")
	workerChannel.postMessage({
		type: "heartBeat",
	})

	// wait for 2 seconds for heartBeat from worker
	await new Promise((resolve) => {
		setTimeout(() => {
			resolve(true)
		}, 2000)
	})


	let status = await get("heartBeat")
	if (status) {
		// worker is alive
		console.log("WORKER IS ALIVE. IT WILL TAKE CARE")
		// clear it 
		await set("heartBeat", false)
	} else {
		// worker is dead
		console.log("WORKER IS DEAD. RESTARTING IT")

		let file = await get("fileToUpload")

		if(!file) {
			console.log("NO FILE TO UPLOAD")
			return
		}

		let formData = new FormData()
		formData.append("file", file)
		
		await sendLocalNotification("Doing it with BG SYNC in the SERVICE WORKER")
		
		let request = await fetch(SERVER_API, {
			method: "POST",
			body: formData,
		})

		if (request.status == 200) {
			// upload successful
			console.log("UPLOAD SUCCESSFUL")
			await sendLocalNotification("Upload Successful")
			await del("fileToUpload")
		} else {
			// upload failed
			console.log("UPLOAD FAILED")
			await sendLocalNotification("Upload Failed")
		}		
	}
}

let workerChannel = new BroadcastChannel("workerChannel")

workerChannel.onmessage = async (e: MessageEvent) => {
	if (e.data.type == "status") {
		if (e.data.retry == true) {
			requestBackgroundSync("retryUpload")

			console.log("REGISTERED SYNC EVENT")
			workerChannel.postMessage({
				type: "status",
				status: "Retrying Upload...",
			})
		}
	}

	if (e.data.type == "heartBeat") {
		console.log("RECEIVED heartBeat FROM WORKER")
		workerChannel.postMessage({
			type: "resumeUpload",
		})
		await set("heartBeat", true)
	}
}


export {} // for typescript
