import Head from 'next/head';
import React from "react";
import _ from "lodash";

const TERRAINS = [
  "Art",
  "Desert"
]

const IMAGE_PATHS = [
  ...TERRAINS.map(t => `Terrain/${t}/text.png`),
  ...TERRAINS.map(t => `Terrain/${t}/grass.png`),
];

const WHITE: Color = [255, 255, 255, 255];
const BLACK: Color = [0, 0, 0, 255];

function _getCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext("2d");
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return canvas;
}

const getCanvas = _.memoize(_getCanvas);

async function loadImages(imagePaths: string[]): Promise<{ [path: string]: HTMLImageElement }> {
  const images = await Promise.all<HTMLImageElement>(imagePaths.map(path => new Promise((resolve) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.src = path;
  })));

  return _.zipObject(imagePaths, images);
}

type Color = [r: number, g: number, b: number, a: number];

function getPixel(imgData: ImageData, x: number, y: number): Color {
  const index = y * imgData.width + x;
  return imgData.data.slice(index * 4, index * 4 + 4) as unknown as Color;
}

function setPixel(imgData: ImageData, x: number, y: number, color: Color) {
  const index = y * imgData.width + x;
  imgData.data.set(color, index * 4)
}

function getContext(image: HTMLImageElement): CanvasRenderingContext2D {
  const canvas = getCanvas(image);
  return canvas.getContext("2d");
}

function colorEqual(c1: Color, c2: Color): boolean {
  return (!c1 && !c2) || _.every(c1, (c, i) => c === c2[i]);
}

function closeToBlack([r, g, b]: Color) {
  return r < 40 && g < 40 && b < 40;
}

// function copyImageData(context: CanvasRenderingContext2D, src: ImageData) {
//     const dst = context.createImageData(src.width, src.height);
//     dst.data.set(src.data);
//     return dst;
// }

function texturize(canvas: HTMLCanvasElement, sourceImage: HTMLImageElement, textImage: HTMLImageElement, grassImage: HTMLImageElement, maskColor: Color) {
  const ctx = canvas.getContext("2d");
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  ctx.drawImage(sourceImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);
  const newImageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);

  const textContext = getContext(textImage);
  const textImageData = textContext.getImageData(0, 0, textImage.width, textImage.height);

  const grassContext = getContext(grassImage);
  const grassWidth = 64;
  const grassTopImageData = grassContext.getImageData(0, 0, grassWidth, grassImage.height);
  const grassBottomImageData = grassContext.getImageData(grassWidth, 0, grassWidth, grassImage.height);

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

  for (let x = 0; x < sourceImage.width; x++) {
    let below = grassImage.height - grassBottomOffset - 1;
    for (let y = sourceImage.height - 1; y >= 0; y--) {
      const sourceColor = getPixel(imageData, x, y);
      if (colorEqual(sourceColor, maskColor)) {
        let color: Color;
        if (below >= 0) {
          color = getPixel(grassBottomImageData, x % grassWidth, below);
        }

        if (!color || closeToBlack(color)) {
          color = getPixel(textImageData, x % textImage.width, y % textImage.height);
        }

        setPixel(newImageData, x, y, color);

        below--;
      } else {
        below = grassImage.height - grassBottomOffset - 1;
      }
    }

    let above = 0;
    for (let y = 0; y < sourceImage.height; y++) {
      const sourceColor = getPixel(imageData, x, y);
      if (colorEqual(sourceColor, maskColor)) {
        if (above < grassImage.height - grassTopOffset) {
          const color = getPixel(grassTopImageData, x % grassWidth, above + grassTopOffset);
          if (!closeToBlack(color)) {
            setPixel(newImageData, x, y, color);
          }
        }
        above++;
      } else {
        above = 0;
      }
    }
  }


  ctx.putImageData(newImageData, 0, 0);
}

function useQueryParam(key: string, defaultValue?: string): [value: string, set: (value: string) => void] {
  const [value, setValue] = React.useState<string>();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key) ?? defaultValue);
  }, []);

  return [value, newValue => {
    setValue(newValue);
    const params = new URLSearchParams(window.location.search);
    params.set(key, newValue);
    window.history.replaceState({}, '', `${location.pathname}?${params}`);
  }];
}

function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const [match, r, g, b] = result;
    return [...[r, g, b].map(s => parseInt(s, 16)), 255] as Color;
  } else {
    return null;
  }
}

export default function Home() {
  const [sourceImage, setSourceImage] = React.useState<HTMLImageElement>(null);
  const [terrain, setTerrain] = useQueryParam("terrain", "Art");
  const [maskColor, setMaskColor] = useQueryParam("maskColor", "#ffffff");
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement>();
  const [images, setImages] = React.useState({});

  React.useEffect(() => {
    (async () => {
      setImages(await loadImages(IMAGE_PATHS));
    })();
  }, [])

  React.useEffect(() => {
    if (canvas && sourceImage && !_.isEmpty(images)) {
      _.defer(() => {
        texturize(canvas, sourceImage, images[`Terrain/${terrain}/text.png`], images[`Terrain/${terrain}/grass.png`], hexToRgb(maskColor));
      });
    }
  }, [terrain, canvas, sourceImage, images, maskColor]);

  if (!terrain) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>W:A Texturizer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <input type="file" accept="image/*" onChange={e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const img = new Image();
          img.addEventListener("load", () => setSourceImage(img));
          img.src = reader.result.toString();
        })
        reader.readAsDataURL(file);
      }} />
      <select value={terrain} onChange={e => setTerrain(e.target.value)}>
        {TERRAINS.map(t => (<option key={t} value={t}>{t}</option>))}
      </select>
      <input type="color" value={maskColor} onChange={e => setMaskColor(e.target.value)} />
      <br />
      <canvas key={terrain} ref={setCanvas} />
    </div>
  )
}
