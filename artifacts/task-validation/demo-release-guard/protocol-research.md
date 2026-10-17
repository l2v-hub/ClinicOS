# Railway protocol research

Official source inspected: railwayapp/cli tag v5.66.0 (annotated tag5317148ad1f18147ddab4c47b2154e027654e1b5), downloaded publicly without credentials.

- src/controllers/upload.rs: archive explicitly excludes.git; upload sends serviceId and optional message, not commitHash. Therefore plain `railway up` is not used as exact-Git-revision proof for demo.
- src/gql/schema.json: Mutation.serviceInstanceDeployV2 accepts optional String commitSha and returns non-null String deployment ID. This is the supported exact-source deployment route. src/gql/mutations/strings/ServiceInstanceDeploy.graphql uses the same mutation without optional commitSha.
- schema.json ServiceSource has repo/image only, no branch. Query.deploymentTriggers supports projectId/environmentId/serviceId and returns DeploymentTrigger nodes with repository/branch and all target IDs. Exact-main trigger is independently verified. Missing/ambiguous source blocks; this change never edits source configuration.
- EnvironmentInstances.graphql and schema confirm ServiceInstance.activeDeployments, domains and source; Deployment has id/status/projectId/environmentId/serviceId/meta; MCP handler reads optional meta.commitHash. Missing commitHash remains a hard failure.
- ProjectToken.graphql confirms token project and environment scope can be checked without reading service variables, credentials or clinical content.

Implementation performs only fixed queries and exact-commit deploy mutation. Public readiness deployment UUID is compared with the exact successful active Railway deployment. No deployment has been attempted during implementation; real target source configuration remains an operational preflight gate.

Links:
https://github.com/railwayapp/cli/blob/v5.66.0/src/controllers/upload.rs
https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/schema.json
https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/queries/strings/ProjectToken.graphql
https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/queries/strings/EnvironmentInstances.graphql
https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/mutations/strings/ServiceInstanceDeploy.graphql
