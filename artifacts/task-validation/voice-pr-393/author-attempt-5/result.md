# Author integration attempt 5

12 backend cases PASS; first27 browser checks PASS, including exact persisted pa=120/80 and all media ownership interruptions. Reload readback did not execute because the harness assumed simulator login survived document reload. Main intentionally stores that development identity in memory; actual screenshot shows the login picker. Add explicit same-role reauthentication before readback, without changing application authentication or claiming the absent readback PASS. No console/HTTP errors. Owned DB/container removed and verified.
