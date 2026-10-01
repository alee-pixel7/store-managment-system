' ============================================================
' show-starting.vbs — "Starting..." info popup
'
' Shown by open-app.ps1 when the backend isn't up within 4s
' (cold boot can take 6-20 seconds). Auto-dismisses after 25s.
' ============================================================

Dim shell
Set shell = CreateObject("WScript.Shell")

shell.Popup _
    "Store Management System is starting..." & vbCrLf & vbCrLf & _
    "First start after PC login can take 6-20 seconds." & vbCrLf & _
    "The browser will open automatically." & vbCrLf & vbCrLf & _
    "Please wait...", _
    25, _
    "Store Management System", _
    64 ' 64 = information icon (vbInformation)
