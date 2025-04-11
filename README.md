# Hey there! Welcome to Project Analyzer

So I built this cool little tool to help me get up to speed faster when diving into new codebases. Thought you might find it useful too!

## What can it do?

- **Check out your project structure** - Just pick a directory or upload some files
- **Find stuff super quick** - Search for variables, functions, imports, whatever you need
- **Spot the important files** - Config files, entry points, and heavily-used stuff
- **Get the big picture** - See how many files you've got, average code size, and the chonky files
- **Track progress in real-time** - Watch as it scans through everything
- **Look good doing it** - Clean UI with Tailwind and those nice Lucide icons

## Using it is pretty straightforward

1. Hit the "Analyze Project" button
2. Pick a directory or upload some files 
3. Check out all the cool stats and insights
4. Use the search bar to find specific code bits
5. Open interesting files right in VS Code if you want a closer look

## How it's organized

Here's the simple breakdown:

```
src/
├── components/       # All the UI bits and pieces
├── workers/          # Background processing stuff
├── types/            # TypeScript definitions 
├── App.tsx           # The main app
├── main.tsx          # Where it all starts
├── index.css         # Makes it look pretty
```

## Tech I used

Just the good stuff:
- React for the UI
- TypeScript to keep things tidy
- Vite because it's super fast
- Tailwind CSS for styling without the headache
- Lucide React for those sweet icons

## Getting it running

1. Grab the code:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install the goodies:
   ```bash
   npm install
   ```

3. Fire it up:
   ```bash
   npm run dev
   ```

4. Head to `http://localhost:5173` and you're good to go!

## Handy commands

- `npm run dev` - Start it up for development
- `npm run build` - Package it for production
- `npm run preview` - Check out the production build
- `npm run lint` - Make sure your code isn't messy

## Questions?

**What browsers work with this?**
Modern ones! Chrome, Edge, Firefox should all be fine. Old browsers might struggle with the Directory Picker.

**How many files can it handle?**
About 1,000 before things get sluggish. Skip the `node_modules` and build folders if your project is huge.

**Can I customize what folders to ignore?**
For sure! Just tweak the `DEFAULT_EXCLUDE_PATTERNS` in `src/types/analyzer.ts`.

## License

It's MIT licensed - so do whatever you want with it! Enjoy!
