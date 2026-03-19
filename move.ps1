$ErrorActionPreference = "Stop"
Write-Host "Moving files from wholescaleos-main to root..."
Get-ChildItem -Path ".\wholescaleos-main" -Force | Move-Item -Destination ".\" -Force
Write-Host "Removing empty wholescaleos-main directory..."
Remove-Item -Path ".\wholescaleos-main" -Recurse -Force
Write-Host "Git add, commit, and push..."
git add .
git commit -m "chore: move project files to repository root for Cloudflare build"
git push
Write-Host "Done!"
Remove-Item -Path ".\move.ps1" -Force
