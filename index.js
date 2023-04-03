const { execFileSync } = require("child_process");
const { ECRClient, GetAuthorizationTokenCommand } = require("@aws-sdk/client-ecr");
const core = require("@actions/core");
const github = require("@actions/github");

main();

async function main() {
    try {
        const repositoryUrl = core.getInput("repository-url");
        const imageTags = core.getInput("image-tag").split("\n").map((str) => str.trim()).filter(Boolean);

        const password = await getEcrDockerPassword();
        execFileSync("docker", ["login", "--username", "AWS", "--password-stdin", repositoryUrl], { input: password });

        imageTags.forEach((tag) => {
            const remoteTag = `${github.context.runId}-${tag}`;
            execFileSync("docker", ["tag", tag, `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" })
            execFileSync("docker", ["push", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" })
        });

        execFileSync("docker", ["logout", repositoryUrl]);
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function getEcrDockerPassword() {
    const client = new ECRClient({});
    const response = await client.send(new GetAuthorizationTokenCommand());
    return Buffer.from(response.authorizationData[0].authorizationToken, "base64");
}
