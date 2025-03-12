#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs';

interface ScriptManifest {
    command: string;
    description: string;
    arguments?: {
        name: string;
        description: string;
        required?: boolean;
    }[];
    dependencies?: string[];
}

async function loadScripts() {
    const program = new Command();
    program.name('kit').description('A customizable CLI toolkit');

    // Get the directory where the compiled index.js is located
    const baseDir = path.dirname(__filename);

    // Find all manifest.json files in the scripts directory relative to the compiled location
    const manifestFiles = await glob(path.join(baseDir, 'scripts/*/manifest.json'));

    for (const manifestFile of manifestFiles) {
        try {
            const manifest: ScriptManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
            const scriptDir = path.dirname(manifestFile);
            const scriptPath = path.join(scriptDir, 'script.js'); // Note: .js not .ts since we're in dist

            if (!fs.existsSync(scriptPath)) {
                console.warn(`Warning: Script file not found for ${manifest.command} at ${scriptPath}`);
                continue;
            }

            const command = program.command(manifest.command);
            command.description(manifest.description);

            // Add arguments if specified
            if (manifest.arguments) {
                manifest.arguments.forEach(arg => {
                    const argString = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
                    command.argument(argString, arg.description);
                });
            }

            // Handle the action
            command.action(async (...args) => {
                try {
                    // Check if dependencies are satisfied
                    if (manifest.dependencies) {
                        console.log('Required tools:', manifest.dependencies.join(', '));
                    }

                    // Import and execute the script
                    const scriptModule = await import(scriptPath);
                    await scriptModule.default(...args.slice(0, -1)); // Remove the last argument (Command object)
                } catch (error) {
                    console.error('Error executing script:', error);
                    process.exit(1);
                }
            });
        } catch (error) {
            console.error(`Error loading script from ${manifestFile}:`, error);
        }
    }

    program.parse();
}

loadScripts().catch(console.error); 