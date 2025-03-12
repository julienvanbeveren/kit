import { execSync } from 'child_process';

export default async function upgrade() {
    try {
        console.log('Upgrading Kit to the latest version...');
        execSync('npm i -g @julienvanbeveren/kit@latest', { stdio: 'inherit' });
        console.log('Successfully upgraded Kit!');
    } catch (error) {
        console.error('Failed to upgrade Kit:', (error as Error).message);
        process.exit(1);
    }
}