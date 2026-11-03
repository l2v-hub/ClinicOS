# Source-bound technical analysis

Issue526 only. Trusted baseline d2a08b4850dd954bb790e35f2ed350d5eeacd1c4; tested source b4f460fc8f4fc361d99a1f1bae3de64a2b14a29a.
The former aggregate716800-byte limit rejects complete whole-source packets despite the existing qualified1M dynamic gate.
Transport ceiling is now finite934464=1000000-65536. Actual admission is stricter: UTF8(prompt)+UTF8(schema)+65536+observed output allowance must fit the qualified/clamped1000000 context BEFORE claim. With observed128000 output the combined prompt/schema ceiling is806464, not934464.
No source truncation, model/API switch, permission change, output reduction or round reset. Optional evidence selection remains bounded and explicit; every eventual demo packet must independently prove no required omission and exact dynamic fit.
Shared normal/recovery consumers retain their native SHA/auth/counter/ownership/publication gates. No recovery was executed.
