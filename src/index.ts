import { CURSOR_RADIUS, ZOOM_VIEW_RADIUS } from "./constants.js";
import { rgbToHex } from "./utils.js";

function init() {
    // Our working canvas
    const canvas = document.getElementById("color-picker-canvas") as HTMLCanvasElement;
    const context = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;

    if (!context) {
        throw new Error('Could not get canvas context');
    }

    // The cursor for the colour picker
    const cursor = document.createElement('div');
    cursor.classList.add('cursor');
    
    const tempColor = document.createElement('code');
    tempColor.classList.add('temp-color');
    cursor.appendChild(tempColor);

    const zoomImage = document.createElement('img');
    zoomImage.classList.add('zoom-image');
    cursor.appendChild(zoomImage);

    document.body.appendChild(cursor);

    // Create a worker to handle the zoom view
    const worker = new Worker('./worker.js', {type: 'module'});

    // Image to fill the canvas with, for demo purposes
    const image = new Image();
    image.src = './assets/1920x1080-4598441-beach-water-pier-tropical-sky-sea-clouds-island-palm-trees.jpg';
    image.onload = function() {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    const output = document.getElementById('color-output') as HTMLOutputElement;
    const toggle = document.getElementById('togggle-picker') as HTMLElement;

    /**
     * Get the colour at a particular point in the canvas
     */
    function getColorAtPixel(x: number, y: number) {
        const imageData = context.getImageData(x, y, 1, 1);
        const data = imageData.data;
        return rgbToHex(data[0], data[1], data[2]);
    }

    /**
     * Get the pixels (square) around a pixel in the canvas. `radius` refers to the number of pixels around
     * the center that should be counted, don't confuse this to mean it's a circle
     */
    function getPixelsAroundPoint(x: number, y: number, radius: number) {
        const startX = x - radius;
        const startY = y - radius;
        const width = radius * 2 + 1;
        const imageData = context.getImageData(startX, startY, width, width);
        return imageData.data;
    }

    /**
     * Create a zoom image containing the neighbouring pixels
     */
    function createZoomView(x: number, y: number) { 
        const pixels = getPixelsAroundPoint(x, y, ZOOM_VIEW_RADIUS);
        const buffer = pixels.buffer;
        worker.postMessage(buffer, [buffer]);
    }

    /**
     * Track mouse movement on the canvas
     */
    function trackMouse(event: MouseEvent) {
        const x = event.offsetX;
        const y = event.offsetY;
        const color = getColorAtPixel(x, y);
        cursor.style.borderColor = color;
        cursor.style.left = (event.pageX - CURSOR_RADIUS) + 'px';
        cursor.style.top = (event.pageY - CURSOR_RADIUS) + 'px';
        tempColor.innerText = color;
        createZoomView(x, y);
    }

    /**
     * Pick a colour from the canvas
     */
    function pickColour (event: MouseEvent) {
        const x = event.offsetX;
        const y = event.offsetY;
        const color = getColorAtPixel(x, y);
        output.innerText = color;

        // Uncomment below if we want to disable the picker after a colour is picked
        // disableColourPicker();
    }

    function hideCursor () {
        cursor.style.display = 'none';
    }

    function showCursor () {
        cursor.style.display = 'block';
    }

    function enableColourPicker() {
        // Remove setup event listener from the toggle
        toggle.removeEventListener('click', enableColourPicker);
        toggle.addEventListener('click', disableColourPicker);

        // Add class to canvas to indicate it has picker active
        document.body.classList.add('picker-active');

        // Track the mouse on the canvas
        canvas.addEventListener("mousemove", trackMouse);

        // When clicked, output the colour to the screen
        canvas.addEventListener("click", pickColour);

        // Hide the cursor when the mouse leaves the canvas
        canvas.addEventListener("mouseleave", hideCursor);

        // Show the cursor when the mouse enters the canvas
        canvas.addEventListener("mouseenter", showCursor);
    }

    function disableColourPicker() {
        hideCursor();
        canvas.removeEventListener("mousemove", trackMouse);
        canvas.removeEventListener("click", pickColour);
        document.body.classList.remove('picker-active');
        canvas.removeEventListener("mouseleave", hideCursor);
        canvas.removeEventListener("mouseenter", showCursor);
        toggle.removeEventListener('click', disableColourPicker);
        toggle.addEventListener('click', enableColourPicker);
    }

    // Intentionally left out of the setup function, as there is no need to reinitialize this each time
    // Listen for messages from the worker. The worker will only ever send base-64 encoded image data
    worker.onmessage = function (e: MessageEvent<string>) {
        const imageData = e.data;
        zoomImage.src = imageData;
    }

    // init when toggle is clicked
    toggle.addEventListener('click', enableColourPicker);
}

document.addEventListener("DOMContentLoaded", init);
