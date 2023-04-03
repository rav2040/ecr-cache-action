const { execFileSync } = require("child_process");
const core = require("@actions/core");
const github = require("@actions/github");

main();

async function main() {
    try {
        const repositoryUrl = core.getInput("repository-url");
        const runId = core.getInput("run-id");
        const imageTag = core.getInput("image-tag") ?? "";
        const imageLabel = core.getInput("image-label") ?? "";

        if (imageTag.length === 0 && imageLabel.length === 0) {
            throw Error("At least one of 'image-tag' or 'image-label' must be defined.")
        }

        const imageLabelTag = execFileSync("docker",
            [
                "images",
                "--filter", `label=${imageLabel.trim()}`,
                "--format", '"{{.Repository}}"'
            ],
            { encoding: "utf8" }
        )

        const tags = [imageTag, imageLabelTag].join("\n").split("\n").map((str) => str.trim()).filter(Boolean);
        const uniqueTags = Array.from(new Set(tags));

        const password = execFileSync("aws", ["ecr", "get-login-password"]);
        execFileSync("docker", ["login", "--username", "AWS", "--password-stdin", repositoryUrl], { input: password });

        const cb = runId === undefined ? (tag) => {
            const remoteTag = `${github.context.runId}-${tag}`;
            execFileSync("docker", ["tag", tag, `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
            execFileSync("docker", ["push", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
        } : (tag) => {
            const remoteTag = `${runId}-${tag}`;
            execFileSync("docker", ["pull", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
            execFileSync("docker", ["tag", `${repositoryUrl}:${remoteTag}`, tag], { stdio: "inherit" });
            execFileSync("docker", ["rmi", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
        }

        uniqueTags.forEach(cb);

        execFileSync("docker", ["logout", repositoryUrl]);
    } catch (error) {
        core.setFailed(error.message);
    }
}
