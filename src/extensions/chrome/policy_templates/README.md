# Enterprise Deployment Guide

This guide explains how to deploy the Shade Extension to enterprise environments using Group Policy (Windows) or MDM (macOS/Windows).

## Overview

The Shade Extension supports managed configuration through Chrome's enterprise policy system. Administrators can:

- Pre-configure API URL and authentication token
- Lock settings to prevent user modifications
- Set department and device identifiers
- Enable/disable specific features
- Configure sync intervals

## Deployment Methods

### Method 1: Chrome Web Store with Managed Settings

1. **Publish to Chrome Web Store** (private or public)
2. **Configure Group Policy** to force-install the extension
3. **Apply managed settings** via policy

### Method 2: Self-hosted Extension

1. **Host the .crx file** on your internal server
2. **Configure update URL** in manifest.json
3. **Deploy via Group Policy**

---

## Windows Group Policy Configuration

### Prerequisites

- Chrome ADMX templates installed
- Group Policy Management Console access
- Chrome Web Store extension ID (after publishing)

### Force-Install Extension

1. Open **Group Policy Management Editor**
2. Navigate to: `Computer Configuration > Administrative Templates > Google > Google Chrome > Extensions`
3. Enable **Configure the list of force-installed apps and extensions**
4. Add entry: `<extension_id>;https://clients2.google.com/service/update2/crx`

### Configure Managed Storage

1. Navigate to: `Computer Configuration > Administrative Templates > Google > Google Chrome > Extensions`
2. Enable **Configure extension management settings**
3. Add JSON policy:

```json
{
  "<extension_id>": {
    "installation_mode": "force_installed",
    "update_url": "https://clients2.google.com/service/update2/crx",
    "managed_configuration": {
      "api_url": "https://your-api-server.com",
      "api_token": "your-api-token-here",
      "enabled": true,
      "locked": true,
      "department": "Engineering",
      "blocking_enabled": true,
      "time_tracking_enabled": true,
      "hibp_check_enabled": true,
      "notifications_enabled": true
    }
  }
}
```

### Registry Method (Alternative)

Create registry keys under:

```
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\3rdparty\extensions\<extension_id>\policy
```

Example PowerShell script:

```powershell
$extensionId = "your-extension-id"
$regPath = "HKLM:\SOFTWARE\Policies\Google\Chrome\3rdparty\extensions\$extensionId\policy"

# Create registry path
New-Item -Path $regPath -Force

# Set managed values
Set-ItemProperty -Path $regPath -Name "api_url" -Value "https://your-api-server.com"
Set-ItemProperty -Path $regPath -Name "api_token" -Value "your-token"
Set-ItemProperty -Path $regPath -Name "enabled" -Value 1 -Type DWord
Set-ItemProperty -Path $regPath -Name "locked" -Value 1 -Type DWord
```

---

## macOS MDM Configuration

### Using Configuration Profile (.mobileconfig)

Create a configuration profile for managed preferences:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.google.Chrome.extensions.<extension_id></string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PayloadIdentifier</key>
            <string>com.company.chrome.shade</string>
            <key>PayloadUUID</key>
            <string>generate-uuid-here</string>
            <key>api_url</key>
            <string>https://your-api-server.com</string>
            <key>api_token</key>
            <string>your-api-token</string>
            <key>enabled</key>
            <true/>
            <key>locked</key>
            <true/>
            <key>department</key>
            <string>Engineering</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Shade Extension Configuration</string>
    <key>PayloadIdentifier</key>
    <string>com.company.shade.config</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>generate-uuid-here</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
```

### Jamf Pro

1. Navigate to **Computers > Configuration Profiles**
2. Create new profile with **Application & Custom Settings**
3. Add preference domain: `com.google.Chrome.extensions.<extension_id>`
4. Configure settings as needed

---

## Configuration Options

| Setting                   | Type    | Default | Description                          |
| ------------------------- | ------- | ------- | ------------------------------------ |
| `api_url`                 | string  | -       | Backend API server URL               |
| `api_token`               | string  | -       | Authentication token                 |
| `enabled`                 | boolean | true    | Enable extension                     |
| `locked`                  | boolean | false   | Lock settings from user modification |
| `device_id`               | string  | auto    | Device identifier                    |
| `department`              | string  | -       | Department name                      |
| `blocking_enabled`        | boolean | true    | Enable domain blocking               |
| `time_tracking_enabled`   | boolean | true    | Enable usage time tracking           |
| `hibp_check_enabled`      | boolean | true    | Enable password breach check         |
| `notifications_enabled`   | boolean | true    | Enable notifications                 |
| `username_filters`        | array   | []      | Patterns to filter from usernames    |
| `sync_interval_blacklist` | integer | 5       | Blacklist sync interval (minutes)    |
| `sync_interval_whitelist` | integer | 15      | Whitelist sync interval (minutes)    |
| `sync_interval_usage`     | integer | 15      | Usage sync interval (minutes)        |
| `sync_interval_config`    | integer | 60      | Config sync interval (minutes)       |

---

## Verification

### Check Applied Policies

1. Open Chrome and navigate to `chrome://policy`
2. Search for your extension ID
3. Verify managed settings are applied

### Check Extension Storage

1. Open Chrome DevTools for extension (background page)
2. Run in console:
   ```javascript
   chrome.storage.managed.get(null, console.log);
   ```

---

## Troubleshooting

### Policy Not Applying

1. Verify Chrome ADMX templates are installed
2. Run `gpupdate /force` on Windows
3. Restart Chrome completely
4. Check `chrome://policy` for errors

### Extension Not Installing

1. Verify extension ID is correct
2. Check network access to Chrome Web Store
3. Verify group policy scope (user vs computer)

### Settings Not Locked

1. Ensure `locked: true` is set in policy
2. Verify policy priority (computer > user)
3. Check for conflicting policies

---

## Security Notes

- Store API tokens securely (consider token rotation)
- Use separate tokens per department/device group
- Monitor token usage via API logs
- Implement IP allowlisting for API access

---

## Support

For assistance with enterprise deployment:

- Email: support@example.com
- Documentation: https://docs.example.com/shade-extension
