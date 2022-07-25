import Head from "next/head";
import React, { useState, useEffect } from "react";
import _ from "lodash";
import { getTerrainColorPalette } from "../src/image-processing";
import ErrorPage from "next/error";

// Disable this page in the deployed app; set to false to access it
const DISABLED_PAGE = true;

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

export default function Home() {
  const [terrain, setTerrain] = useState(TERRAINS[6]);
  const [images, setImages] = useState({});

  useEffect(() => {
    (async () => {
      setImages(await loadImages(IMAGE_PATHS));
    })();
  }, []);

  useEffect(() => {
    if (!_.isEmpty(images)) {
      let dataString = "";
      TERRAINS.forEach((t) => {
        dataString += `'${t.name}': {`;
        const palette = getTerrainColorPalette(
          images[`Terrain/${t.name}/text.png`],
          images[`Terrain/${t.name}/grass.png`]
        );
        Object.entries(palette).forEach((color) => {
          dataString += `'${color[0]}': [${color[1]}],`;
        });
        dataString += `},\n`;
      });

      console.log(dataString);
    }
  }, [images]);

  if (DISABLED_PAGE) {
    return <ErrorPage statusCode={403} title={"This page is not available"} />;
  }

  return (
    <div>
      <Head>
        <title>W:A Texturizer</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="darkreader-lock" />
      </Head>
      <picture>
        <img id="logo" src="/texturized-logo.png" alt="W:A texturizer logo" />
      </picture>
      <br />

      <div className="container">
        <div className="options vertical container">
          <div className="section">
            <h3 className="title">Input</h3>
            <div className="block">
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
          </div>
        </div>
      </div>

      <a
        href="https://github.com/oscardianno/wa-texturizer"
        target="_blank"
        rel="noreferrer"
      >
        <svg
          id="github-icon"
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
