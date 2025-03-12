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

    // Enable auto-completion
    program.enablePositionalOptions();
    program.showHelpAfterError();
    program.showSuggestionAfterError();

    // Add completion command
    program
        .command('completion')
        .description('Generate shell completion script')
        .argument('[shell]', 'Shell type: zsh, bash, or fish')
        .action((shell) => {
            const supportedShells = ['zsh', 'bash', 'fish'];
            shell = shell || process.env.SHELL?.split('/').pop() || 'bash';

            if (!supportedShells.includes(shell)) {
                console.error(`Unsupported shell: ${shell}. Supported shells are: ${supportedShells.join(', ')}`);
                process.exit(1);
            }

            let script = '';
            if (shell === 'zsh') {
                script = `
#compdef kit

_kit_completion() {
    local -a completions
    local -a completions_with_descriptions
    local -a response
    
    (( ! \$+commands[kit] )) && return 1

    response=("\${(f)\$(env COMP_WORDS="\${words[*]}" COMP_CWORD=\$((CURRENT-1)) _KIT_COMPLETE=zsh_complete kit)}")

    for type key descr in \${response}; do
        if [[ "\$type" == "dir" ]]; then
            _path_files -/
        elif [[ "\$type" == "file" ]]; then
            _path_files -f
        else
            if [[ -n "\$descr" ]]; then
                completions_with_descriptions+=("\${key}:\${descr}")
            else
                completions+=("\${key}")
            fi
        fi
    done

    if [ -n "\$completions_with_descriptions" ]; then
        _describe -V unsorted completions_with_descriptions -U
    fi

    if [ -n "\$completions" ]; then
        compadd -U -V unsorted -a completions
    fi
}

compdef _kit_completion kit`;
            } else if (shell === 'bash') {
                script = `
_kit_completion() {
    local cur prev words cword
    _get_comp_words_by_ref -n : cur prev words cword

    response=\$(env COMP_WORDS="\${words[*]}" COMP_CWORD=\$cword _KIT_COMPLETE=bash_complete kit)
    
    COMPREPLY=()
    while IFS=\$'\\n' read -r line; do
        COMPREPLY+=("\$line")
    done <<< "\$response"

    return 0
}

complete -F _kit_completion kit`;
            } else if (shell === 'fish') {
                script = `
function __kit_complete
    set -l response (env _KIT_COMPLETE=fish_complete COMP_WORDS=(commandline -cp) COMP_CWORD=(commandline -t) kit)
    
    for completion in \$response
        echo \$completion
    end
end

complete -c kit -a "(__kit_complete)"`;
            }

            console.log(script);
            console.log(`
# To enable ${shell} completion, add this to your ~/.${shell}rc:
# For ${shell === 'zsh' ? 'zsh' : shell === 'bash' ? 'bash' : 'fish'}:
# source < (kit completion ${shell})
`);
        });

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
                console.warn(`Warning: Script file not found for ${manifest.command} at ${scriptPath} `);
                continue;
            }

            const command = program.command(manifest.command);
            command.description(manifest.description);

            // Add arguments if specified
            if (manifest.arguments) {
                manifest.arguments.forEach(arg => {
                    const argString = arg.required ? `< ${arg.name}> ` : `[${arg.name}]`;
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
            console.error(`Error loading script from ${manifestFile}: `, error);
        }
    }

    // Handle completion environment variable
    const comp = process.env._KIT_COMPLETE || '';
    if (comp) {
        program.configureOutput({
            writeOut: (str) => process.stdout.write(str),
            writeErr: (str) => process.stdout.write(str),
        });

        const completionWords = process.env.COMP_WORDS?.split(' ') || [];
        const completionCword = parseInt(process.env.COMP_CWORD || '0');

        program.parse(completionWords, { from: 'user' });
        return;
    }

    program.parse();
}

loadScripts().catch(console.error); 