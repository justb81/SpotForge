// @spotforge/api-contract — öffentliche Einstiegspunkte.
//
// Geteilte Request-/Response-Schemata (zod) für die Backend-API. Backend
// validiert damit, api-client leitet daraus seine Typen ab. Siehe README.md.

export * from "./auth"; // OAuthProvider, LoginRequest, RefreshRequest, Account, TokenPair, AuthResponse (+ Schemas)
export * from "./photo"; // PHOTO_UPLOAD_CONSTRAINTS, PhotoConstraints, PhotoRejectionReason, … (Foto-Upload #89)
