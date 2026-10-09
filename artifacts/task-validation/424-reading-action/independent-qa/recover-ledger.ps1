$ErrorActionPreference='Stop'
$qaCheckout='C:/w-424-qa'
$qaDestination='C:/w-424-qa/artifacts/task-validation/424-reading-action/independent-qa/security02/coordination-side-effects'
$qaInitial=(Get-Content -Raw 'artifacts/task-validation/424-reading-action/independent-qa/recipes-frozen.json'|ConvertFrom-Json).initialStatus
$qaRecords=@()
foreach($qaName in @('.proven-config-version','proven-config.json')){
 $qaSource=[IO.Path]::GetFullPath($qaCheckout+'/.claude/'+$qaName)
 $qaTarget=[IO.Path]::GetFullPath($qaDestination+'/'+$qaName)
 $qaPrefix=[IO.Path]::GetFullPath($qaCheckout)+[IO.Path]::DirectorySeparatorChar
 if(-not $qaSource.StartsWith($qaPrefix,[StringComparison]::OrdinalIgnoreCase) -or -not $qaTarget.StartsWith($qaPrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Path outside exact checkout'}
 if(-not(Test-Path -LiteralPath $qaSource -PathType Leaf) -or (Test-Path -LiteralPath $qaTarget)){throw 'Expected new generated source/nonexisting target'}
 $qaRelative='.claude/'+$qaName
 if(@(git ls-files -- $qaRelative).Count -ne 0 -or $qaInitial.Contains($qaRelative)){throw 'Target not proven new untracked ledger artifact'}
 $qaBefore=(Get-FileHash -LiteralPath $qaSource -Algorithm SHA256).Hash.ToLower()
 if(-not(Test-Path -LiteralPath $qaDestination)){New-Item -ItemType Directory -Path $qaDestination|Out-Null}
 Move-Item -LiteralPath $qaSource -Destination $qaTarget
 $qaAfter=(Get-FileHash -LiteralPath $qaTarget -Algorithm SHA256).Hash.ToLower()
 if($qaBefore -ne $qaAfter){throw 'Recoverable move byte drift'}
 $qaRecords+=@{source=$qaSource;target=$qaTarget;beforeSha256=$qaBefore;afterSha256=$qaAfter;sourceAbsent=(-not(Test-Path -LiteralPath $qaSource))}
}
@{policy='Root explicitly authorized exact recoverable move of two newly generated untracked Ruflo ledger side effects. No delete, no recursive or broad directory move, no application changes. Native scanner completion did not grant authority.';records=$qaRecords}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath 'artifacts/task-validation/424-reading-action/independent-qa/ledger-recovery-receipt.json' -Encoding utf8
