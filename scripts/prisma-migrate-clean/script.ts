import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { glob } from 'glob';

function getEnvVarFromSchema(): string {
    // Find all .prisma files in the prisma directory
    const schemaFiles = glob.sync('./prisma/**/*.prisma');

    if (schemaFiles.length === 0) {
        throw new Error('No Prisma schema files found in ./prisma directory');
    }

    // Look through each schema file for the datasource block
    for (const schemaPath of schemaFiles) {
        const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
        const envMatch = schemaContent.match(/datasource\s+db\s*{[^}]*url\s*=\s*env\("([^"]+)"\)/);

        if (envMatch) {
            console.log(`Found database configuration in: ${schemaPath}`);
            return envMatch[1]; // Returns the environment variable name (e.g., "DATABASE_URL")
        }
    }

    throw new Error('Could not find database URL environment variable in any of the Prisma schema files');
}

function setupTempDirectory(): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-migrate-clean-'));

    // Copy Dockerfile from script directory
    const scriptDir = path.dirname(__filename);
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

        // Get the environment variable name from schema
        const envVarName = getEnvVarFromSchema();
        console.log(`Using environment variable: ${envVarName}`);

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
            `docker run --rm -it -v ./prisma/migrations:/app/prisma/migrations -e ${envVarName}="postgresql://prisma:prisma@localhost:5432/prisma_db" -e MIGRATION_NAME="${migrationName}" prisma-migrate-clean`,
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