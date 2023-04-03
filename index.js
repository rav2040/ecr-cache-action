const { execFileSync } = require("child_process");
const core = require("@actions/core");
const github = require("@actions/github");

main();

async function main() {
    try {
        const repositoryUrl = core.getInput("repository-url");
        const imageTags = core.getInput("image-tag").split("\n").map((str) => str.trim()).filter(Boolean);
        const runId = core.getInput("run-id");

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

        imageTags.forEach(cb);

        execFileSync("docker", ["logout", repositoryUrl]);
    } catch (error) {
        core.setFailed(error.message);
    }
}
