![texturized-logo](https://user-images.githubusercontent.com/46467428/179379279-76dbac2e-f3e7-4efe-916b-74f0d061ef35.png)

<p align="center">Create pixel-perfect maps for <b>Worms: Armageddon</b> with the game's terrain textures</p>

<p align="justify">
The purpose of this app is to allow you to create maps that look W:A generated; in the style of the classic terrains, but keeping them pixel-perfect. This means that transparent pixels will always stay transparent, so that you can create precise race maps that will still work as they were meant to after the textures are applied. In addition, the app can automatically convert the output file to make it straight-forward compatible with the game, by encoding the PNG file with an 8-bit indexed color palette and writing the game's special PNG chunk.

Also, the application style was designed to follow W:A's graphical interfaces style :))

</p>

## How to use

1. Create a map with the image-editing software of your choice.  
   Use a single color for all the land that you want the textures to be applied - this will be your _mask color_.  
   **TIP**: Disable **_Anti-aliasing_** on the tool you use to trace these shapes.  
   ![1 - editor map example](https://user-images.githubusercontent.com/46467428/179600853-a2a3a0a6-bb03-403f-8b12-7180986edef7.png)
2. [Open the app](https://wa-map-texturizer.vercel.app/) and upload your map.  
   ![2 - upload file](https://user-images.githubusercontent.com/46467428/179584381-33fa1cbb-f65e-47b2-926d-f36bcbccbb4a.png)

3. Set the _mask color_ to the one you used when creating your map.  
   ![3 - mask color](https://user-images.githubusercontent.com/46467428/179604644-3f200d9c-c5b1-40b0-bdc1-9b21ffdb9c36.png)

4. Voila! You have your map with the textures of the terrain selected applied :))  
   You can change the terrain texture and play with the options to modify the output.  
   ![4 - output](https://user-images.githubusercontent.com/46467428/179600755-2c4fe78f-942c-4139-add0-4d8e10c96295.png)

5. If you check the _"Convert output for W:A compatibility"_ you can now download the PNG file and load it directly into W:A :D  
   ![5 - ingame](https://user-images.githubusercontent.com/46467428/179603230-b6568ad5-e47e-4656-a4c0-a855c4f34294.png)

## Useful resources

This is a list of sites where I found useful information when working on this project:

- [@vivaxy/png - npm module](https://www.npmjs.com/package/@vivaxy/png)
- [Comprehensive Image Processing on Browsers - vivaxy's Blog](https://vivaxyblog.github.io/2019/11/06/comprehensive-image-processing-on-browsers.html)
- [Decoding A PNG Image with JavaScript - vivaxy's Blog](https://vivaxyblog.github.io/2019/11/07/decode-a-png-image-with-javascript.html)
- [Colour map - Worms Knowledge Base](https://worms2d.info/Colour_map)
- [Monochrome map - Worms Knowledge Base](<https://worms2d.info/Monochrome_map_(.bit,_.lev)>)
- [png-chunks - npm module](https://www.npmjs.com/package/png-chunks)
- [PNG file chunk inspector](https://www.nayuki.io/page/png-file-chunk-inspector)

---

### Next.js project info

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

#### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
