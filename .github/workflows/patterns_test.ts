import { fail } from 'https://deno.land/std@0.165.0/testing/asserts.ts';
import { join, fromFileUrl } from 'https://deno.land/std@0.165.0/path/mod.ts';

type Type = 'apps' | 'bots' | 'browsers' | 'devices' |'libraries' | 'referrers';

type Entry = { name: string, pattern: string, examples?: string[] };

Deno.test({
    name: 'patterns',
    fn: async () => {
        const entriesByType = new Map<Type, Entry[]>();

        // first, read and perform basic parsing/validation on each entries file
        for (const type of [ 'apps', 'bots', 'browsers', 'devices', 'libraries', 'referrers' ] as Type[]) {
            const filepath = join(fromFileUrl(import.meta.url), `../../../src/${type}.json`);
            const txt = await Deno.readTextFile(filepath);
            const obj = JSON.parse(txt);
            if (!Array.isArray(obj.entries)) fail(`Bad top-level object: missing 'entries' array.`);
            const names = new Set<string>();
            const entries: Entry[] = [];
            let i = 0;
            for (const entry of obj.entries) {
                const tag = `${type}.entry[${i}]`;
                if (typeof entry !== 'object' || entry === null) fail(`Bad ${tag}: expected an object, found ${JSON.stringify(entry)}`);

                const { name, pattern, description, examples, svg, comments, category, urls } = entry as Record<string, unknown>;

                // name
                if (typeof name !== 'string') fail(`Bad ${tag}.name: expected a string property, found ${JSON.stringify(entry)}`);
                if (name.trim() !== name) fail(`Bad ${tag}.name: expected no leading or trailing whitespace, found ${name}`);
                if (name === '') fail(`Bad ${tag}.name: expected a non-blank string`);
                if (names.has(name.toLowerCase())) fail(`Bad ${tag}.name: expected a unique value, found ${name}`);
                names.add(name.toLowerCase());

                // pattern
                if (typeof pattern !== 'string') fail(`Bad ${tag}.pattern: expected a string property, found ${JSON.stringify(entry)}`);
                if (/^\s+$/.test(pattern)) fail(`Bad ${tag}.pattern: expected a non-blank string`);
                if (pattern.includes('(?:')) fail(`Bad ${tag}.pattern: non-capturing groups are not supported in all environments`);
                if (pattern.includes('(?=') || pattern.includes('(?!')) fail(`Bad ${tag}.pattern: lookaheads are not supported in all environments`);
                if (pattern.includes('(?<=') || pattern.includes('(?<!')) fail(`Bad ${tag}.pattern: lookbehinds are not supported in all environments`);
                if (pattern.includes('\\A')) fail(`Bad ${tag}.pattern: \\A (beginning of string) is not supported in all environments, use ^`);
                if (pattern.includes('\\Z')) fail(`Bad ${tag}.pattern: \\Z (end of string or before trailing newline) is not supported in all environments, use $`);
                if (pattern.includes('\\z')) fail(`Bad ${tag}.pattern: \\z (end of string) is not supported in all environments, use $`);
                const regex = new RegExp(pattern);

                // description
                if (description !== undefined && typeof description !== 'string') fail(`Bad ${tag}.description: expected an optional string property, found ${JSON.stringify(entry)}`);
                if (typeof description === 'string') {
                    if (description.trim() !== description) fail(`Bad ${tag}.description: expected no leading or trailing whitespace, found ${description}`);
                    if (description === '') fail(`Bad ${tag}.description: expected a non-blank string`);
                }

                // svg
                if (svg !== undefined && typeof svg !== 'string') fail(`Bad ${tag}.svg: expected an optional string property, found ${JSON.stringify(entry)}`);
                if (typeof svg === 'string') {
                    if (!/^[a-z]+(-[a-z]+)*\.svg$/.test(svg)) fail(`Bad ${tag}.svg: unexpected value ${JSON.stringify(svg)}`);
                    await Deno.stat(join(fromFileUrl(import.meta.url), `../../../svg/${svg}`));
                }

                // comments
                if (comments !== undefined && typeof comments !== 'string') fail(`Bad ${tag}.comments: expected an optional string property, found ${JSON.stringify(entry)}`);
                if (typeof comments === 'string') {
                    if (comments.trim() !== comments) fail(`Bad ${tag}.comments: expected no leading or trailing whitespace, found ${comments}`);
                    if (comments === '') fail(`Bad ${tag}.comments: expected a non-blank string`);
                }

                // examples
                if (examples !== undefined) {
                    if (!Array.isArray(examples)) fail(`Bad ${tag}.examples: expected an array, found ${JSON.stringify(examples)}`);
                    examples.forEach((example: unknown, j: number) => {
                        if (typeof example !== 'string') fail(`Bad ${tag}.examples[${j}]: expected a string, found ${JSON.stringify(example)}`);
                        if (!regex.test(example)) fail(`Bad ${tag}.examples[${j}]: "${example}" does not match pattern "${pattern}"`);
                    });
                }

                // urls
                if (urls !== undefined) {
                    if (!Array.isArray(urls)) fail(`Bad ${tag}.urls: expected an array, found ${JSON.stringify(urls)}`);
                    urls.forEach((url: unknown, j: number) => {
                        if (typeof url !== 'string') fail(`Bad ${tag}.urls[${j}]: expected a string, found ${JSON.stringify(url)}`);
                        if (!isValidUrl(url)) fail(`Bad ${tag}.urls[${j}]: expected url, found "${url}"`);
                    });
                }

                // category
                if (category !== undefined && typeof category !== 'string') fail(`Bad ${tag}.category: expected an optional string property, found ${JSON.stringify(entry)}`);
                if (typeof category === 'string') {
                    if (!/^[a-z]+(_[a-z]+)*$/.test(category)) fail(`Bad ${tag}.category: unexpected value ${JSON.stringify(category)}`);
                }

                entries.push({ name, pattern, examples });

                i++;
            }
            entriesByType.set(type, entries);
        }

        // now that we know all files are valid, check deterministic match for each example
        for (const [ type, entries ] of entriesByType) {
            if (type === 'devices' || type === 'referrers') continue;
            let i = 0;
            for (const { name, examples } of entries) {
                const tag = `${type}.entry[${i}]`;
                let j = 0;
                for (const example of examples ?? []) {
                    const match = computeDeterministicMatch(example, entriesByType);
                    if (!match || match.name !== name || match.type !== type) {
                        fail(`Bad ${tag}.examples[${j}]: ${name} "${example}" does not match itself, deterministic match ${JSON.stringify(match)}`);
                    }
                    j++;
                }
                i++;
            }
        }
    }
});

function isValidUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false;
    }
}

function computeDeterministicMatch(userAgent: string, entriesByType: Map<Type, Entry[]>): { type: Type, name: string } | undefined {
    for (const type of [ 'bots', 'apps', 'libraries', 'browsers' ] as Type[]) {
        for (const { name, pattern } of entriesByType.get(type) ?? []) {
            if (new RegExp(pattern).test(userAgent)) {
                return { type, name }; 
            }
        }
    }
}
