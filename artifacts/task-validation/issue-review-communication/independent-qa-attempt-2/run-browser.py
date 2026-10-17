import os,pathlib,subprocess
q=pathlib.Path(__file__).resolve().parent
env={k:v for k,v in os.environ.items() if not any(x in k.upper() for x in ("TOKEN","SECRET","PASSWORD","API_KEY","DATABASE_URL","AUTH"))}
env.update(PATH=str(q/"deny-provider-bin")+":"+env["PATH"],GH_CONFIG_DIR=str(q/"empty-gh-config"),GIT_CONFIG_GLOBAL="/dev/null",PLAYWRIGHT_BROWSERS_PATH="/workspace/.cache/clinicos-batch447-playwright")
with(q/"browser.log").open("w")as f:p=subprocess.run(["flock","/tmp/clinicos-browser-qa.lock","node",str(q/"browser-qa.mjs")],env=env,stdout=f,stderr=subprocess.STDOUT)
(q/"browser-exit.txt").write_text(str(p.returncode)+"\n")
raise SystemExit(p.returncode)
