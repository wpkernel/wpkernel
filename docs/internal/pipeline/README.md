# Pipeline v2 programme

Architecture version: 1
Task contract version: 1
Target package version: 2.0.0

This directory is the internal engineering authority for Pipeline v2.
The package is version 2.0.0. P2-009 records publication and exact packed
qualification; [the package README](../../../packages/pipeline/README.md)
and [public guide](../../packages/pipeline.md) describe the v2 API.
Task front matter distinguishes completed release work from future work.

The programme starts from an explicit correction: Pipeline v1 validates and
topologically orders helper dependencies, then executes a serial transformation
chain inside a sequential stage programme. It is not yet a dataflow DAG.

- [`ROADMAP.md`](ROADMAP.md) shows programme dependencies and external release
  lanes. Task front matter owns lifecycle state.
- [`EXTERNAL-LANES.md`](EXTERNAL-LANES.md) records non-blocking Task Graph and
  llm-core evidence without pretending this repository owns their state.
- [`COORDINATION.md`](COORDINATION.md) defines safe parallel execution.
- [`decisions/`](decisions/) records accepted semantic boundaries.
- [`contracts/`](contracts/) contains versioned implementation contracts.
- [`tasks/`](tasks/) contains the executable work briefs.

Three boundaries are non-negotiable:

1. The compiled graph is the execution authority. Nodes do not schedule the
   remainder of the graph.
2. Dataflow values are immutable. Concurrency cannot derive meaning from
   settlement timing.
3. Pipeline remains a process-local evaluator. Durable admission, leases,
   retries, journals, process supervision and external-effect idempotency
   belong to its host.

V2 is a major version, not a silent reinterpretation of `dependsOn`,
`next(output?)`, extensions or pause snapshots. Historical 1.4.1 consumer pins
remain exact external dependency boundaries, not evidence that this source
checkout still exposes the 1.4 API. See [external lanes](EXTERNAL-LANES.md).
