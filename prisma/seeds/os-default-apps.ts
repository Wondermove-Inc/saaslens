// prisma/seeds/os-default-apps.ts
// OS 기본 앱 Seed 데이터

import { DevicePlatform, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface OsDefaultAppSeed {
  name: string;
  bundleId?: string;
  namePattern?: string;
  category: string;
  description?: string;
}

// macOS 기본 앱 목록
const macOSDefaultApps: OsDefaultAppSeed[] = [
  // System Apps
  {
    name: "Finder",
    bundleId: "com.apple.finder",
    category: "System",
    description: "macOS 파일 관리자",
  },
  {
    name: "System Preferences",
    bundleId: "com.apple.systempreferences",
    category: "System",
  },
  {
    name: "System Settings",
    bundleId: "com.apple.systempreferences",
    category: "System",
  },
  {
    name: "Activity Monitor",
    bundleId: "com.apple.ActivityMonitor",
    category: "System",
  },
  {
    name: "Disk Utility",
    bundleId: "com.apple.DiskUtility",
    category: "System",
  },
  { name: "Terminal", bundleId: "com.apple.Terminal", category: "System" },
  { name: "Console", bundleId: "com.apple.Console", category: "System" },
  {
    name: "Keychain Access",
    bundleId: "com.apple.keychainaccess",
    category: "System",
  },
  {
    name: "Migration Assistant",
    bundleId: "com.apple.MigrateAssistant",
    category: "System",
  },
  { name: "Automator", bundleId: "com.apple.Automator", category: "System" },
  {
    name: "Script Editor",
    bundleId: "com.apple.ScriptEditor2",
    category: "System",
  },

  // Productivity
  {
    name: "Safari",
    bundleId: "com.apple.Safari",
    category: "Browser",
    description: "Apple 기본 브라우저",
  },
  {
    name: "Mail",
    bundleId: "com.apple.mail",
    category: "Email",
    description: "Apple 기본 이메일",
  },
  { name: "Calendar", bundleId: "com.apple.iCal", category: "Productivity" },
  {
    name: "Contacts",
    bundleId: "com.apple.AddressBook",
    category: "Productivity",
  },
  { name: "Notes", bundleId: "com.apple.Notes", category: "Productivity" },
  {
    name: "Reminders",
    bundleId: "com.apple.reminders",
    category: "Productivity",
  },
  { name: "Maps", bundleId: "com.apple.Maps", category: "Utility" },
  {
    name: "Freeform",
    bundleId: "com.apple.freeform",
    category: "Productivity",
  },

  // Media
  { name: "Preview", bundleId: "com.apple.Preview", category: "Utility" },
  {
    name: "QuickTime Player",
    bundleId: "com.apple.QuickTimePlayerX",
    category: "Media",
  },
  { name: "Music", bundleId: "com.apple.Music", category: "Media" },
  { name: "Photos", bundleId: "com.apple.Photos", category: "Media" },
  { name: "TV", bundleId: "com.apple.TV", category: "Media" },
  { name: "Podcasts", bundleId: "com.apple.podcasts", category: "Media" },
  { name: "Books", bundleId: "com.apple.iBooksX", category: "Media" },

  // Utilities
  { name: "Calculator", bundleId: "com.apple.calculator", category: "Utility" },
  { name: "Screenshot", bundleId: "com.apple.Screenshot", category: "Utility" },
  { name: "TextEdit", bundleId: "com.apple.TextEdit", category: "Utility" },
  { name: "Font Book", bundleId: "com.apple.FontBook", category: "Utility" },
  {
    name: "Archive Utility",
    bundleId: "com.apple.archiveutility",
    category: "Utility",
  },
  { name: "Grapher", bundleId: "com.apple.Grapher", category: "Utility" },
  {
    name: "Digital Color Meter",
    bundleId: "com.apple.DigitalColorMeter",
    category: "Utility",
  },
  {
    name: "ColorSync Utility",
    bundleId: "com.apple.ColorSyncUtility",
    category: "Utility",
  },

  // Communication
  {
    name: "Messages",
    bundleId: "com.apple.MobileSMS",
    category: "Communication",
  },
  {
    name: "FaceTime",
    bundleId: "com.apple.FaceTime",
    category: "Communication",
  },

  // App Store & iCloud
  { name: "App Store", bundleId: "com.apple.AppStore", category: "System" },
  { name: "iCloud", bundleId: "com.apple.CloudDocs", category: "System" },

  // Development (Xcode 관련)
  { name: "Xcode", bundleId: "com.apple.dt.Xcode", category: "Development" },
  {
    name: "Instruments",
    bundleId: "com.apple.dt.Instruments",
    category: "Development",
  },
  {
    name: "Simulator",
    bundleId: "com.apple.iphonesimulator",
    category: "Development",
  },
];

// Windows 기본 앱 목록
const windowsDefaultApps: OsDefaultAppSeed[] = [
  // System
  {
    name: "Microsoft Edge",
    namePattern: "^Microsoft Edge.*",
    category: "Browser",
    description: "Windows 기본 브라우저",
  },
  { name: "Windows Security", category: "System" },
  { name: "Settings", category: "System" },
  { name: "Task Manager", category: "System" },
  { name: "File Explorer", category: "System" },
  { name: "Control Panel", category: "System" },
  { name: "Device Manager", category: "System" },
  {
    name: "Windows Terminal",
    namePattern: "^Windows Terminal.*",
    category: "System",
  },
  {
    name: "PowerShell",
    namePattern: "^(Windows )?PowerShell.*",
    category: "System",
  },
  { name: "Command Prompt", category: "System" },

  // Productivity
  { name: "Notepad", category: "Utility" },
  { name: "WordPad", category: "Utility" },
  { name: "Calculator", category: "Utility" },
  { name: "Paint", category: "Utility" },
  { name: "Paint 3D", category: "Utility" },
  { name: "Snipping Tool", category: "Utility" },
  { name: "Calendar", category: "Productivity" },
  { name: "Mail", category: "Email" },
  { name: "Windows Mail", category: "Email" },
  { name: "Clock", category: "Utility" },
  { name: "Alarms & Clock", category: "Utility" },

  // Media
  {
    name: "Windows Media Player",
    namePattern: "^Windows Media Player.*",
    category: "Media",
  },
  { name: "Photos", category: "Media" },
  { name: "Movies & TV", category: "Media" },
  { name: "Groove Music", category: "Media" },
  { name: "Voice Recorder", category: "Utility" },
  { name: "Camera", category: "Utility" },
  { name: "Sound Recorder", category: "Utility" },

  // Communication
  {
    name: "Microsoft Teams",
    namePattern: "^Microsoft Teams.*",
    category: "Communication",
  },
  { name: "Skype", category: "Communication" },

  // Store & Entertainment
  { name: "Microsoft Store", category: "System" },
  { name: "Xbox", category: "Entertainment" },
  { name: "Xbox Game Bar", category: "Entertainment" },

  // Accessibility
  { name: "Magnifier", category: "Accessibility" },
  { name: "Narrator", category: "Accessibility" },
  { name: "On-Screen Keyboard", category: "Accessibility" },

  // Others
  { name: "Remote Desktop Connection", category: "Utility" },
  { name: "Sticky Notes", category: "Productivity" },
  { name: "Tips", category: "System" },
  { name: "Get Help", category: "System" },
  { name: "Feedback Hub", category: "System" },
];

// Linux 기본 앱 목록 (GNOME/Ubuntu 기준)
const linuxDefaultApps: OsDefaultAppSeed[] = [
  // Browser
  { name: "Firefox", category: "Browser", description: "Ubuntu 기본 브라우저" },
  { name: "Firefox ESR", namePattern: "^Firefox ESR.*", category: "Browser" },

  // System
  { name: "Files", namePattern: "^(Nautilus|Files)$", category: "System" },
  { name: "Nautilus", category: "System" },
  {
    name: "Terminal",
    namePattern: "^(gnome-terminal|Terminal|konsole)$",
    category: "System",
  },
  { name: "gnome-terminal", category: "System" },
  { name: "Settings", category: "System" },
  { name: "Software", category: "System" },
  { name: "Ubuntu Software", category: "System" },
  { name: "System Monitor", category: "System" },
  { name: "Disks", category: "System" },

  // Productivity
  {
    name: "Calculator",
    namePattern: "^(gnome-calculator|Calculator)$",
    category: "Utility",
  },
  {
    name: "Text Editor",
    namePattern: "^(gedit|Text Editor|Kate)$",
    category: "Utility",
  },
  { name: "gedit", category: "Utility" },
  { name: "Document Viewer", category: "Utility" },
  { name: "evince", category: "Utility" },

  // Media
  { name: "Image Viewer", category: "Media" },
  { name: "eog", category: "Media" },
  { name: "Videos", category: "Media" },
  { name: "totem", category: "Media" },
  { name: "Rhythmbox", category: "Media" },

  // Utilities
  { name: "Screenshot", category: "Utility" },
  { name: "gnome-screenshot", category: "Utility" },
  { name: "Disk Usage Analyzer", category: "System" },
  { name: "baobab", category: "System" },
  { name: "Archive Manager", category: "Utility" },
  { name: "file-roller", category: "Utility" },
  { name: "Characters", category: "Utility" },
  { name: "Fonts", category: "Utility" },
];

export async function seedOsDefaultApps() {
  console.log("Seeding OS Default Apps...");

  let created = 0;
  let updated = 0;

  // macOS
  for (const app of macOSDefaultApps) {
    const result = await prisma.osDefaultApp.upsert({
      where: {
        name_platform: {
          name: app.name,
          platform: DevicePlatform.MACOS,
        },
      },
      update: {
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        category: app.category,
        description: app.description,
      },
      create: {
        name: app.name,
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        platform: DevicePlatform.MACOS,
        category: app.category,
        description: app.description,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }
  console.log(
    `  macOS: ${macOSDefaultApps.length} apps (created: ${created}, updated: ${updated})`
  );

  created = 0;
  updated = 0;

  // Windows
  for (const app of windowsDefaultApps) {
    const result = await prisma.osDefaultApp.upsert({
      where: {
        name_platform: {
          name: app.name,
          platform: DevicePlatform.WINDOWS,
        },
      },
      update: {
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        category: app.category,
        description: app.description,
      },
      create: {
        name: app.name,
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        platform: DevicePlatform.WINDOWS,
        category: app.category,
        description: app.description,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }
  console.log(
    `  Windows: ${windowsDefaultApps.length} apps (created: ${created}, updated: ${updated})`
  );

  created = 0;
  updated = 0;

  // Linux
  for (const app of linuxDefaultApps) {
    const result = await prisma.osDefaultApp.upsert({
      where: {
        name_platform: {
          name: app.name,
          platform: DevicePlatform.LINUX,
        },
      },
      update: {
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        category: app.category,
        description: app.description,
      },
      create: {
        name: app.name,
        bundleId: app.bundleId,
        namePattern: app.namePattern,
        platform: DevicePlatform.LINUX,
        category: app.category,
        description: app.description,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }
  console.log(
    `  Linux: ${linuxDefaultApps.length} apps (created: ${created}, updated: ${updated})`
  );

  const totalCount =
    macOSDefaultApps.length +
    windowsDefaultApps.length +
    linuxDefaultApps.length;
  console.log(`\nTotal: ${totalCount} OS Default Apps seeded successfully!`);
}

// 직접 실행 시
if (require.main === module) {
  seedOsDefaultApps()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
