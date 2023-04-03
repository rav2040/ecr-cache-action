const { execFileSync } = require("child_process");
const core = require("@actions/core");
const github = require("@actions/github");

main();

async function main() {
    try {
        const repositoryUrl = core.getInput("repository-url");
        const password = execFileSync("aws", ["ecr", "get-login-password"]);

        const runId = core.getInput("run-id");

        if (runId === undefined) {
            const imageTag = core.getInput("image-tag") ?? "";
            const imageLabel = core.getInput("image-label") ?? "";

            if (imageTag.length === 0 && imageLabel.length === 0) {
                throw Error("At least one of 'image-tag' or 'image-label' must be defined.")
            }

            const imageLabelTag = execFileSync("docker", [
                "images",
                "--filter", `label=${imageLabel.trim()}`,
                "--format", '"{{.Repository}}"'
            ], { encoding: "utf8" });

            const tags = [imageTag, imageLabelTag].join("\n").split("\n").map((str) => str.trim()).filter(Boolean);
            const uniqueTags = Array.from(new Set(tags));

            execFileSync("docker", ["login", "--username", "AWS", "--password-stdin", repositoryUrl], { input: password });

            uniqueTags.forEach((tag) => {
                const remoteTag = `${github.context.runId}-${tag}`;
                execFileSync("docker", ["tag", tag, `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
                execFileSync("docker", ["push", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
            });

            execFileSync("docker", ["logout", repositoryUrl]);
            return;
        }

        const output = execFileSync("aws", [
            "ecr", "list-images",
            "--repository-name", repositoryUrl.slice(repositoryUrl.lastIndexOf("/") + 1),
            "--filter", '"tagStatus=TAGGED"',
            "--query", `'imageIds[?starts_with(imageTag, \`${runId}-\`)]'`,
            "--no-paginate",
        ]);
        const tags = JSON.parse(output).map(({ imageTag }) => imageTag);

        execFileSync("docker", ["login", "--username", "AWS", "--password-stdin", repositoryUrl], { input: password });

        tags.forEach((tag) => {
            execFileSync("docker", ["pull", `${repositoryUrl}:${tag}`], { stdio: "inherit" });
            execFileSync("docker", ["tag", `${repositoryUrl}:${tag}`, tag.slice(tag.indexOf("-") + 1)], { stdio: "inherit" });
            execFileSync("docker", ["rmi", `${repositoryUrl}:${tag}`], { stdio: "inherit" });
        });

        execFileSync("docker", ["logout", repositoryUrl]);
    } catch (error) {
        core.setFailed(error.message);
    }
}
