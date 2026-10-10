# Initial harness navigation failure retained

browser01 preserves all original raw artifacts and original recipes. Eleven desktop assertion groups passed; mobile setup attempted to click the native sidebar Agenda item while the sidebar was collapsed outside the viewport. Timeout raw failure.json and desktop traces/screenshots/video retained. The setup failed before returning its context to the caller, so no mobile failure trace/screenshot exists in that first attempt; the raw browser-generated mobile video is retained, and this limitation is not represented as passing application evidence.

Only setup navigation was corrected: at width below600 click the actual native Apri menu button first. No force click, DOM patch, application edit, weakened assertion or fixture color injection. browser02 will repeat every original assertion and preserve new raw outputs independently.
