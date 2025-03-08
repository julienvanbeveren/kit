import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function setupTempDirectory(): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-migrate-clean-'));

    // Copy Dockerfile from script directory
    const scriptDir = __dirname;
    fs.copyFileSync(path.join(scriptDir, 'Dockerfile'), path.join(tmpDir, 'Dockerfile'));

    return tmpDir;
}

export default async function prismaMigrateClean(migrationName: string) {
    try {
        console.log('Starting Prisma migration...');
        // Check if prisma directory exists
        if (!fs.existsSync('./prisma')) {
            throw new Error('Prisma directory not found. Please run this command from your project root.');
        }

        // Create temporary directory and copy Dockerfile
        const tmpDir = setupTempDirectory();
        console.log('Created temporary environment...');

        // Copy necessary files to temp directory
        execSync(`cp -r ./prisma ${tmpDir}/`);
        if (fs.existsSync('./package.json')) {
            execSync(`cp package.json ${tmpDir}/`);
        }
        if (fs.existsSync('./package-lock.json')) {
            execSync(`cp package-lock.json ${tmpDir}/`);
        }

        // Build and run Docker container
        console.log('Building Docker image...');
        execSync(`docker build -t prisma-migrate-clean ${tmpDir}`, { stdio: 'inherit' });

        console.log('Running migrations in clean environment...');
        execSync(
            `docker run --rm -e MIGRATION_NAME="${migrationName}" prisma-migrate-clean`,
            { stdio: 'inherit' }
        );

        // Cleanup
        console.log('Cleaning up...');
        fs.rmSync(tmpDir, { recursive: true, force: true });
        execSync('docker rmi prisma-migrate-clean', { stdio: 'inherit' });

        console.log('Migration completed successfully! 🎉');
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
} 