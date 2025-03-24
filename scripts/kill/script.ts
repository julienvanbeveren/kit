import { execSync } from "child_process";

export default async function kill(port: number) {
    console.log(`Killing process on port ${port}`);
    try {
        execSync(`npx kill-port ${port}`, { stdio: "ignore" });
        console.log(`Process on port ${port} killed`);
    } catch (error) {
        console.error(`Error killing process on port ${port}: ${error}`);
    }
}