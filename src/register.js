import { registerApplicationCommands } from "./lib/command-registration.js";

async function registerCommands() {
  try {
    const data = await registerApplicationCommands();
    console.log("Commands registered successfully!");
    console.log(`Registered ${data.length} commands.`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

registerCommands();
