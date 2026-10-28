# Scope amendment 8 — current allergy context wrapper

Exactly one existing file `frontend/src/components/operator/sections/TherapyEditor.tsx` is added (89 total) to forward the current patient/allergy-context revision through the actual TherapyEditor wrapper. This avoids remounting the editor and discarding the draft when the allergy context changes. No additional clinical behaviour, permission, endpoint or implementation/review attempt. Original frozen documents, preceding amendments and dependency base remain unchanged. Same implementation2/4, review0/4.
