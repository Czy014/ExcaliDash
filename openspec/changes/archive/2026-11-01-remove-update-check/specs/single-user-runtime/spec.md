## ADDED Requirements

### Requirement: The single-user runtime SHALL not perform release update checks

The frontend and backend MUST NOT call an external release service, expose a
release update endpoint, or render update-check controls or banners. The
runtime SHALL retain local application version and build-label metadata for
identification.

#### Scenario: Open Settings without outbound release checks

- **WHEN** a user opens Settings
- **THEN** the Version row remains visible and no update endpoint or external
  release service is requested

#### Scenario: Probe the retired update endpoint

- **WHEN** a client requests `/system/update`
- **THEN** the backend returns its normal not-found response
