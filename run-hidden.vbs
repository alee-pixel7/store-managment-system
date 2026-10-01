' ============================================================
' run-hidden.vbs — Run a PowerShell script with no console window
'
' Usage (from another .vbs / shortcut):
'   wscript run-hidden.vbs "C:\path\to\auto-start.ps1"
'
' Used so auto-start.ps1 / open-app.ps1 never flash a
' PowerShell window on login or desktop-icon click.
' ============================================================

Dim shell, psScript, args
Set shell = CreateObject("WScript.Shell")

If WScript.Arguments.Count = 0 Then
    WScript.Echo "Usage: wscript run-hidden.vbs <script.ps1> [args...]"
    WScript.Quit 1
End If

psScript = WScript.Arguments(0)

args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScript & """"

' Append any extra arguments passed through
Dim i
For i = 1 To WScript.Arguments.Count - 1
    args = args & " """ & WScript.Arguments(i) & """"
Next

shell.Run "powershell.exe " & args, 0, False
