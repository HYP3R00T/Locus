# {PACKAGE_NAME}

Authoring template: copy to a concrete guide, replace placeholders, and remove
inapplicable sections. Register the guide and source scope in docs/index.md.

## Scope and responsibility

Source paths governed by this guide: {PATHS}.

{What the package provides, who consumes it, and what it does not own.}

Follow the [shared working rules](../getting-started.md#working-rules) alongside the local instructions below.

## Internal architecture

| Area or entry point | Responsibility   |
| ------------------- | ---------------- |
| {PATH_OR_SYMBOL}    | {RESPONSIBILITY} |

Dependency direction: {ALLOWED_DIRECTION_AND_BOUNDARIES}.

{Explain mechanisms that are important but costly to infer. Link source for detail.}

## Mandatory local instructions

- {Configured language/runtime/tooling requirements.}
- {Local coding or extension convention that materially affects work.}
- {Invariant that must remain true.}

## Tooling and configuration

| Concern   | Tool or mechanism | Actual configuration |
| --------- | ----------------- | -------------------- |
| {CONCERN} | {SELECTED_TOOL}   | {PATH}               |

Do not repeat exact versions or large configuration blocks maintained elsewhere.

## Contracts and compatibility

{Public inputs, outputs, imports, exports, commands, protocols, file formats, or
extension points. Link their authoritative definitions and behavior tests.}

Consumers: {PACKAGES_OR_EXTERNAL_USERS}.

Compatibility requirements: {ACTUAL_REQUIREMENTS}.

## State, resources, and failure behavior

{Ownership, lifecycle, errors, cleanup, retries, or concurrency constraints that
apply. Remove this section if it adds no useful information.}

## Development and verification

Working directory: {PATH}.

| Action                       | Exact command          | Scope or limitation |
| ---------------------------- | ---------------------- | ------------------- |
| Start or exercise package    | {COMMAND_OR_PROCEDURE} | {SCOPE}             |
| Quality checks               | {COMMAND}              | {SCOPE}             |
| Behavior tests               | {COMMAND}              | {SCOPE}             |
| Intentional fixes            | {COMMAND_OR_NONE}      | {WHAT_IT_MODIFIES}  |
| Build/package, if applicable | {COMMAND_OR_NONE}      | {SCOPE}             |

Cross-package verification: {CONSUMER_CHECKS_OR_CONTRACT_TESTS}.

## Documentation impact

- Update this guide when local architecture, instructions, or contracts change.
- Update system architecture when cross-package ownership or relationships change.
- Update user-facing documentation when observable usage changes.
- Add or revise an ADR when a significant accepted tradeoff changes.

## Relevant decisions

{Links to applicable records, if any.}
