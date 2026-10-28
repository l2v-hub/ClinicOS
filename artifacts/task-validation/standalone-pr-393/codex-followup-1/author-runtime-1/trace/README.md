This trace uses synthetic media, provider and clinical fixtures only. Demo session credentials were redacted before publication. The original is retained outside the public packet.

Reconstruct from this directory:

```bash
cat trace.zip.part-* > /tmp/pr393-author-trace.zip
sha256sum /tmp/pr393-author-trace.zip
unzip -t /tmp/pr393-author-trace.zip
```

The expected SHA-256 and every ZIP member hash are in trace-manifest.json. Open the reconstructed ZIP with Playwright trace viewer. Each published part is at most 16 MiB. This author browser run preceded the final backend cancellation guard; independent QA must run the final source.
