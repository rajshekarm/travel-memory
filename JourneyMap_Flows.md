# Journey Map Flow Diagrams

## 1. Domain Composition

```mermaid
graph TD
    U[UserJourneyMemory]

    U --> P[Places]
    U --> T[Trips]
    U --> V[PlaceVisits]
    U --> A[Analytics]

    P --> PS[PlaceStats]
    T --> TS[TripStats]
    T --> RS[RouteSegmentAnalytics]
    V --> PS
```

---

## 2. Graph Model

```mermaid
graph LR
    P1[Place Node: Home]
    P2[Place Node: Restaurant]
    P3[Place Node: Office]
    P4[Place Node: Gym]

    P1 -- Trip Edge --> P2
    P2 -- Trip Edge --> P3
    P1 -- Trip Edge --> P4
```

---

## 3. Data Flow

```mermaid
flowchart TD
    A[Raw Source Data] --> B[Trips]
    A --> C[Places]
    A --> D[PlaceVisits]

    B --> E[Graph Builder]
    C --> E
    D --> F[Analytics Engine]

    E --> G[JourneyGraph]
    F --> H[Derived Analytics]

    G --> I[Map Rendering Layer]
    H --> I

    I --> J[Trip Routes]
    I --> K[Place Points]
    I --> L[Heatmap / Hotspots]
    I --> M[Interaction Cards]
```

---

## 4. Sequence: Trip Render Lifecycle

```mermaid
sequenceDiagram
    participant API as API / Backend
    participant UI as JourneyMap
    participant Graph as Graph Builder
    participant Map as MapLibre Map

    API->>UI: Send trips, places, place visits
    UI->>Graph: Build nodes and edges
    Graph-->>UI: Return JourneyGraph
    UI->>Map: Load sources
    UI->>Map: Render trip routes as line layers
    UI->>Map: Render places as point layers
    UI->>Map: Render hotspots as heatmap
    Map-->>UI: Ready for interaction
```

---

## 5. Sequence: User Clicks a Place

```mermaid
sequenceDiagram
    participant User
    participant Map as MapLibre Map
    participant UI as JourneyMap State
    participant Graph as Graph Query Layer
    participant Card as Place Insight Card

    User->>Map: Click place point
    Map->>UI: onSelectPlace(placeId)
    UI->>Graph: Fetch related trips for placeId
    Graph-->>UI: Return connected trips
    UI->>Card: Populate place details
    Card-->>User: Show category, visits, last visit, related trips
```

---

## 6. Sequence: User Changes Time Filter

```mermaid
sequenceDiagram
    participant User
    participant UI as JourneyMap State
    participant Filter as Time / Category Filter
    participant Graph as Graph Builder
    participant Map as MapLibre Map

    User->>UI: Select "week" or "month"
    UI->>Filter: Update filter state
    Filter->>Graph: Recompute visible nodes and edges
    Graph-->>UI: Filtered graph data
    UI->>Map: Update GeoJSON sources
    Map-->>User: Re-render map layers
```

---

## 7. Rendering Architecture

```mermaid
flowchart LR
    A[JourneyGraph] --> B[Trip Route Source]
    A --> C[Place Point Source]
    A --> D[Hotspot Source]

    B --> E[Line Layer]
    B --> F[Selected Trip Highlight]

    C --> G[Circle Layer]
    C --> H[Symbol / Label Layer]

    D --> I[Heatmap Layer]

    E --> J[Interactive Map]
    F --> J
    G --> J
    H --> J
    I --> J
```

---

## 8. Analytics Pipeline

```mermaid
flowchart TD
    A[PlaceVisits] --> B[Aggregate by Place]
    A --> C[Aggregate by Time Window]
    A --> D[Aggregate by Route Pattern]

    B --> E[Visit Count]
    B --> F[Last Visited]
    B --> G[Related Trips]

    C --> H[Today]
    C --> I[Week]
    C --> J[Month]
    C --> K[All Time]

    D --> L[Frequent Routes]
    D --> M[Hotspots]
    D --> N[Routines]
```
