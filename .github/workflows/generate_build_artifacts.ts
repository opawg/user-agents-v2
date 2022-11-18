// deno-lint-ignore-file no-explicit-any
import { join, fromFileUrl } from 'https://deno.land/std@0.165.0/path/mod.ts';

const src = join(fromFileUrl(import.meta.url), `../../../src`);
const build = join(fromFileUrl(import.meta.url), `../../../build`);

let changed = 0;
for (const type of [ 'apps', 'bots', 'browsers', 'devices', 'libraries', 'referrers' ]) {
    const obj = JSON.parse(await Deno.readTextFile(join(src, `${type}.json`)));

    // compute a version with only the core attributes needed in production
    const runtimeContents = JSON.stringify(computeRuntimeContents(obj), undefined, 2);
    if (await writeTextFileIfChanged(join(build, `${type}.runtime.json`), runtimeContents)) {
        changed++;
    }

    // compute a version with only the examples
    const examplesContents = JSON.stringify(computeExamplesContents(obj), undefined, 2);
    if (await writeTextFileIfChanged(join(build, `${type}.examples.json`), examplesContents)) {
        changed++;
    }
}
console.log(`Changed ${changed} file(s)`);

function computeRuntimeContents(obj: any) {
    const entries = obj.entries.map((v: unknown) => {
        const { name, pattern, category } = v as Record<string, unknown>;
        return { name, pattern, category };
    });
    return { entries };
}

function computeExamplesContents(obj: any) {
    const entries = obj.entries.flatMap((v: unknown) => {
        const { name, examples } = v as Record<string, unknown>;
        return examples ? [ { name, examples } ] : [];
    });
    return { entries };
}

async function writeTextFileIfChanged(path: string, contents: string): Promise<boolean> {
    const oldContents = await tryReadTextFile(path);
    if (oldContents === contents) return false;
    console.log(`Updating ${path}`);
    await Deno.writeTextFile(path, contents);
    return true;
}

async function tryReadTextFile(path: string): Promise<string | undefined> {
    try {
        return await Deno.readTextFile(path);
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) return undefined;
        throw e;
    }
}
