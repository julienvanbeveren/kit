#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

function getShellConfigFile() {
    const shell = process.env.SHELL;
    const homeDir = os.homedir();

    if (!shell) {
        return null;
    }

    const shellName = path.basename(shell);
    switch (shellName) {
        case 'zsh':
            return path.join(homeDir, '.zshrc');
        case 'bash':
            // Check for different bash config files
            const bashFiles = ['.bashrc', '.bash_profile'];
            for (const file of bashFiles) {
                const fullPath = path.join(homeDir, file);
                if (fs.existsSync(fullPath)) {
                    return fullPath;
                }
            }
            return path.join(homeDir, '.bashrc');
        case 'fish':
            const fishConfigDir = path.join(homeDir, '.config', 'fish');
            fs.mkdirSync(fishConfigDir, { recursive: true });
            return path.join(fishConfigDir, 'config.fish');
        default:
            return null;
    }
}

function sourceConfig(configFile, shell) {
    try {
        const shellExec = process.env.SHELL;
        if (!shellExec) return;

        // Create a temporary script that sources the config and starts a new shell
        const tempScript = path.join(os.tmpdir(), 'kit-completion-source.sh');
        const sourceCmd = shell === 'fish' ? 'source' : '.';
        fs.writeFileSync(tempScript, `${sourceCmd} "${configFile}"\n`, { mode: 0o755 });

        // Execute the source command in the current shell
        execSync(`${shellExec} -i "${tempScript}"`, {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, SOURCING_KIT_COMPLETION: '1' }
        });

        // Clean up
        fs.unlinkSync(tempScript);
    } catch (error) {
        // Ignore errors during sourcing
    }
}

function setupCompletion() {
    try {
        const configFile = getShellConfigFile();
        if (!configFile) {
            console.log('Could not determine shell configuration file. Please set up completion manually:');
            console.log('Run: kit completion [shell] to get completion setup instructions');
            return;
        }

        const shell = path.basename(process.env.SHELL || '');
        const completionScript = execSync(`kit completion ${shell}`).toString();

        // Create completion directory if it doesn't exist
        const completionDir = path.join(os.homedir(), '.kit');
        fs.mkdirSync(completionDir, { recursive: true });

        // Save completion script to a file
        const completionFile = path.join(completionDir, `kit.${shell}.completion`);
        fs.writeFileSync(completionFile, completionScript);

        // Add source line to shell config if not already present
        let configContent = '';
        try {
            configContent = fs.readFileSync(configFile, 'utf8');
        } catch (error) {
            // File doesn't exist, we'll create it
        }

        let sourceLine;
        if (shell === 'fish') {
            sourceLine = `source ${completionFile}`;
        } else if (shell === 'zsh') {
            sourceLine = `
# Kit CLI completion
fpath=(${path.dirname(completionFile)} $fpath)
autoload -Uz compinit
compinit
source "${completionFile}"`;
        } else {
            sourceLine = `source "${completionFile}"`;
        }

        if (!configContent.includes(sourceLine)) {
            const newContent = configContent + '\n' + sourceLine + '\n';
            fs.writeFileSync(configFile, newContent);
            console.log(`✨ Shell completion has been set up for ${shell}!`);

            // Source the config file immediately
            if (!process.env.SOURCING_KIT_COMPLETION) {
                console.log('🔄 Applying completion settings...');
                sourceConfig(configFile, shell);
            }
        } else {
            console.log('✨ Shell completion was already set up!');
        }
    } catch (error) {
        console.error('⚠️  Could not automatically set up shell completion.');
        console.error('To set up completion manually, run: kit completion [shell]');
        console.error('Error details:', error.message);
    }
}

// Only run in a non-global install and when not already sourcing
if (!process.env.npm_config_global && !process.env.SOURCING_KIT_COMPLETION) {
    setupCompletion();
} 