# ECS - an Entity Components Systems library

## Project Structure

- `Component` - Base class for all components. Can be initiated via `constructor` or `init` (for lazy loading/instance reuse). Each component class has a `bitmask` property on its prototype.
- `ComponentRegistry` - Singleton that registers Component class declarations and assigns unique bitmasks to their prototypes.
- `ComponentGroup` - Groups multiple components together for batch operations.
- `Entity` - Contains a map of Components and a bitmask signature of all attached Components. Notifies registered Queries when components are added/removed.
- `Query` - Filters Entities based on their Components using `all`, `any`, `none` filters.
- `System` - Abstract class where the `update` method must be overridden in child classes.
- `World` - Main class that runs the game loop and wraps common operations.
- `fixtures.ts` - Component class examples used in tests.
- `index.ts` - Exports all public classes from the npm module.

## Query Filter Semantics

Queries support three filter types that can be combined:

- `all` - Entity must have ALL listed components
- `any` - Entity must have AT LEAST ONE of the listed components
- `none` - Entity must NOT have ANY of the listed components

Filter evaluation order: `none` (most restrictive) -> `all` -> `any`

Queries are reactive - they automatically update when entities gain or lose components via the World notification system.

## Development

```bash
npm install        # Install dependencies
npm run build      # Build TypeScript to JavaScript
npm run test       # Run tests (vitest)
npm run lint       # Lint files (eslint)
```

Tests are located in `src/tests/` with a corresponding `.test.ts` file for each class.

## Coding Guidelines

- When suggesting changes, consider ECS design paradigms and offer alternatives.
- Ask for clarification when requirements are unclear.
- Avoid unnecessary comments in code.
