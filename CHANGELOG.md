# Changelog

All notable changes to Query Lab are documented here. Newest versions come first.

Each version uses the format `## [x.y.z] - YYYY-MM-DD`, followed by `### Added`, `### Changed` or `### Fixed` sections with `- ` bullet items. The `/changelog` page is rendered from this file.

## [1.3.0] - 2026-11-03

### Added

- A version badge in the header and a changelog page showing what changed in each release.

### Changed

- The shelf now rotates: each time a new daily challenge is published, the oldest challenge is retired, so the number of challenges in stock stays the same.
- A challenge is only retired once its replacement is fully ready with all ten questions, so a failed generation never shrinks the shelf.

## [1.2.1] - 2026-10-12

### Fixed

- The "What's in stock" list now scrolls, so long inventories stay usable.

## [1.2.0] - 2026-09-28

### Added

- An API to automate challenge creation.
- The Query Lab logo is now used as the favicon.

### Changed

- Challenge generation is scheduled in the background instead of blocking the request.

## [1.1.0] - 2026-09-27

### Added

- A "Completed" status next to questions you have already solved.
- A split layout that keeps the schema and your query side by side.

### Changed

- Schema creation dates are tracked in a central table, so the stock list can show when each schema was generated.

## [1.0.0] - 2026-09-26

### Added

- Initial release of Query Lab.
- AI-generated Postgres schemas with related tables and seeded sample data.
- Ten SQL questions per challenge that you can write and check.
- Schema creation endpoint protected by an auth secret.
