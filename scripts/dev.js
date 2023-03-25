import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.4.0/mod.js";
import { setCwd } from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";

setCwd();
Deno.chdir("..");

await generateTypes({
	outputDir: ".denoTypes",
	importMap: "importmap.json",
});
