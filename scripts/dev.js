import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.4.0/mod.js";
import { setCwd } from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";

setCwd();
Deno.chdir("..");

await generateTypes({
	excludeUrls: [
		"https://raw.githubusercontent.com/rendajs/Renda/3570dc24d41ef1522a97371ebdc2e7b88d15317d/studio/src/styles/studioStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/3570dc24d41ef1522a97371ebdc2e7b88d15317d/studio/src/styles/shadowStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/3570dc24d41ef1522a97371ebdc2e7b88d15317d/studio/src/tasks/workers/bundleScripts/bundle.js",
		"https://raw.githubusercontent.com/rendajs/studio-discovery-server/423fa5d224dae56571a61bfd8d850b76fcdcc6fa/src/WebSocketConnection.js",
	]
});
