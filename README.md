# @julienvanbeveren/kit

A customizable CLI toolkit that allows you to create and manage your own command-line tools.

## Installation

You can install the toolkit globally:

```bash
npm install -g @julienvanbeveren/kit
```

Or run it directly with npx:

```bash
npx @julienvanbeveren/kit <command>
```

## Usage

Once installed, you can run any available command using:

```bash
kit <command> [arguments]
```

For example:
```bash
kit hello
kit hello "John"
```

## Creating New Commands

To create a new command:

1. Create a new directory in the `scripts` folder with your command name
2. Add a `manifest.json` file with the command configuration:
```json
{
  "command": "your-command",
  "description": "Description of what your command does",
  "arguments": [
    {
      "name": "arg-name",
      "description": "Description of the argument",
      "required": true|false
    }
  ],
  "dependencies": [
    "list of required tools"
  ]
}
```
3. Create a `script.ts` file with your command implementation:
```typescript
export default function yourCommand(arg1: string, arg2: string) {
  // Your command logic here
}
```

## Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Build the project:
```bash
npm run build
```
4. For development with hot-reload:
```bash
npm run dev
```

## License

MIT
