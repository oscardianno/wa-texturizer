import Head from "next/head";
import React from "react";
import _ from "lodash";
import {
  texturize,
  resize,
  convertOutputToIndexedPng,
} from "./../src/image-processing";

// TERRAINS defines the terrain options that will be available through the app
const TERRAINS = [
  { name: "-Beach", index: 0 },
  { name: "-Desert", index: 1 },
  { name: "-Forest", index: 2 },
  { name: "-Farm", index: 3 },
  { name: "-Hell", index: 4 },
  { name: "Art", index: 5 },
  { name: "Cheese", index: 6 },
  { name: "Construction", index: 7 },
  { name: "Desert", index: 8 },
  // {name: "Dungeon", index: 9},
  { name: "Easter", index: 10 },
  { name: "Forest", index: 11 },
  { name: "Fruit", index: 12 },
  { name: "Gulf", index: 13 },
  { name: "Hell", index: 14 },
  { name: "Hospital", index: 15 },
  { name: "Jungle", index: 16 },
  { name: "Manhattan", index: 17 },
  { name: "Medieval", index: 18 },
  { name: "Music", index: 19 },
  { name: "Pirate", index: 20 },
  { name: "Snow", index: 21 },
  { name: "Space", index: 22 },
  { name: "Sports", index: 23 },
  { name: "Tentacle", index: 24 },
  { name: "Time", index: 25 },
  { name: "Tools", index: 26 },
  { name: "Tribal", index: 27 },
  { name: "Urban", index: 28 },
];

// IMAGE_PATHS stores the paths of the images needed for each terrain available
// text.png for the texture and grass.png
const SAMPLE_IMAGE_PATH = "Sample/sample-map-reduced.png";
const IMAGE_PATHS = [
  ...TERRAINS.map((t) => `Terrain/${t.name}/text.png`),
  ...TERRAINS.map((t) => `Terrain/${t.name}/grass.png`),
];

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

function getDownloadInfo(
  downloadUrl: string,
  colorPaletteCount: number,
  transparentBackground: boolean
) {
  let message = "";
  let wikiSource = "https://worms2d.info/Colour_map#Colour_limitation";
  if (colorPaletteCount > 0) {
    if (transparentBackground) colorPaletteCount -= 1;

    if (colorPaletteCount < 65) {
      message = "It will be displayed perfectly, with no glitches.";
    } else if (colorPaletteCount < 97) {
      message =
        "Background sprites (falling debris, clouds, etc.) will be removed, " +
        "and the destroyed-soil background may be glitchy.";
    } else if (colorPaletteCount < 113) {
      message =
        "Background sprites (falling debris, clouds, etc.) will be removed, " +
        "the destroyed soil background will be transparent, " +
        "the destroyed-soil border will be solid gray and " +
        "the background gradient will appear dithered.";
    } else {
      message =
        "It will not load. You'll have to use some " +
        "image editor software to reduce the number of colors.";
    }
  }
  return (
    <>
      <a href={downloadUrl} download="wa-texturizer-map.png">
        Download .png
      </a>
      <br />
      <br />
      {colorPaletteCount > 0 && (
        <div className="output-info">
          <div>
            <span>Generated map contains </span>
            <span className="highlight">
              <b>{colorPaletteCount}</b>
            </span>
            <span> colors</span>
          </div>
          <span>{message}</span>
          <span className="highlight"> - </span>
          <a href={wikiSource} target="_blank">
            Read more
          </a>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [sourceImage, setSourceImage] = React.useState<HTMLImageElement>(null);
  const [terrain, setTerrain] = React.useState(TERRAINS[6]);
  const [maskColor, setMaskColor] = useQueryParam("maskColor", "#ffffff");
  const [backgroundColor, setBackgroundColor] = useQueryParam(
    "backgroundColor",
    "#000000"
  );
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement>();
  const [images, setImages] = React.useState({});
  const [dontDrawGrassOnUpperBorder, setDontDrawGrassOnUpperBorder] =
    React.useState(false);
  const [dontDrawGrassOnLowerBorder, setDontDrawGrassOnLowerBorder] =
    React.useState(false);
  const [convertOutput, setConvertOutput] = React.useState(false);
  const [resizeOutput, setResizeOutput] = React.useState(false);
  const [transparentBackground, setTransparentBackground] =
    React.useState(false);
  const [colorPaletteCount, setColorPaletteCount] = React.useState(0);
  const [downloadUrl, setDownloadUrl] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setImages(await loadImages(IMAGE_PATHS));
      const sampleImage = await loadImages([SAMPLE_IMAGE_PATH]);
      setSourceImage(Object.values(sampleImage)[0]);
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
          terrain.name,
          canvas,
          sourceImage,
          images[`Terrain/${terrain.name}/text.png`],
          images[`Terrain/${terrain.name}/grass.png`],
          maskColor,
          dontDrawGrassOnUpperBorder,
          dontDrawGrassOnLowerBorder,
          convertOutput,
          transparentBackground,
          backgroundColor
        );

        if (resizeOutput)
          resize(canvas, transparentBackground, backgroundColor);

        setColorPaletteCount(colorPalette.length);
        if (convertOutput) {
          convertOutputToIndexedPng(
            canvas,
            terrain.index,
            colorPalette,
            setDownloadUrl
          );
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

  const handleSetConvertOutput = (value: boolean) => {
    setConvertOutput(value);
    // Force the resizeOutput checkbox
    if (value) setResizeOutput(true);
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const img = new Image();
      img.addEventListener("load", () => setSourceImage(img));
      img.src = reader.result.toString();
    });
    reader.readAsDataURL(file);
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
      <img
        className="logo"
        src="texturized-logo.png"
        alt="W:A texturizer logo"
      />
      <br />

      <div className="options container">
        <div className="block">
          <label>
            Upload a source image: <br />
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleUploadFile(e);
              }}
            />
          </label>
        </div>

        <div className="block">
          <label>
            Select a terrain texture: <br />
            <select
              value={terrain.name}
              onChange={(e) =>
                setTerrain(TERRAINS.find((t) => t.name === e.target.value))
              }
            >
              {TERRAINS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="block">
          <label>
            Select a mask color: <br />
            <input
              type="color"
              value={maskColor}
              onChange={(e) => setMaskColor(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="options container">
        <div className="block">
          <h3>Options:</h3>
          <label>
            <input
              type="checkbox"
              id="upper-border"
              checked={dontDrawGrassOnUpperBorder}
              onChange={(e) => setDontDrawGrassOnUpperBorder(e.target.checked)}
            />
            Don't draw grass on top image border
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              id="lower-border"
              checked={dontDrawGrassOnLowerBorder}
              onChange={(e) => setDontDrawGrassOnLowerBorder(e.target.checked)}
            />
            Don't draw grass on bottom image border
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              id="convert"
              checked={convertOutput}
              onChange={(e) => handleSetConvertOutput(e.target.checked)}
            />
            Convert output for W:A compatibility
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              id="resize"
              checked={resizeOutput}
              disabled={convertOutput}
              onChange={(e) => setResizeOutput(e.target.checked)}
            />
            Resize output to valid W:A map dimensions
          </label>
          <br />
          {resizeOutput && (
            <div className="indented-options">
              <label>
                Transparent background
                <input
                  type="checkbox"
                  id="resize"
                  checked={transparentBackground}
                  onChange={(e) => setTransparentBackground(e.target.checked)}
                />
              </label>
              <p className="options or">or</p>
              <label>
                Set background color:
                <input
                  type="color"
                  className="color-input"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={transparentBackground}
                />
              </label>
            </div>
          )}
        </div>

        <div className="block">
          <h3>Output:</h3>
          {!!sourceImage &&
            getDownloadInfo(
              downloadUrl,
              colorPaletteCount,
              transparentBackground
            )}
        </div>
      </div>

      <canvas key={terrain.name} ref={setCanvas} />
    </div>
  );
}
