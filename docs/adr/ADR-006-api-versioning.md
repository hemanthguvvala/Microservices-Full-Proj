# ADR-006: API Versioning Strategy

**Status**: Accepted  
**Date**: 2024-01-15  
**Deciders**: Platform Engineering Team  

## Context

As the employee platform grows, we need to evolve APIs without breaking existing consumers.
Payroll-service, notification-service, and BFF all call employee-service. If we change a
request/response shape, we need a strategy to avoid coordinated deploys.

## Problem

Without versioning:
1. API change in employee-service → ALL consumers must redeploy simultaneously
2. "Big bang" deploys are risky
3. Cannot test new API shape with a subset of consumers first
4. Breaking changes cause outages for consumers not yet updated

## Decision: URI Path Versioning `/api/v{n}/`

**Chosen approach**: URI path versioning.

```
GET /api/v1/employees        ← current stable
GET /api/v2/employees        ← new version (different response shape)
```

### Implementation in Spring Boot

```java
// v1 controller (maintains backward compatibility forever)
@RestController
@RequestMapping("/api/v1/employees")
@Tag(name = "Employees V1", description = "Stable employee API")
public class EmployeeControllerV1 {
    @GetMapping("/{id}")
    public EmployeeResponseV1 getEmployee(@PathVariable Long id) {
        // Returns V1 shape — never changes
        return mapper.toV1(employeeService.findById(id));
    }
}

// v2 controller (new features, different shape)  
@RestController
@RequestMapping("/api/v2/employees")
@Tag(name = "Employees V2", description = "Enhanced employee API with nested objects")
public class EmployeeControllerV2 {
    @GetMapping("/{id}")
    public EmployeeResponseV2 getEmployee(@PathVariable Long id) {
        // V2 shape — nested address, enhanced payroll summary
        return mapper.toV2(employeeService.findById(id));
    }
}
```

### Response Shape Evolution

```json
// V1 — flat structure
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "street": "123 Main St",
  "city": "Austin",
  "salary": 95000
}

// V2 — nested structure (cleaner, but BREAKING if sent to V1 consumers)
{
  "id": 1,
  "name": { "first": "John", "last": "Doe" },
  "address": { "street": "123 Main St", "city": "Austin" },
  "compensation": { "base": 95000, "currency": "USD", "payFrequency": "MONTHLY" }
}
```

### API Gateway routing

```yaml
# API Gateway routes BOTH versions simultaneously
routes:
  - id: employee-v1
    uri: lb://employee-service
    predicates:
      - Path=/api/v1/employees/**
  - id: employee-v2
    uri: lb://employee-service
    predicates:
      - Path=/api/v2/employees/**
```

## Alternatives Considered

### Option A: Header Versioning (`Accept: application/vnd.company.v2+json`)
- **Pro**: Cleaner URLs, RESTfully "pure"
- **Con**: Hard to test in browser, harder for Kubernetes ingress routing, curl is verbose
- **Rejected**: Developer experience is poor; difficult to bookmark/cache

### Option B: Query Parameter (`GET /employees?version=2`)
- **Pro**: Easy to add to existing URLs
- **Con**: Not RESTful, caches may ignore the parameter, BFFs get confused
- **Rejected**: Version is part of the resource identity, not a query filter

### Option C: URI Path Versioning (CHOSEN)
- **Pro**: Explicit, cacheable, easy to route in API Gateway, curl-friendly
- **Con**: URL proliferation if many versions; "code duplication" between V1/V2 controllers
- **Accepted**: Industry standard (GitHub, Stripe, Twilio all use this)

## Consequences

### Positive
- Zero-downtime API evolution — run V1 and V2 simultaneously
- Each service team independently evolves their API
- API Gateway routing is trivial
- Easy to deprecate: add `Deprecation: date="2025-01-01"` header to V1

### Negative
- Two controllers per resource (V1 + V2) = more code
- Temptation to keep supporting old versions forever (set deprecation SLA: 12 months)

## Version Lifecycle Policy

| Phase       | Duration | Action |
|-------------|----------|--------|
| Current     | Active   | Full support, new features |
| Deprecated  | 6 months | Warning headers added, no new features |
| Sunset      | After 6m | Returns 410 Gone |

Add `Deprecation` and `Sunset` headers when deprecating:
```
Deprecation: date="Tue, 01 Jan 2026 00:00:00 GMT"
Sunset: Tue, 01 Jul 2026 00:00:00 GMT
Link: <https://docs.api/v2/migration>; rel="successor-version"
```
