const { withAppBuildGradle } = require("@expo/config-plugins");

// android/ is regenerated from scratch by `expo prebuild --clean` (it's gitignored),
// which would otherwise silently reset release builds back to the debug keystore.
// This plugin re-applies the real upload-keystore signing config every time prebuild
// runs, reading credentials from release-signing/keystore.properties (kept outside the
// disposable android/ folder, and gitignored since it holds real secrets).
function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("keystorePropertiesFile")) {
      contents = contents.replace(
        /apply plugin: "com\.android\.application"/,
        `apply plugin: "com.android.application"

def keystorePropertiesFile = rootProject.file("../release-signing/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}`,
      );
    }

    if (!contents.includes("signingConfigs.release")) {
      contents = contents.replace(
        /signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*\}/,
        (debugBlock) => `signingConfigs {
        ${debugBlock.replace(/^signingConfigs\s*\{\s*|\s*\}$/g, "")}
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`,
      );
      contents = contents.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
        "$1signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug",
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withReleaseSigning;
