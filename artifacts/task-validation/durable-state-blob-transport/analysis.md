# Actual controller state read failure

Claude comment6254737581 on PR483 identified a real1.34MiB Contentsencoding:none response. Existing main attempts to parse emptyinlinecontent. New bounded GitBlob fallback uses exactContentsSHA and validates base64,declaredsize,GitblobheaderSHA,UTF8 andobject shape. No state reset or discardedhistory.
