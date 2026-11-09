' ListenFlow Windows Silent Background Launcher
' Starts the Vite dev server silently if not already running, then opens the web browser.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get project directory from script location
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)

' Change directory to project root
WshShell.CurrentDirectory = projectDir

' Start npm run dev silently (0 = hide window, False = don't wait)
WshShell.Run "cmd /c npm run dev", 0, False

' Wait 2.5 seconds for dev server to initialize
WScript.Sleep 2500

' Open default browser directly to ListenFlow
WshShell.Run "http://localhost:5173", 1, False

