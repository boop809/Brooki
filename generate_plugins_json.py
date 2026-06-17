import os
import json

plugins = [
    "EditUsersPlugin",
    "HideShitPlugin",
    "VoiceChangerPlugin",
    "FakeCamPlugin",
    "ScreenRecordPlugin",
    "ExamplePlugin"
]

plugins_json = {}

for plugin in plugins:
    manifest_path = os.path.join(plugin, "manifest.json")
    index_path = os.path.join(plugin, "index.js")
    
    if os.path.exists(manifest_path) and os.path.exists(index_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            with open(index_path, 'r', encoding='utf-8') as f:
                js_code = f.read()
            
            # The plugin ID matches the raw GitHub URL with a trailing slash
            plugin_id = f"https://raw.githubusercontent.com/boop809/Brooki/main/{plugin}/"
            
            plugins_json[plugin_id] = {
                "id": plugin_id,
                "manifest": manifest,
                "enabled": True,  # Pre-enable the plugin
                "update": True,
                "js": js_code
            }
            print(f"Bundled {plugin} successfully.")
        except Exception as e:
            print(f"Error bundling {plugin}: {e}")
    else:
        print(f"Skipping {plugin}: manifest or index not found.")

output_dir = "Resources"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

with open(os.path.join(output_dir, "VENDETTA_PLUGINS"), 'w', encoding='utf-8') as f:
    json.dump(plugins_json, f, ensure_ascii=False)

print("Saved VENDETTA_PLUGINS to Resources/VENDETTA_PLUGINS")
