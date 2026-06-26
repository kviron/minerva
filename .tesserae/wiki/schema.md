# Schema

This file is auto-generated from the controlled ontology in `tesserae/research_graph.py`. Editing it by hand has no effect — your changes will be overwritten on the next compile. Edit the enum or the `ALLOWED_EDGE_TYPES` set instead.

## Layers

### Field / taxonomy layer

Where a paper or concept *sits* in the research landscape.

- **`ResearchField`** — A broad area of research, e.g. *3D Reconstruction*.
- **`ResearchTopic`** — A topic within a field; finer-grained than a field.
- **`ProblemArea`** — A problem the field is trying to solve.
- **`ApproachFamily`** — A family of methods that share an approach (e.g. *Gaussian Splatting*).
- **`Trend`** — A trend extracted across multiple papers/dates.

### Source / artifact layer

Concrete things in the world — papers, code, models, datasets.

- **`SourceDocument`** — A markdown source — digest, raw note, doc.
- **`Paper`** — A paper, identified by arXiv id when available.
- **`Repository`** — A code repository (usually GitHub).
- **`Project`** — Legacy alias for ``Repository``; kept for compatibility.
- **`Model`** — A trained model (e.g. *Stable Diffusion*).
- **`Dataset`** — A dataset used for training or evaluation.
- **`Benchmark`** — A benchmark used for evaluation (e.g. *DTU*).
- **`Metric`** — An evaluation metric (e.g. *PSNR*).
- **`Result`** — A specific numeric result on a benchmark/metric.
- **`Organization`** — An organization (lab, company, university).
- **`Person`** — An author or contributor.

### Concept layer

Reusable building blocks — definitions, algorithms, patterns.

- **`Concept`** — A general research concept.
- **`TechnicalTerm`** — A technical term, often a vocabulary item.
- **`MathematicalConcept`** — A mathematical idea or construction.
- **`MethodologicalConcept`** — A methodological idea (e.g. *Volumetric Rendering*).
- **`Algorithm`** — A specific algorithm or named method.
- **`ObjectiveFunction`** — An objective / loss function.
- **`ArchitecturePattern`** — A model architecture pattern.
- **`TrainingParadigm`** — A training paradigm (e.g. *Self-Supervised*).
- **`InferenceStrategy`** — An inference-time strategy.
- **`EvaluationProtocol`** — An evaluation protocol.
- **`Task`** — A research task (e.g. *Novel View Synthesis*).
- **`Capability`** — A model capability claim.

### Assertion layer (private — rendered inline only)

Claims and the evidence that grounds them. No dedicated URLs.

- **`Claim`** — A generic claim attached to a paper.
- **`ContributionClaim`** — An author-stated contribution.
- **`PerformanceClaim`** — A numeric performance claim.
- **`ComparisonClaim`** — A claim that one method beats another.
- **`LimitationClaim`** — An author-stated limitation.
- **`CausalClaim`** — A causal mechanism claim.
- **`OpenQuestion`** — An explicitly noted open question.
- **`EvidenceSpan`** — A literal evidence span grounding a claim.

### Synthesis layer (generated)

Higher-order pages produced by ``SynthesisProjector``.

- **`Synthesis`** — A higher-order synthesis page (pulse, daily, weekly, topic, comparison, field overview).

### Code-graph layer (private — separate artifact)

Lives in ``code-graph.json``, not in the public website.

- **`CodeClass`** — Code-graph: a class definition.
- **`CodeComponent`** — 
- **`CodeConstant`** — 
- **`CodeEnum`** — 
- **`CodeEnumMember`** — 
- **`CodeField`** — 
- **`CodeFile`** — 
- **`CodeFunction`** — Code-graph: a function/method definition.
- **`CodeInterface`** — 
- **`CodeMethod`** — 
- **`CodeModule`** — Code-graph: a logical module / package.
- **`CodeNamespace`** — 
- **`CodeParameter`** — 
- **`CodeProject`** — Code-graph: the local workspace project.
- **`CodeRoute`** — 
- **`CodeStruct`** — 
- **`CodeSymbol`** — 
- **`CodeTrait`** — 
- **`CodeTypeAlias`** — 
- **`CodeVariable`** — 
- **`Dependency`** — Code-graph: an external dependency.
- **`SourceFile`** — Code-graph: a single source file.

## Edge types

The set of edge types is closed. New extraction logic must reuse one of these or extend the set in `research_graph.py`.

- `achieves_score`
- `addresses`
- `attributes_improvement_to`
- `authored_by`
- `belongs_to_approach_family`
- `calls`
- `compares_against`
- `contains`
- `contradicts_claim`
- `criticizes`
- `declared_in`
- `declining_in`
- `decorates`
- `defines`
- `derived_from`
- `derived_from_session`
- `discussed_in`
- `discusses`
- `documents`
- `emerged_after`
- `evaluated_on`
- `evidenced_by`
- `exports`
- `extends`
- `has_limitation`
- `implemented_in`
- `implements`
- `imports`
- `improves_on`
- `inherits_from`
- `instantiates`
- `introduces`
- `is_a`
- `mentioned_in`
- `optimizes_for`
- `overrides`
- `part_of`
- `precedes`
- `references`
- `released_by`
- `reports_result`
- `resolved_by`
- `returns`
- `rising_in`
- `shares_concept_with`
- `subfield_of`
- `summarizes`
- `supersedes`
- `supports_claim`
- `synthesizes`
- `type_of`
- `user_link`
- `uses`
- `uses_dataset`
- `uses_metric`

## Public / private split

* **Public** — surfaces on the website at `.tesserae/site/`. Each public node type maps to one of the routes `sources` / `concepts` / `entities` / `papers` / `repos` / `topics` / `syntheses` / `questions`.
* **Assertion-layer** types are stored in the graph but rendered inline on detail pages (no dedicated URL).
* **Code-graph** types live in a separate artifact (`.tesserae/code-graph.json`).
