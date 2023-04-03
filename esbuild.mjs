import { build } from "esbuild";

const config = {
    bundle: true,
    minify: true,
    charset: "utf8",
    entryPoints: ["index.js"],
    outdir: "dist",
    platform: "node",
    target: "node16",
    mainFields: ["module", "main"],
};

build(config)
    .then(() => {
        console.log("Build completed successfully.");
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
