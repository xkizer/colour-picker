import { CURSOR_RADIUS, ZOOM_PIXEL_SIZE, ZOOM_VIEW_RADIUS } from "./constants.js";
import { rgbToHex } from "./utils.js";

// Canvas used to zoom into the pixels around the cursor
const zoomCanvas = new OffscreenCanvas(CURSOR_RADIUS * 2, CURSOR_RADIUS * 2);
const zoomContext = zoomCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

if (!zoomContext) {
    throw new Error('Could not create zoom context');
}

/**
 * Create a zoom image containing the neighbouring pixels
 */
async function createZoomView(pixels: Uint8ClampedArray) {
    const totalSquares = ZOOM_VIEW_RADIUS * 2 + 1;
    const border = '#666666';
    zoomContext.fillStyle = border;

    // Set a backgound that will serve as the grid border
    zoomContext.fillRect(0, 0, CURSOR_RADIUS * 2, CURSOR_RADIUS * 2);

    for (let i = 0; i < totalSquares; i++) {
        for (let j = 0; j < totalSquares; j++) {
            const offset = (j * totalSquares + i) * 4;
            const r = pixels[offset];
            const g = pixels[offset + 1];
            const b = pixels[offset + 2];
            // ignoring the alphas

            const color = rgbToHex(r, g, b);

            zoomContext.fillStyle = color;
            zoomContext.fillRect(i * (ZOOM_PIXEL_SIZE + 1), j * (ZOOM_PIXEL_SIZE + 1), ZOOM_PIXEL_SIZE, ZOOM_PIXEL_SIZE);
        }
    }

    // Highlight the center pixel
    zoomContext.strokeStyle = '#ffffff';
    zoomContext.lineWidth = 1;
    zoomContext.strokeRect(ZOOM_VIEW_RADIUS * (ZOOM_PIXEL_SIZE + 1) - 1, ZOOM_VIEW_RADIUS * (ZOOM_PIXEL_SIZE + 1) - 1, ZOOM_PIXEL_SIZE, ZOOM_PIXEL_SIZE);

    const blob = await zoomCanvas.convertToBlob();
    const imageData = new FileReaderSync().readAsArrayBuffer(blob);
    return imageData;
}

// Listen for messages from the main thread (main thread will only ever send pixel data)
onmessage = async function (e: MessageEvent<ArrayBuffer>) {
    const pixels = new Uint8ClampedArray(e.data);
    const imageData = await createZoomView(pixels);
    postMessage(imageData, [imageData]);
}
