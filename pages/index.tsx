import Head from "next/head";
import React from "react";
import _ from "lodash";
import {
  texturize,
  resize,
  convertOutputToIndexedPng,
} from "./image-processing";

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
  const [dontDrawGrassOnUpperBorder, setDontDrawGrassOnUpperBorder] =
    React.useState(false);
  const [dontDrawGrassOnLowerBorder, setDontDrawGrassOnLowerBorder] =
    React.useState(false);
  const [convertOutput, setConvertOutput] = React.useState(false);
  const [resizeOutput, setResizeOutput] = React.useState(false);
  const [transparentBackground, setTransparentBackground] =
    React.useState(false);
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
          terrain,
          canvas,
          sourceImage,
          dontDrawGrassOnUpperBorder,
          dontDrawGrassOnLowerBorder,
          images[`Terrain/${terrain}/text.png`],
          images[`Terrain/${terrain}/grass.png`],
          maskColor,
          convertOutput,
          transparentBackground,
          backgroundColor
        );

        if (resizeOutput)
          resize(canvas, transparentBackground, backgroundColor);

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

  const handleSetConvertOutput = (value: boolean) => {
    setConvertOutput(value);
    // Force the resizeOutput checkbox
    if (value) setResizeOutput(true);
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
          checked={dontDrawGrassOnUpperBorder}
          onChange={(e) => setDontDrawGrassOnUpperBorder(e.target.checked)}
        />
        Don't draw grass on top image border
      </label>
      <br />
      <label className="options">
        <input
          type="checkbox"
          id="lower-border"
          checked={dontDrawGrassOnLowerBorder}
          onChange={(e) => setDontDrawGrassOnLowerBorder(e.target.checked)}
        />
        Don't draw grass on bottom image border
      </label>
      <br />
      <label className="options">
        <input
          type="checkbox"
          id="convert"
          checked={convertOutput}
          onChange={(e) => handleSetConvertOutput(e.target.checked)}
        />
        Convert output for W:A compatibility
      </label>
      <br />
      <label className="options">
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
        <div className="resize-options-div">
          <label className="options">
            Transparent background
            <input
              type="checkbox"
              id="resize"
              checked={transparentBackground}
              onChange={(e) => setTransparentBackground(e.target.checked)}
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
              disabled={transparentBackground}
            />
          </label>
        </div>
      )}
      <canvas key={terrain} ref={setCanvas} />
      {!!sourceImage && getDownloadButton(downloadUrl)}
    </div>
  );
}
