const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="@raw/isrg_root_x1" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

// Some Android devices from before ~2017 (API < 25) never received Let's Encrypt's
// ISRG Root X1 in their system trust store, and the old cross-signed fallback chain
// that used to cover them expired in 2021. Chrome/WebView work anyway because Chrome
// manages its own trusted-root list independently of the OS, but this app's own HTTPS
// requests (OkHttp) rely on the system trust store and fail outright on those devices.
// Bundling the root certificate directly as an additional trust anchor fixes it
// without needing every device's OS-level trust store to be current.
function withNetworkSecurityConfig(config) {
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, "app/src/main/res/xml");
      const rawDir = path.join(config.modRequest.platformProjectRoot, "app/src/main/res/raw");
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(rawDir, { recursive: true });

      fs.writeFileSync(path.join(xmlDir, "network_security_config.xml"), NETWORK_SECURITY_CONFIG_XML);
      fs.copyFileSync(
        path.join(__dirname, "certs/isrg_root_x1.pem"),
        path.join(rawDir, "isrg_root_x1.pem"),
      );

      return config;
    },
  ]);

  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    return config;
  });
}

module.exports = withNetworkSecurityConfig;
