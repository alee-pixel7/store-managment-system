# Setup folders — offline installers

Is folder me **pre-built installers** rahenge (git me commit nahi hote — sirf local):

```
setup/
├── windows/
│   └── Store.Management.System_1.0.0_x64-setup.exe    ← Windows 10/11 (64-bit)
└── linux/
    ├── Store.Management.System_1.0.0_amd64.deb         ← Ubuntu/Debian
    ├── Store.Management.System-1.0.0-1.x86_64.rpm       ← Fedora/RHEL/openSUSE
    └── Store.Management.System_1.0.0_amd64.AppImage    ← Har Linux distro
```

## Installers kahan se aate hain

Har push pe GitHub Actions (`.github/workflows/build.yml`) dono installers
**automatically build** karta hai:

1. **Artifacts** — Actions tab → latest run → *windows-installer* /
   *linux-installers* artifact se download
2. **Release** — tag push (`v*`) pe installers GitHub Release me attach hote hain:
   `https://github.com/alee-pixel7/store-managment-system/releases`

Download karke yahan ke relevant folder me rakh dein — USB ke liye ready.

## Install (target machine — internet ki zaroorat NAHI)

| OS | File | Kaise |
|----|------|-------|
| Windows 10/11 | `*_setup.exe` | Double-click → Install. SmartScreen aaye toh **More info → Run anyway** (unsigned installer) |
| Ubuntu/Debian | `*.deb` | `sudo dpkg -i Store.Management.System_*.deb` |
| Fedora/RHEL/openSUSE | `*.rpm` | `sudo dnf install ./Store.Management.System-*.rpm` (system webkit khud install kar lega) |
| Any Linux | `*.AppImage` | `chmod +x *.AppImage` → double-click (FUSE na ho toh `--appimage-extract`) |

> ⚠️ **Fedora pe AppImage blank window dikha sakta hai** (known Tauri/WebKitGTK
> issue — bundled webkit host ke naye graphics stack se clash karta hai).
> Fedora pe hamesha **.rpm** use karein — distro ka apna WebKitGTK milta hai,
> rendering theek rehti hai.

- App data (DB, backups): Windows `%APPDATA%\Store Management System\`, Linux `~/.local/share/com.storemanagement.app/`
- **Fresh install = fresh DB** — login `STORE ADMIN` / `S123T`, 34 machines seeded, 0 items
- Purana data chahiye toh Settings → Backup se restore karein
- Sab kuch **offline** — reports ke PDF/Excel exports bhi premium Noir + Amethyst theme me
- Data zero karna ho toh Settings → **Danger Zone → Factory Reset** (`RESET` type karke confirm)
