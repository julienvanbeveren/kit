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

    // Find all manifest.json files in the scripts directory
    const manifestFiles = await glob('scripts/*/manifest.json', { absolute: true });

    for (const manifestFile of manifestFiles) {
        const manifest: ScriptManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
        const scriptPath = path.join(path.dirname(manifestFile), 'script.ts');

        if (!fs.existsSync(scriptPath)) {
            console.warn(`Warning: Script file not found for ${manifest.command}`);
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
                const { default: scriptFunction } = await import(scriptPath);
                await scriptFunction(...args.slice(0, -1)); // Remove the last argument (Command object)
            } catch (error) {
                console.error('Error executing script:', error);
                process.exit(1);
            }
        });
    }

    program.parse();
}

loadScripts().catch(console.error); 