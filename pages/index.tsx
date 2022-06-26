import Head from "next/head";
import React from "react";
import _ from "lodash";
import * as png from "@vivaxy/png";
import { COLOR_TYPES } from "@vivaxy/png/lib/helpers/color-types";

// TERRAINS defines the terrain options that will be available through the app
const TERRAINS = [
  "Art",
  "-Beach",
  "Cheese",
  "Construction",
  "Desert",
  "-Desert",
  // "Dungeon",
  "Easter",
  "-Farm",
  "Forest",
  "-Forest",
  "Fruit",
  "Gulf",
  "Hell",
  "-Hell",
  "Hospital",
  "Jungle",
  "Manhattan",
  "Medieval",
  "Music",
  "Pirate",
  "Snow",
  "Space",
  "Sports",
  "Tentacle",
  "Time",
  "Tools",
  "Tribal",
  "Urban",
];

// IMAGE_PATHS stores the paths of the images needed for each terrain available
// text.png for the texture and grass.png
const IMAGE_PATHS = [
  ...TERRAINS.map((t) => `Terrain/${t}/text.png`),
  ...TERRAINS.map((t) => `Terrain/${t}/grass.png`),
];

const MAX_GRASS_HEIGHT = 64;
const MIN_MAP_WIDTH = 640;
const MIN_MAP_HEIGHT = 32;
const WHITE: Color = [255, 255, 255, 255];
const BLACK: Color = [0, 0, 0, 255];

// Creates and returns a HTMLCanvasElement out of a HTMLImageElement
function _getCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // Draw the given image on the created canvas
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return canvas;
}

// Memoizes the function so that is isn't computed again if the input is cached
const getCanvas = _.memoize(_getCanvas);

// Loads all the images from IMAGE_PATHS
async function loadImages(
  imagePaths: string[]
): Promise<{ [path: string]: HTMLImageElement }> {
  const images = await Promise.all<HTMLImageElement>(
    imagePaths.map(
      (path) =>
        new Promise((resolve) => {
          const img = new Image();
          img.addEventListener("load", () => resolve(img));
          img.src = path;
        })
    )
  );

  // Returns a dictionary of HTMLImageElement's
  // It accepts two arrays, one of property identifiers (imagePaths) and one of corresponding values (images).
  return _.zipObject(imagePaths, images);
}

// Defines a type for the color of pixels. RGB + alpha
// Each pixel is a 4-byte value - "RGBA" format
type Color = [r: number, g: number, b: number, a: number];

// Returns the color of a pixel in an ImageData
function getPixel(imgData: ImageData, x: number, y: number): Color {
  /* ImageData can be seen as an array with all the pixels
  We find the index by multiplying 'y * imgWidth' and that's the position
  of the pixel in the 'y' row we're in,
  then we just sum the 'x' value. */
  const index = y * imgData.width + x;
  // Then we multiply the index * 4, because each color is made of 4 values
  // (RGBA), and we slice 4 elements to get the color.
  return imgData.data.slice(index * 4, index * 4 + 4) as unknown as Color;
}

// Sets the color of a pixel in an ImageData
function setPixel(imgData: ImageData, x: number, y: number, color: Color) {
  const index = y * imgData.width + x;
  imgData.data.set(color, index * 4);
}

function getContext(image: HTMLImageElement): CanvasRenderingContext2D {
  /* Returns an object that provides methods and properties
  for drawing and manipulating images and graphics on a canvas element
  in a document. A context object includes information about colors,
  line widths, fonts, and other graphic parameters that can be 
  drawn on a canvas. */
  const canvas = getCanvas(image);
  return canvas.getContext("2d");
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

function checkAndAddToColorPalette(color: Color, colorPalette: Color[]) {
  // Check if the color isn't already in the colorPalette
  for (let i = 0, length = colorPalette.length; i < length; i++) {
    if (colorEqual(color, colorPalette[i])) {
      return;
    }
  }
  colorPalette.push(color);
}

// function copyImageData(context: CanvasRenderingContext2D, src: ImageData) {
//     const dst = context.createImageData(src.width, src.height);
//     dst.data.set(src.data);
//     return dst;
// }

function getPixelRow(imgData: ImageData, y: number): Color[] {
  const rowLengthInBytes = imgData.width * 4;
  const index = y * rowLengthInBytes;
  return imgData.data.slice(index, index + rowLengthInBytes) as unknown as any;
}

function setPixelRow(
  imgData: ImageData,
  y: number,
  row: Color[],
  numberOfRows: number = 1
) {
  const rowLengthInBytes = imgData.width * 4;
  for (let i = 0; i < numberOfRows; i++) {
    imgData.data.set(row as any, (y + i) * rowLengthInBytes);
  }
}

// Applies the selected terrain's texture/grass to the given sourceImage
function texturize(
  canvas: HTMLCanvasElement,
  sourceImage: HTMLImageElement,
  dontDrawGrassOnUpperBorder: number,
  dontDrawGrassOnLowerBorder: number,
  textImage: HTMLImageElement,
  grassImage: HTMLImageElement,
  maskColor: Color,
  convertOutput: number,
  transparentBackground: number,
  backgroundColor: string
) {
  const originalHeight = sourceImage.height;
  const renderHeight =
    originalHeight +
    dontDrawGrassOnUpperBorder * MAX_GRASS_HEIGHT +
    dontDrawGrassOnLowerBorder * MAX_GRASS_HEIGHT;
  const heightOffset = dontDrawGrassOnUpperBorder * MAX_GRASS_HEIGHT;

  const ctx = canvas.getContext("2d");
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
    textImage.height
  );

  // Grass files have 64 width for each top and bottom parts
  const grassContext = getContext(grassImage);
  const grassWidth = 64;
  const grassTopImageData = grassContext.getImageData(
    0,
    0,
    grassWidth,
    grassImage.height
  );
  const grassBottomImageData = grassContext.getImageData(
    grassWidth,
    0,
    grassWidth,
    grassImage.height
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

  const colorPalette: Color[] = [];
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
            y % textImage.height
          );
        }

        // Texturize the pixel with corresponding new color
        setPixel(newImageData, x, y, color);

        // Store the color if it isn't present yet
        if (convertOutput) checkAndAddToColorPalette(color, colorPalette);

        below--;
      } else {
        // If the color in this pixel wasn't equal to maskColor,
        // we must "reset" 'below' pixel position
        below = grassImage.height - grassBottomOffset - 1;

        // Store the color if it isn't present yet
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
            above + grassTopOffset
          );
          // ...as long as it's not a close-to-black color
          if (!closeToBlack(color)) {
            setPixel(newImageData, x, y, color);

            // Store the color if it isn't present yet
            if (convertOutput) checkAndAddToColorPalette(color, colorPalette);
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

  // Add backgroundColor to colorPalette if necessary
  if (convertOutput) {
    const bgColor: Color = transparentBackground
      ? [0, 0, 0, 0]
      : hexToRgb(backgroundColor);

    if (convertOutput) checkAndAddToColorPalette(bgColor, colorPalette);
  }

  ctx.putImageData(newImageData, 0, 0);
  if (dontDrawGrassOnUpperBorder || dontDrawGrassOnLowerBorder) {
    const croppedImageData = ctx.getImageData(
      0,
      heightOffset,
      sourceImage.width,
      originalHeight
    );
    canvas.height = originalHeight;
    ctx.putImageData(croppedImageData, 0, 0);
  }

  return colorPalette;
}

function findNextValidDimension(n: number): number {
  while (n % 8 != 0) {
    n++;
  }
  return n;
}

function resize(
  canvas: HTMLCanvasElement,
  transparentBackground: boolean,
  backgroundColor: string
) {
  const ctx = canvas.getContext("2d");
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
  ctx.fillStyle = transparentBackground ? "transparent" : backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const dx = (width - originalWidth) / 2; // Center horizontally
  const dy = height - originalHeight; // Align to bottom
  ctx.putImageData(imageData, dx, dy);
}

function convertOutputToIndexedPng(
  canvas: HTMLCanvasElement,
  colorPalette: Color[],
  setDownloadUrl: Function
) {
  canvas.toBlob(
    async function (blob) {
      let metadata = png.decode(await blob.arrayBuffer());
      metadata.colorType = COLOR_TYPES.PALETTE;
      metadata.palette = colorPalette;
      metadata.interlace = 0;
      const imageBuffer = png.encode(metadata);
      const fileBlob = new Blob([imageBuffer], { type: "image/png" });
      setDownloadUrl(URL.createObjectURL(fileBlob));
    },
    "image/png",
    1
  );
}

// This function is used at the terrain & maskColor React states
// So that value is stored at and read from URL params.
// If the value not defined, it sets to defaultValue.
function useQueryParam(
  key: string,
  defaultValue?: string
): [value: string, set: (value: string) => void] {
  const [value, setValue] = React.useState<string>();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key) ?? defaultValue);
  }, []);

  return [
    value,
    (newValue) => {
      setValue(newValue);
      const params = new URLSearchParams(window.location.search);
      params.set(key, newValue);
      window.history.replaceState({}, "", `${location.pathname}?${params}`);
    },
  ];
}

function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const [match, r, g, b] = result;
    return [...[r, g, b].map((s) => parseInt(s, 16)), 255] as Color;
  } else {
    return null;
  }
}

function getDownloadButton(downloadUrl: string) {
  return (
    <>
      <br />
      <a href={downloadUrl} download="wa-texturizer-map.png">
        Download .png
      </a>
    </>
  );
}

export default function Home() {
  const [sourceImage, setSourceImage] = React.useState<HTMLImageElement>(null);
  const [terrain, setTerrain] = useQueryParam("terrain", "Art");
  const [maskColor, setMaskColor] = useQueryParam("maskColor", "#ffffff");
  const [backgroundColor, setBackgroundColor] = useQueryParam(
    "backgroundColor",
    "#000000"
  );
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement>();
  const [images, setImages] = React.useState({});
  const [dontDrawGrassOnUpperBorder, SetDontDrawGrassOnUpperBorder] =
    React.useState(0);
  const [dontDrawGrassOnLowerBorder, SetDontDrawGrassOnLowerBorder] =
    React.useState(0);
  const [convertOutput, setConvertOutput] = React.useState(0);
  const [resizeOutput, setResizeOutput] = React.useState(0);
  const [transparentBackground, setTransparentBackground] = React.useState(0);
  const [downloadUrl, setDownloadUrl] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setImages(await loadImages(IMAGE_PATHS));
    })();
  }, []);

  React.useEffect(() => {
    if (canvas && sourceImage && !_.isEmpty(images)) {
      // _.defer:
      // Defers invoking the function until the current call stack has cleared,
      // similar to using setTimeout with a delay of 0. Useful for performing
      // expensive computations or HTML rendering in chunks without blocking
      // the UI thread from updating.
      _.defer(() => {
        const colorPalette = texturize(
          canvas,
          sourceImage,
          dontDrawGrassOnUpperBorder,
          dontDrawGrassOnLowerBorder,
          images[`Terrain/${terrain}/text.png`],
          images[`Terrain/${terrain}/grass.png`],
          hexToRgb(maskColor),
          convertOutput,
          transparentBackground,
          backgroundColor
        );
        if (resizeOutput) {
          resize(canvas, transparentBackground === 1, backgroundColor);
        }
        if (convertOutput) {
          convertOutputToIndexedPng(canvas, colorPalette, setDownloadUrl);
        } else {
          setDownloadUrl(canvas.toDataURL("image/png"));
        }
      });
    }
  }, [
    terrain,
    canvas,
    sourceImage,
    images,
    maskColor,
    backgroundColor,
    dontDrawGrassOnUpperBorder,
    dontDrawGrassOnLowerBorder,
    convertOutput,
    resizeOutput,
    transparentBackground,
  ]);

  const handleSetDontDrawGrassOnUpperBorder = (value: boolean) => {
    SetDontDrawGrassOnUpperBorder(value ? 1 : 0);
  };
  const handleSetDontDrawGrassOnLowerBorder = (value: boolean) => {
    SetDontDrawGrassOnLowerBorder(value ? 1 : 0);
  };
  const handleSetConvertOutput = (value: boolean) => {
    if (value) {
      setConvertOutput(1);
      // Force the ResizeOutput checkbox
      setResizeOutput(1);
      (document.getElementById("resize") as HTMLInputElement).checked = true;
    } else {
      setConvertOutput(0);
    }
  };
  const handleSetResizeOutput = (value: boolean) => {
    setResizeOutput(value ? 1 : 0);
  };
  const handleSetTransparentBackground = (value: boolean) => {
    setTransparentBackground(value ? 1 : 0);
  };

  if (!terrain) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>W:A Texturizer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <input
        type="file"
        accept="image/*"
        className="options"
        onChange={(e) => {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.addEventListener("load", () => {
            const img = new Image();
            img.addEventListener("load", () => setSourceImage(img));
            img.src = reader.result.toString();
          });
          reader.readAsDataURL(file);
        }}
      />
      <select value={terrain} onChange={(e) => setTerrain(e.target.value)}>
        {TERRAINS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        type="color"
        className="color-input"
        value={maskColor}
        onChange={(e) => setMaskColor(e.target.value)}
      />
      <br />
      <label className="options">
        <input
          type="checkbox"
          id="upper-border"
          value={dontDrawGrassOnUpperBorder}
          onChange={(e) =>
            handleSetDontDrawGrassOnUpperBorder(e.target.checked)
          }
        />
        Don't draw grass on top image border
      </label>
      <br />
      <label className="options">
        <input
          type="checkbox"
          id="lower-border"
          value={dontDrawGrassOnLowerBorder}
          onChange={(e) =>
            handleSetDontDrawGrassOnLowerBorder(e.target.checked)
          }
        />
        Don't draw grass on bottom image border
      </label>
      <br />
      <label className="options">
        <input
          type="checkbox"
          id="convert"
          value={convertOutput}
          onChange={(e) => handleSetConvertOutput(e.target.checked)}
        />
        Convert output for W:A compatibility
      </label>
      <br />
      <label className="options">
        <input
          type="checkbox"
          id="resize"
          value={resizeOutput}
          disabled={convertOutput === 1}
          onChange={(e) => handleSetResizeOutput(e.target.checked)}
        />
        Resize output to valid W:A map dimensions
      </label>
      <br />
      {resizeOutput === 1 && (
        <div className="resize-options-div">
          <label className="options">
            Transparent background
            <input
              type="checkbox"
              id="resize"
              value={transparentBackground}
              onChange={(e) => handleSetTransparentBackground(e.target.checked)}
            />
          </label>
          <p className="options or">or</p>
          <label className="options">
            Set background color
            <input
              type="color"
              className="color-input"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              disabled={transparentBackground === 1}
            />
          </label>
        </div>
      )}
      <canvas key={terrain} ref={setCanvas} />
      {!!sourceImage && getDownloadButton(downloadUrl)}
    </div>
  );
}
