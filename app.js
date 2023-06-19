const utils = new Utils('errorMessage');

let streaming = false;
let video = document.getElementById('videoInput');
//let startAndStop = document.getElementById('startAndStop');
let canvasOutput = document.getElementById('canvasOutput');
let canvasContext = canvasOutput.getContext('2d');
let currentX, currentY, currentWidth, currentHeight;
let imageCount;

const note = document.getElementById('note');
const samp = document.querySelector('article samp');

video.addEventListener('click', () => {
    if (!streaming) {
        note.textContent = 'Loading...hang on a sec.';
        //startAndStop.disabled = true;
        utils.clearError();
        utils.startCamera('qvga', onVideoStarted, 'videoInput');
    }
    else {
        utils.stopCamera();
        onVideoStopped();
    }
});

function onVideoStarted() {
    streaming = true;
    //startAndStop.innerText = 'Detecting your face...';
    note.textContent = 'Detecting your face...';
    //videoInput.width = videoInput.videoWidth;
    //videoInput.height = videoInput.videoHeight;

    //let video = document.getElementById('videoInput');
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let gray = new cv.Mat();
    let cap = new cv.VideoCapture(video);
    let faces = new cv.RectVector();
    let classifier = new cv.CascadeClassifier();
    
    // load pre-trained classifiers
    classifier.load('haarcascade_frontalface_default.xml');
    
    const FPS = 30;
    function processVideo() {
        try {
            if (!streaming) {
                // clean and stop.
                src.delete();
                dst.delete();
                gray.delete();
                faces.delete();
                classifier.delete();
                return;
            }
            let begin = Date.now();
            // start processing.
            cap.read(src);
            src.copyTo(dst);
            cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0);
            // detect faces.
            classifier.detectMultiScale(gray, faces, 1.1, 3, 0);
            // draw faces.
            for (let i = 0; i < faces.size(); ++i) {
                let face = faces.get(i);
                //let point1 = new cv.Point(face.x, face.y);
                //let point2 = new cv.Point(face.x + face.width, face.y + face.height);
                let offset = 42;
                if (face.width + offset * 2 > video.width) {
                    offset = (video.width - face.width) / 2;
                }
                currentX = face.x - offset;
                currentY = video.height - face.y - face.height - offset;
                currentWidth = face.width + offset * 2;
                currentHeight = face.height + offset * 2;
                //cv.rectangle(dst, point1, point2, [255, 0, 0, 255]);
            }
            if (faces.size() === 1) {
                note.textContent = 'All good. Take selfie now.';
                //startAndStop.disabled = false;
            }
            cv.imshow('canvasOutput', dst);
            
            // schedule the next one.
            let delay = 1000/FPS - (Date.now() - begin);
            setTimeout(processVideo, delay);
        } catch (err) {
            utils.printError(err);
        }
    };
    // schedule the first one.
    setTimeout(processVideo, 0);
}

function onVideoStopped() {
    streaming = false;
    //canvasContext.clearRect(0, 0, canvasOutput.width, canvasOutput.height);

    appendImage();

    //startAndStop.innerText = 'Upload';
    note.textContent = 'Upload me :)';
}

utils.loadOpenCv(() => {
    const faceCascadeFile = 'haarcascade_frontalface_default.xml';
    utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
        //startAndStop.disabled = false;
    });
});

function appendImage() {
    const canvas = document.getElementById('canvasOutput');
    const newCanvas = document.createElement('canvas');
    newCanvas.width = 100;
    newCanvas.height = 100;
    const newContext = newCanvas.getContext('2d');
    newContext.drawImage(canvas, currentX, currentY, currentWidth, currentHeight, 0, 0, 100, 100);
    dataURL = newCanvas.toDataURL('image/webp');
    const img = document.createElement('img');
    img.src = dataURL;
    img.onclick = () => {
        img.onclick = null;
        note.textContent = 'Done! Share your image if you like :)';
        samp.textContent = imageCount + 1;
        prependImage(dataURL);
        uploadImage(dataURL);
    }
    requestAnimationFrame(() => {
        video.parentNode.removeChild(video);
        document.getElementById('preview').appendChild(img);
    });
}

function prependImage(dataURL) {
    const img = document.createElement('img');
    img.src = dataURL;
    facesList.prepend(img);
}

function copyLink(event) {
    const btn = event.target;
    navigator.clipboard.writeText(btn.previousElementSibling.value);
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1337);
}

function uploadImage(dataURL) {
    pushData('https://api.faces4peace.com/upload', 'POST', { source: dataURL })
    .then((data) => {
        const faceShare = `<label for="link">Share link</label>
        <input type="text" id="link" name="link" value="https://${window.location.host}/#face${data.message}" readonly>
        <button id="copy-btn">Copy</button>`;
        const element = document.getElementById('share');
        element.insertAdjacentHTML('afterBegin', faceShare);
        document.getElementById('copy-btn').addEventListener('click', copyLink);
        element.hidden = false;
    });
}

async function pushData(url, method, data) {
    // Default options are marked with *
    const response = await fetch(url, {
        method: method, // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        //cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        //credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json'
            //'Content-Type': 'application/x-www-form-urlencoded'
        },
        //redirect: 'follow', // manual, *follow, error
        //referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    return response.json();
}

const facesList = document.getElementById('faces');
pushData('https://api.faces4peace.com/upload', 'GET')
.then((data) => {
    imageCount = data.message;
    samp.textContent = imageCount;
    for (let i = imageCount; i > 0; i--) {
        const img = document.createElement('img');
        img.id = 'face' + i;
        img.src = 'https://api.faces4peace.com/' + i + '.webp';
        img.loading = 'lazy';
        facesList.appendChild(img);
    }
});
