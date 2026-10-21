# Attempt history and status

- Earlier integrated attempt5 reported partial failures; its assessment and seal are copied unchanged.
- Fresh attempt6 on `bb12eb738817bf1c64ed08844f162ea4ccf7e473` passes all seven issue scenarios.
- Fresh attempt8 passes all ten Issue486 route scenarios on the same source.
- The separate negative 503/recovery probe observed the actual 503 and unknown-state UI, but the recovery HTTP200 assertion did not complete. The unchanged classification attributes this to a first-match selector defect, not a product finding; recovery remains pending.
- Four curation failures (two source filename mistakes, one manifest lookup mistake, and one source-map lookup mistake) are retained as small receipts; corrected copies use exact filenames.
