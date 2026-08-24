// Vinext's Node production server emits ESM, while Prisma's generated
// runtime still reads the CommonJS __dirname global during initialization.
// Define the equivalent project root before Vinext imports the server bundle.
globalThis.__dirname ??= process.cwd();
