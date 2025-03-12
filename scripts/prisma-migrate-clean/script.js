"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = prismaMigrateClean;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
function setupTempDirectory() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-migrate-clean-'));
    // Copy Dockerfile from script directory
    const scriptDir = path.dirname(__filename);
    fs.copyFileSync(path.join(scriptDir, 'Dockerfile'), path.join(tmpDir, 'Dockerfile'));
    return tmpDir;
}
async function prismaMigrateClean(migrationName) {
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
        (0, child_process_1.execSync)(`cp -r ./prisma ${tmpDir}/`);
        if (fs.existsSync('./package.json')) {
            (0, child_process_1.execSync)(`cp package.json ${tmpDir}/`);
        }
        if (fs.existsSync('./package-lock.json')) {
            (0, child_process_1.execSync)(`cp package-lock.json ${tmpDir}/`);
        }
        // Build and run Docker container
        console.log('Building Docker image...');
        (0, child_process_1.execSync)(`docker build -t prisma-migrate-clean ${tmpDir}`, { stdio: 'inherit' });
        console.log('Running migrations in clean environment...');
        (0, child_process_1.execSync)(`docker run --rm -e MIGRATION_NAME="${migrationName}" prisma-migrate-clean`, { stdio: 'inherit' });
        // Cleanup
        console.log('Cleaning up...');
        fs.rmSync(tmpDir, { recursive: true, force: true });
        (0, child_process_1.execSync)('docker rmi prisma-migrate-clean', { stdio: 'inherit' });
        console.log('Migration completed successfully! 🎉');
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
