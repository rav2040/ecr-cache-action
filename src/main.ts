import { execFileSync } from "child_process";
import { getInput, setFailed } from "@actions/core";
import { context as gitHubContext } from "@actions/github";

async function main() {
    try {
        const repositoryUrl = getInput("repository-url");
        const imageTag = getInput("image-tag");
        const runNumber = getInput("run-number") || null;

        const password = execFileSync("aws", ["ecr", "get-login-password"]);

        execFileSync("docker", ["login", "--username", "AWS", "--password-stdin", repositoryUrl], { input: password });

        const pushImage = (tag: string) => {
            const remoteTag = `${gitHubContext.runNumber}-${encodeURIComponent(tag)}`;
            execFileSync("docker", ["tag", tag, `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
            execFileSync("docker", ["push", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
        }

        const pullImage = (tag: string) => {
            const remoteTag = `${runNumber}-${encodeURIComponent(tag)}`;
            execFileSync("docker", ["pull", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
            execFileSync("docker", ["tag", `${repositoryUrl}:${remoteTag}`, tag], { stdio: "inherit" });
            execFileSync("docker", ["rmi", `${repositoryUrl}:${remoteTag}`], { stdio: "inherit" });
        }

        const tags = imageTag.split(/\s+(?=([^"]*"[^"]*")*[^"]*$)/g).filter(Boolean).map((str) => str.trim());
        const uniqueTags = Array.from(new Set(tags));

        uniqueTags.forEach(typeof runNumber !== "string" ? pushImage : pullImage)

        execFileSync("docker", ["logout", repositoryUrl]);
    } catch (err) {
        if (err instanceof Error) setFailed(err);
    }
}

main();
