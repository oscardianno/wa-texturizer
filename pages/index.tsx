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
      <div className="download-div">
        <a href={downloadUrl} download="wa-texturizer-map.png">
          <img src="save.png" alt="Save icon" /> <br />
          <b>Download PNG</b>
        </a>
      </div>
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
  const [hotReloading, setHotReloading] = React.useState(true);
  const [renderNow, setRenderNow] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setImages(await loadImages(IMAGE_PATHS));
      const sampleImage = await loadImages([SAMPLE_IMAGE_PATH]);
      setSourceImage(Object.values(sampleImage)[0]);
    })();
  }, []);

  React.useEffect(() => {
    if (
      (hotReloading || renderNow) &&
      canvas &&
      sourceImage &&
      !_.isEmpty(images)
    ) {
      setIsLoading(true);
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

        if (renderNow) setRenderNow(false);
        setIsLoading(false);
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
    hotReloading,
    renderNow,
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
        <div className="block top">
          <label htmlFor="file-input" className="title">
            Upload a source image:
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              handleUploadFile(e);
            }}
          />
        </div>

        <div className="block narrow top">
          <label htmlFor="terrain-select" className="title">
            Select a terrain texture:
          </label>
          <select
            id="terrain-select"
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
        </div>

        <div className="block top">
          <label htmlFor="mask-color-select" className="top title">
            Set the mask color:
          </label>
          <input
            id="mask-color-select"
            type="color"
            value={maskColor}
            onChange={(e) => setMaskColor(e.target.value)}
          />
        </div>
      </div>

      <div className="options container">
        <div className="block">
          <h3 className="title">Options:</h3>
          <label>
            <input
              id="upper-border"
              type="checkbox"
              checked={dontDrawGrassOnUpperBorder}
              onChange={(e) => setDontDrawGrassOnUpperBorder(e.target.checked)}
            />
            Don't draw grass on top image border
          </label>
          <br />
          <label>
            <input
              id="lower-border"
              type="checkbox"
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
              id="resize"
              type="checkbox"
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
                  id="resize"
                  type="checkbox"
                  checked={transparentBackground}
                  onChange={(e) => setTransparentBackground(e.target.checked)}
                />
              </label>
              <p className="options or">or</p>
              <label>
                Set background color:
                <input
                  id="background-color"
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
          <h3 className="title">Output:</h3>
          <input
            id="hot-reload"
            type="checkbox"
            checked={hotReloading}
            onChange={(e) => setHotReloading(e.target.checked)}
          />
          <label htmlFor="hot-reload">Enable hot reloading</label>
          <span className="tooltip">
            <span className="tooltip-text">
              Automatically re-render the map as options are changed
            </span>
            ?
          </span>
          {!hotReloading && (
            <button
              className="texturize-button"
              onClick={() => setRenderNow(true)}
            >
              <b>Texturize!</b>
            </button>
          )}
          <div className="loading-icon-container">
            <img
              className={`button loading-icon ${isLoading ? "active" : ""}`}
              src="arrowsdr.gif"
              alt="Animated loading icon"
            />
          </div>
          <br />
          <br />
          {!!sourceImage &&
            getDownloadInfo(
              downloadUrl,
              colorPaletteCount,
              transparentBackground
            )}
        </div>
      </div>

      <div className="canvas-container">
        <canvas ref={setCanvas} />
        <img
          className={`canvas loading-icon ${isLoading ? "active" : ""}`}
          src="arrowsdr.gif"
          alt="Animated loading icon"
        />
      </div>

      <a href="https://github.com/oscardianno/wa-texturizer" target="_blank">
        <svg
          className="github-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 496 512"
        >
          {/* <!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --> */}
          <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
        </svg>
      </a>
    </div>
  );
}
