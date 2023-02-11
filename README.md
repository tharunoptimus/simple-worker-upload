# Offloading upload to Web Workers

## What is happening with the normal upload?
Not sure why but for some reason, the upload process is blocking the main thread. So, if you have a big file, the browser will freeze until the upload is finished. This should not happen at all because the upload is a network process and it is an IO task and thus should not block the main thread. But, here we are, upload blocking the main thread.

## Ways to solve this
1. Just go with it (totally not possible because it defeats the purpose of creating this repo)
2. Use a Web Worker (this is what I've done)
3. Use a Service Worker (More on this later)

## Using a Web Worker

### Things that need to be considered before reading further
1. Web Workers does not have access to DOM. So, you can't use `document` or `window` or `alert` or anything that is related to DOM.
2. Web Workers cannot use modules if the modules are exported from a file that runs in the main thread. For eg, we might have a component that exports a function that involves getting something from localstorage or do something like that. In theory, it should work. But for some reason, (maybe due to Vite configuration), it is not working. 
3. Web Workers can import modules from other modules that are installed with `npm`. 
4. If you have a service worker that is registered, the network request will be handled by the service worker. So, if you use heavy computation in worker thread, it wouldn't be a problem but if you upload from a web worker, it will still use the service worker thread for network access and the service worker (might) get busy and may not respond to other fetch requests coming from your app. THIS IS VERY UNLIKELY SO YOU SHOULD NOT WORRY ABOUT IT. I've mentioned it just in case you are wondering why sometimes it is taking a while
5. Apart from `postMessage()` there is another secret weapon for sharing data between main thread, service worker thread and web worker thread. Not many might know (I didn't know until I actually needed it for my project), it's the `BroadcastChannel API`. We can start a channel by supplying a channelName and then you can send and receive messages from everywhere. But it respects Same Origin Policy. So, you can't send messages from `https://example.com` to `https://example2.com`. But you can send messages from `https://example.com` to `https://example.com` and from `https://example.com` to `https://example.com/some/path`. So, if you are using a CDN, you can use the same channelName for all the files that are served from the CDN. But if you are using a different domain for your API, you can't use the same channelName for the files that are served from the CDN.

### What is happening in the code
0. The main thread creates a broadcast channel and listens to it. This is done so that the main thread can receive any messages from the web worker like upload progress, status etc
1. We have our website has a button. After clicking that button it opens the File Explorer and lets you select a file. (This cannot be done with Web Worker so we delegate this task to the main thread)
2. After selection, the file data (not the entire file, but the reference or maybe not I'm not sure. But it happens in an instant regardless of file size, so, I believe it is sending a reference. Too bored to read MDN about it) gets sent to the web worker by spawning it. 
Remember, in Vite, we have to spawn the web worker by giving it as URL and not as string. This has something to do with Vite configuration. I don't know why. But it is what it is.
3. The web worker will create the broadcast channel and send a message to the main thread to let it know that the upload has started.
4. In this demo, I've used `xhr` instead of `fetch` even though `fetch` is awesome and supported in Worker scope. But with xhr, we can get the progress of the upload. With fetch, we cannot
5. The web worker will create a `FormData` object and append the file data to it. Usually, it is not required, but `Multer for Express` requires any file sent to the server should be from a form. So to mimic form submission, we create `FormData`. Depending on your situation, (Uploads to S3) you might have to change the code a little. But it's just a small work. 
6. With the `FormData` it sends a `xhr` request to the server. 
7. All the process including the file name transmission, upload progress, upload status etc is done in the web worker. So, the main thread is not blocked at all. Also, with the broadcast channel, the web worker can send messages to the main thread and the main thread can send messages to the web worker. So, you can have a progress bar in the main thread and update it with the progress from the web worker.
8. The web worker automatically terminates itself after the upload is finished. But you can also terminate it manually by calling `worker.terminate()`. But I don't know why you would want to do that.
9. With the data from the `broadcastChannel` we can update the UI in the main thread. 

## Using a Service Worker
Service worker still behave like main thread because it has to manage every single request that comes from your app.
There are few things to consider.
1. Send it as a normal request from main thread. The service worker will intercept it and send it to the server. This is the easiest way. It won't block the main thread that bad, but it could be a problem if you have a lot of requests coming from your app.
2. Send it as background sync. This is a little complicated. I've done something similar in my previous project. The problem is you can't control what happens over there with your app. Also, you need to write every single thing that the function use like other helper functions, utility functions etc. But it can work without a network and can retry after a network is available. 

## Conclusion
I've tried to explain everything as simple as possible. If you have any questions, feel free to ask. I'll try to answer them as soon as possible.


## Key things to remember:
1. Web Workers cannot access DOM
2. Web Workers can access modules installed with npm
3. Web Workers are like separate projects, if you have something like a library or a helper function, it should be available separately to them like the node_modules or something that doesn't involve the DOM. If you have a function that lives in another file that exports it and also have a function that interacts with the DOM, it won't work.
4. Web Workers can communicate with the main thread using `postMessage()` and `onmessage` event listener but it can be limiting, so we can use `BroadcastChannel` API to communicate with the main thread and other web workers.
5. If you want to resolve some problems with TypeScript, you might want to include "WebWorker" in the `lib` array in your `tsconfig.json` file. Like this:
`"lib": ["ESNext", "DOM", "WebWorker"],`


# Demo Video
The file (474M) is from an HDD (slower than what you expect from SSDs) to demo. 
The upload folder on the server(on the right - Express & MULTER) is on an SSD. It stores the uploaded file.
The progress bar data is from the web worker. 

📺 [Demo Video](/videos/demo.mp4)

# Demo Video where we block the main thread by running a long loop ~10s in the main thread
The same file, but we deliberately block the main thread for about ~6s with a `for` loop. Notice, it fails to update the progress bar for the time being. But when the main thread comes back, it updates the progress bar. Also notice, the upload is still going on in the background with the web worker 🚀

📺 [Blocking Thread - Demo Video](/videos/blocking.mp4)

PS: I've never worked with S3 and I don't know the configuration for uploads. But in this example I've used Express and Multer to handle the upload.

PS2: I've used Vite for this example. So, if you are using Vite, you have to spawn the web worker by giving it as URL and not as string. This has something to do with Vite configuration. I don't know why. But it is what it is.

PS3: For the server, I couldn't get a server running online. The services I know doesn't allow the app to access File Systems. So, I'll just give you the code for the server. You can run it locally and test it. The url is [GitHub](https://github.com/tharunoptimus-pd/simple-server). Just clone it and run `npm install` and then `npm start`. It will start the server on port 3003. You can change the port in the `app.js` file. **Also don't mind the MONGODB Warning** while running the server. 

PS4: For some reasons, I couldn't get to see the `upload` process in `Network` tab in the Dev tools or in the `Console`. Something to do with my Browser Dev Tools Settings. 