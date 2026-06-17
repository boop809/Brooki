const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const plugins = [
    "EditUsersPlugin",
    "HideShitPlugin",
    "VoiceChangerPlugin",
    "FakeCamPlugin",
    "ScreenRecordPlugin",
    "ExamplePlugin"
];

function calculateSHA256(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

console.log("Starting Brooki Plugin Build System...");

// Ensure esbuild is installed or accessible via npx
try {
    execSync('npx esbuild --version', { stdio: 'ignore' });
} catch (e) {
    console.log("Installing esbuild globally/locally...");
    execSync('npm install -g esbuild', { stdio: 'inherit' });
}

for (const plugin of plugins) {
    const pluginDir = path.join(__dirname, plugin);
    if (!fs.existsSync(pluginDir)) {
        console.log(`Skipping ${plugin}: directory does not exist.`);
        continue;
    }

    const srcDir = path.join(pluginDir, 'src');
    const srcFile = path.join(srcDir, 'index.jsx');
    const rootFile = path.join(pluginDir, 'index.js');
    const manifestPath = path.join(pluginDir, 'manifest.json');

    // Migrate root index.js to src/index.jsx if not already migrated
    if (!fs.existsSync(srcFile) && fs.existsSync(rootFile)) {
        console.log(`Migrating raw source of ${plugin} to src/index.jsx...`);
        if (!fs.existsSync(srcDir)) {
            fs.mkdirSync(srcDir, { recursive: true });
        }
        fs.renameSync(rootFile, srcFile);
    }

    if (!fs.existsSync(srcFile)) {
        console.log(`Error: Source file not found for ${plugin} at ${srcFile}`);
        continue;
    }

    console.log(`Compiling ${plugin}...`);
    try {
        // Compile using esbuild with JSX support
        execSync(`npx esbuild "${srcFile}" --outfile="${rootFile}" --bundle --minify --format=iife --platform=neutral`, {
            stdio: 'inherit'
        });

        if (fs.existsSync(rootFile)) {
            console.log(`Successfully compiled ${plugin}.`);
            
            // Update manifest
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                
                // Format authors
                if (manifest.author) {
                    manifest.authors = [{ name: manifest.author }];
                    delete manifest.author;
                }
                
                // Add vendetta icon mapping matching Silentdeletee style
                const icons = {
                    "EditUsersPlugin": "ic_edit_24px",
                    "HideShitPlugin": "ic_visibility_24px",
                    "VoiceChangerPlugin": "ic_mic_24px",
                    "FakeCamPlugin": "ic_video_24px",
                    "ScreenRecordPlugin": "ic_videocam_24px",
                    "ExamplePlugin": "ic_info_24px"
                };
                manifest.vendetta = manifest.vendetta || {};
                manifest.vendetta.icon = icons[plugin] || "ic_info_24px";

                // Compute and set hash
                const newHash = calculateSHA256(rootFile);
                manifest.hash = newHash;
                manifest.main = "index.js";
                
                fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), 'utf-8');
                console.log(`Updated manifest for ${plugin} (hash: ${newHash.substring(0, 8)}...).`);
            }
        }
    } catch (err) {
        console.error(`Failed to compile ${plugin}:`, err.message);
    }
}

console.log("Build complete!");
