// Brooki / Pyoncord / Bunny Example Plugin
// This script intercepts outgoing messages and adds a custom command.

// Safely get the API of the mod loader (works for Bunny, Pyoncord, or Vendetta)
const modApi = (typeof bunny !== "undefined" ? bunny : (typeof vendetta !== "undefined" ? vendetta : window.bunny || window.vendetta));
const { metro, patcher, commands } = modApi;

// We will store our unpatch functions here to clean up when unloading
const unpatches = [];

var plugin = {
    onLoad: () => {
        try {
            console.log("[BrookiPlugin] Loading Example Plugin...");

            // --- 1. INTERCEPTING MESSAGES ---
            // Find the Discord module responsible for sending messages
            const MessageActions = metro.findByProps("sendMessage", "receiveMessage");

            if (MessageActions) {
                // Hook into 'sendMessage' before it executes
                const unpatchMessage = patcher.before("sendMessage", MessageActions, (args) => {
                    // args[1] contains the message object. args[1].content is the message text.
                    if (args[1] && typeof args[1].content === "string") {
                        let text = args[1].content;

                        // Replace ":shrug:" with the shrug emoticon
                        if (text.includes(":shrug:")) {
                            text = text.replace(/:shrug:/g, "¯\\_(ツ)_/¯");
                            args[1].content = text; // Update the message content
                        }
                    }
                });
                unpatches.push(unpatchMessage);
                console.log("[BrookiPlugin] Successfully hooked sendMessage");
            } else {
                console.error("[BrookiPlugin] MessageActions module not found.");
            }

            // --- 2. REGISTERING A SLASH COMMAND ---
            if (commands && typeof commands.registerCommand === "function") {
                const unregisterCommand = commands.registerCommand({
                    name: "ping",
                    description: "Replies with Pong! to test if Brooki plugin is working.",
                    // Type 1: CHAT command
                    type: 1, 
                    // Tell Discord this command doesn't require arguments
                    options: [], 
                    execute: (args, ctx) => {
                        return {
                            content: "🏓 Pong! Brooki Example Plugin is active and working."
                        };
                    }
                });
                unpatches.push(unregisterCommand);
                console.log("[BrookiPlugin] Successfully registered /ping command");
            } else {
                console.error("[BrookiPlugin] Commands API not available.");
            }

        } catch (error) {
            console.error("[BrookiPlugin] Error during onLoad:", error);
        }
    },

    onUnload: () => {
        console.log("[BrookiPlugin] Unloading Example Plugin...");
        // Revert all patches and unregister all commands to avoid memory leaks or crashes
        for (const unpatch of unpatches) {
            try {
                if (typeof unpatch === "function") {
                    unpatch();
                }
            } catch (err) {
                console.error("[BrookiPlugin] Error during unpatching:", err);
            }
        }
        // Clear the array
        unpatches.length = 0;
    }
};
