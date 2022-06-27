import _ from 'lodash';
import * as png from '@vivaxy/png';
import { COLOR_TYPES } from '@vivaxy/png/lib/helpers/color-types';
import { TERRAIN_TEXTURES_COLOR_PALETTES } from './color-palettes';

const MAX_GRASS_HEIGHT = 64;
const MIN_MAP_WIDTH = 640;
const MIN_MAP_HEIGHT = 32;

// Defines a type for the color of pixels. RGB + alpha
// Each pixel is a 4-byte value - "RGBA" format
type Color = [r: number, g: number, b: number, a: number];

// Applies the selected terrain's texture/grass to the given sourceImage
export function texturize(
  terrain: string,
  canvas: HTMLCanvasElement,
  sourceImage: HTMLImageElement,
  dontDrawGrassOnUpperBorder: boolean,
  dontDrawGrassOnLowerBorder: boolean,
  textImage: HTMLImageElement,
  grassImage: HTMLImageElement,
  maskColorString: string,
  convertOutput: boolean,
  transparentBackground: boolean,
  backgroundColor: string,
) {
  const maskColor = hexToRgb(maskColorString);
  const originalHeight = sourceImage.height;
  const renderHeight =
    originalHeight +
    (dontDrawGrassOnUpperBorder ? MAX_GRASS_HEIGHT : 0) +
    (dontDrawGrassOnLowerBorder ? MAX_GRASS_HEIGHT : 0);
  const heightOffset = dontDrawGrassOnUpperBorder ? MAX_GRASS_HEIGHT : 0;

  const ctx = canvas.getContext('2d');
  canvas.width = sourceImage.width;
  canvas.height = renderHeight;
  ctx.drawImage(sourceImage, 0, heightOffset);

  // Get all the necessary imageData's
  // "The ImageData object represents the underlying pixel data of an area of a canvas object"
  // sourceImage data
  const imageData = ctx.getImageData(0, 0, sourceImage.width, renderHeight);
  // generatedImage data
  const newImageData = ctx.getImageData(0, 0, sourceImage.width, renderHeight);

  // Texture
  const textContext = getContext(textImage);
  const textImageData = textContext.getImageData(
    0,
    0,
    textImage.width,
    textImage.height,
  );

  // Grass files have 64 width for each top and bottom parts
  const grassContext = getContext(grassImage);
  const grassWidth = 64;
  const grassTopImageData = grassContext.getImageData(
    0,
    0,
    grassWidth,
    grassImage.height,
  );
  const grassBottomImageData = grassContext.getImageData(
    grassWidth,
    0,
    grassWidth,
    grassImage.height,
  );

  // Grass had to be modified so it's always a smooth top & bottom
  // These functions find the offset to where the first grass pixel is found
  // By checking each pixel in 'y' until it's color is not close-to-black
  let grassTopOffset = 0;
  for (let y = 0; y < grassImage.height; y++) {
    if (!closeToBlack(getPixel(grassTopImageData, 0, y))) {
      break;
    }
    grassTopOffset++;
  }

  let grassBottomOffset = 0;
  for (let y = grassImage.height - 1; y >= 0; y--) {
    if (!closeToBlack(getPixel(grassBottomImageData, 0, y))) {
      break;
    }
    grassBottomOffset++;
  }

  if (dontDrawGrassOnUpperBorder) {
    // Copy and fill the upper gap of sourceImage with the first row of pixels
    const firstPixelRow = getPixelRow(imageData, heightOffset);
    setPixelRow(imageData, 0, firstPixelRow, MAX_GRASS_HEIGHT);
  }

  if (dontDrawGrassOnLowerBorder) {
    // Copy and fill the lower gap of sourceImage with the last row of pixels
    const y = originalHeight + heightOffset;
    const lastPixelRow = getPixelRow(imageData, y - 1);
    setPixelRow(imageData, y, lastPixelRow, MAX_GRASS_HEIGHT);
  }

  let colorPalette: Color[] = [];
  // Prepare the colorPalette (if necessary)
  if (convertOutput) {
    // Add the colors from texture images
    colorPalette = TERRAIN_TEXTURES_COLOR_PALETTES[terrain];
    // Add the backgroundColor as the first in palette
    const bgColor: Color = transparentBackground
      ? [0, 0, 0, 0]
      : hexToRgb(backgroundColor);
    setFirstColorInPalette(bgColor, colorPalette);
  }

  // Texturization begins - scans horizontally in X from left to right
  for (let x = 0; x < sourceImage.width; x++) {
    // It applies grass from down to up, so position at the bottom pixel of the grass-bottom
    let below = grassImage.height - grassBottomOffset - 1;
    // Scan vertically in Y from down to up (to apply grassBottom)
    for (let y = renderHeight - 1; y >= 0; y--) {
      // Get the pixel color in x/y position of the sourceImage data
      const sourceColor = getPixel(imageData, x, y);
      // If color in pixel is maskColor, texturize it
      if (colorEqual(sourceColor, maskColor)) {
        let color: Color;
        // 'below' decreases as grass-bottom is applied (as if the height was consumed)
        // So if value still >=0, there's still grass-bottom pixels to be applied
        if (below >= 0) {
          // Texturize with grass-bottom
          // Get the pixel from grassBottom, x % grassWidth because it's treated
          // as a pattern that repeats itself.
          color = getPixel(grassBottomImageData, x % grassWidth, below);
        }

        // If grass-bottom has been applied completely, color would be falsey
        // color could also be close to black, which would also mean that we finished
        // applying grass-bottom. If so, then we will texturize with texture.
        if (!color || closeToBlack(color)) {
          color = getPixel(
            textImageData,
            x % textImage.width,
            y % textImage.height,
          );
        }

        // Texturize the pixel with corresponding new color
        setPixel(newImageData, x, y, color);

        below--;
      } else {
        // If the color in this pixel wasn't equal to maskColor,
        // we must "reset" 'below' pixel position
        below = grassImage.height - grassBottomOffset - 1;

        // Add sourceColor to colorPalette (if it isn't present yet)
        if (convertOutput) checkAndAddToColorPalette(sourceColor, colorPalette);
      }
    }

    // It applies grass from up to down, so position at the upper pixel of the grass-top
    let above = 0; // which is 0
    // Scan vertically in Y from up to down (to apply grassTop)
    for (let y = 0; y < renderHeight; y++) {
      const sourceColor = getPixel(imageData, x, y);
      if (colorEqual(sourceColor, maskColor)) {
        // 'above' increases as grass-top is applied (as if the height was filled)
        // So if value is smaller than the height of grass-top pixels to apply,
        // there's still pixels to be applied
        if (above < grassImage.height - grassTopOffset) {
          // Texturize with grass-top...
          const color = getPixel(
            grassTopImageData,
            x % grassWidth,
            above + grassTopOffset,
          );
          // ...as long as it's not a close-to-black color
          if (!closeToBlack(color)) {
            setPixel(newImageData, x, y, color);
          }
        }
        above++;
      } else {
        // If the color in this pixel wasn't equal to maskColor,
        // we must "reset" 'above' pixel position
        above = 0;
      }
    }
  }

  ctx.putImageData(newImageData, 0, 0);
  if (dontDrawGrassOnUpperBorder || dontDrawGrassOnLowerBorder) {
    const croppedImageData = ctx.getImageData(
      0,
      heightOffset,
      sourceImage.width,
      originalHeight,
    );
    canvas.height = originalHeight;
    ctx.putImageData(croppedImageData, 0, 0);
  }

  return colorPalette;
}

export function resize(
  canvas: HTMLCanvasElement,
  transparentBackground: boolean,
  backgroundColor: string,
) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;

  const width =
    originalWidth > MIN_MAP_WIDTH
      ? findNextValidDimension(originalWidth)
      : MIN_MAP_WIDTH;
  const height =
    originalHeight > MIN_MAP_HEIGHT
      ? findNextValidDimension(originalHeight)
      : MIN_MAP_HEIGHT;
  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = transparentBackground ? 'transparent' : backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const dx = (width - originalWidth) / 2; // Center horizontally
  const dy = height - originalHeight; // Align to bottom
  ctx.putImageData(imageData, dx, dy);
}

export function convertOutputToIndexedPng(
  canvas: HTMLCanvasElement,
  colorPalette: Color[],
  setDownloadUrl: Function,
) {
  canvas.toBlob(
    async function (blob) {
      let metadata = png.decode(await blob.arrayBuffer());
      metadata.colorType = COLOR_TYPES.PALETTE;
      metadata.palette = colorPalette;
      metadata.interlace = 0;
      const imageBuffer = png.encode(metadata);
      const fileBlob = new Blob([imageBuffer], { type: 'image/png' });
      setDownloadUrl(URL.createObjectURL(fileBlob));
    },
    'image/png',
    1,
  );
}

// Creates and returns a HTMLCanvasElement out of a HTMLImageElement
function _getCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // Draw the given image on the created canvas
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return canvas;
}

// Memoizes the function so that is isn't computed again if the input is cached
const getCanvas = _.memoize(_getCanvas);

function getContext(image: HTMLImageElement): CanvasRenderingContext2D {
  /* Returns an object that provides methods and properties
  for drawing and manipulating images and graphics on a canvas element
  in a document. A context object includes information about colors,
  line widths, fonts, and other graphic parameters that can be 
  drawn on a canvas. */
  const canvas = getCanvas(image);
  return canvas.getContext('2d');
}

// function copyImageData(context: CanvasRenderingContext2D, src: ImageData) {
//   const dst = context.createImageData(src.width, src.height);
//   dst.data.set(src.data);
//   return dst;
// }

function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const [match, r, g, b] = result;
    return [...[r, g, b].map((s) => parseInt(s, 16)), 255] as Color;
  } else {
    return null;
  }
}

// Returns the color of a pixel in an ImageData
function getPixel(imgData: ImageData, x: number, y: number): Color {
  /* ImageData can be seen as an array with all the pixels
  We find the index by multiplying 'y * imgWidth' and that's the position
  of the pixel in the 'y' row we're in,
  then we just sum the 'x' value. */
  const index = y * imgData.width + x;
  // Then we multiply the index * 4, because each color is made of 4 values
  // (RGBA), and we slice 4 elements to get the color.
  return (imgData.data.slice(index * 4, index * 4 + 4) as unknown) as Color;
}

// Sets the color of a pixel in an ImageData
function setPixel(imgData: ImageData, x: number, y: number, color: Color) {
  const index = y * imgData.width + x;
  imgData.data.set(color, index * 4);
}

function getPixelRow(imgData: ImageData, y: number): Color[] {
  const rowLengthInBytes = imgData.width * 4;
  const index = y * rowLengthInBytes;
  return (imgData.data.slice(
    index,
    index + rowLengthInBytes,
  ) as unknown) as any;
}

function setPixelRow(
  imgData: ImageData,
  y: number,
  row: Color[],
  numberOfRows: number = 1,
) {
  const rowLengthInBytes = imgData.width * 4;
  for (let i = 0; i < numberOfRows; i++) {
    imgData.data.set(row as any, (y + i) * rowLengthInBytes);
  }
}

// Checks if two given colors are equal
function colorEqual(c1: Color, c2: Color): boolean {
  // return (!c1 && !c2)
  // This would return true if both colors are falsey, otherwise:
  // _.every(c1, (c, i) => c === c2[i]);
  // Returns true IF every element in c1 collection is equal to one in c2
  return (!c1 && !c2) || _.every(c1, (c, i) => c === c2[i]);
}

// Checks if a color is close to black
function closeToBlack([r, g, b]: Color) {
  return r < 40 && g < 40 && b < 40;
}

function setFirstColorInPalette(color: Color, colorPalette: Color[]) {
  for (let i = 0, length = colorPalette.length; i < length; i++) {
    if (colorEqual(color, colorPalette[i])) {
      if (i === 0) return;
      colorPalette.splice(i, 1);
      break;
    }
  }
  colorPalette.unshift(color);
}

function checkAndAddToColorPalette(color: Color, colorPalette: Color[]) {
  // Check if the color isn't already in the colorPalette
  for (let i = 0, length = colorPalette.length; i < length; i++) {
    if (colorEqual(color, colorPalette[i])) {
      return;
    }
  }
  colorPalette.push(color);
}

function findNextValidDimension(n: number): number {
  while (n % 8 != 0) {
    n++;
  }
  return n;
}
