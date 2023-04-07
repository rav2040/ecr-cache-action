import { build } from "esbuild";

const config = {
    bundle: true,
    minify: true,
    charset: "utf8",
    entryPoints: ["src/main.ts"],
    outfile: "lib/main.mjs",
    platform: "node",
    target: "node16",
    format: "esm",
    mainFields: ["module", "main"],
};

build(config)
    .then(() => console.info("Build completed successfully."))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
