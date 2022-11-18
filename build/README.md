# Build artifacts

These variant files are automatically generated from their corresponding entries JSON file over in the [src](/src) directory - so _no need to modify any of these by hand_.

Currently, two smaller JSON files are produced for every source entries file:
- a "runtime" variant with only the entry properties: `name`, `pattern`, and optional `category`
  - Useful if you need a minimal version to include/reference in your production codebase
- an "examples" variant with only the entry properties: `name` and `examples`
  - Useful if you want the examples separately


