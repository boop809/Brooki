// HideShit Pro - Brooki/Pyoncord Plugin
// Hide the Brooki settings and plugin entries from the Discord client UI.

const modApi = globalThis.bunny || globalThis.vendetta;
const { metro, patcher, storage, commands } = modApi;

// Retrieve standard React and React Native components
const React = metro.findByProps("createElement", "useState", "useEffect");
const { 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet
} = metro.findByProps("View", "Text");
const FormSwitch = metro.findByDisplayName("FormSwitch") || metro.findByProps("Switch")?.Switch;

// Initialize storage structure
storage.hideShit = storage.hideShit || {
    isHidden: false
};

function SettingsView() {
    const [hidden, setHidden] = React.useState(storage.hideShit.isHidden);

    const toggleHidden = (val) => {
        storage.hideShit.isHidden = val;
        setHidden(val);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>HideShit Pro</Text>
                    <Text style={styles.headerSubtitle}>Conceal Brooki client modifications</Text>
                </View>
                <Text style={styles.proBadge}>STEALTH</Text>
            </View>

            {/* Status Card */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Current Status</Text>
                <View style={[styles.statusBox, hidden ? styles.statusBoxRed : styles.statusBoxGreen]}>
                    <Text style={styles.statusIcon}>{hidden ? "🔒" : "🔓"}</Text>
                    <View style={{ marginLeft: 16 }}>
                        <Text style={styles.statusTitle}>{hidden ? "MOD IS CONCEALED" : "MOD IS VISIBLE"}</Text>
                        <Text style={styles.statusDesc}>
                            {hidden 
                                ? "Settings and tabs are hidden from the menu. Use /show in chat to restore." 
                                : "Settings are currently visible in Discord settings."}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Toggle Card */}
            <View style={styles.card}>
                <View style={styles.optionRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>Stealth Mode Toggled</Text>
                        <Text style={styles.optionDesc}>Manually hide all settings tabs</Text>
                    </View>
                    {FormSwitch ? (
                        <FormSwitch value={hidden} onValueChange={toggleHidden} />
                    ) : (
                        <TouchableOpacity onPress={() => toggleHidden(!hidden)}>
                            <Text style={styles.fallbackToggle}>{hidden ? "HIDDEN" : "SHOWN"}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Quick Commands Guide */}
            <Text style={styles.sectionTitle}>Stealth Chat Commands</Text>
            <View style={styles.commandCard}>
                <Text style={styles.commandText}>/hide</Text>
                <Text style={styles.commandDesc}>Instantly hides the Brooki menu from settings.</Text>
            </View>
            <View style={styles.commandCard}>
                <Text style={styles.commandText}>/show</Text>
                <Text style={styles.commandDesc}>Restores the Brooki menu back to settings.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0C0E",
        padding: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(22, 23, 28, 0.9)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#B9BBBE",
        marginTop: 2,
    },
    proBadge: {
        backgroundColor: "#E84118",
        color: "#FFFFFF",
        fontWeight: "900",
        fontSize: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: "rgba(22, 23, 28, 0.8)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "900",
        color: "#B9BBBE",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 12,
        paddingLeft: 4,
    },
    statusBox: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusBoxRed: {
        backgroundColor: "rgba(234, 32, 39, 0.08)",
        borderColor: "#EA2027",
    },
    statusBoxGreen: {
        backgroundColor: "rgba(46, 204, 113, 0.08)",
        borderColor: "#2ECC71",
    },
    statusIcon: {
        fontSize: 28,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    statusDesc: {
        fontSize: 11,
        color: "#B9BBBE",
        marginTop: 4,
        lineHeight: 16,
        paddingRight: 10,
    },
    optionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    optionTitle: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    optionDesc: {
        fontSize: 11,
        color: "#72767D",
        marginTop: 2,
    },
    fallbackToggle: {
        color: "#E84118",
        fontWeight: "bold",
    },
    commandCard: {
        backgroundColor: "rgba(22, 23, 28, 0.8)",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    commandText: {
        color: "#E84118",
        fontWeight: "bold",
        fontSize: 14,
        fontFamily: "monospace",
    },
    commandDesc: {
        color: "#B9BBBE",
        fontSize: 11,
    }
});

// Patches Registry
let patches = [];

// Recursive element tree cleaner to scrub settings menu elements in React UI
function cleanReactTree(node) {
    if (!node) return node;
    if (node.props) {
        const title = node.props.title || node.props.label || "";
        if (typeof title === "string" && (
            title.includes("Bunny") || 
            title.includes("Vendetta") || 
            title.includes("Kettu") || 
            title.includes("Brooki")
        )) {
            return null; // Conceal node
        }
        if (node.props.children) {
            if (Array.isArray(node.props.children)) {
                node.props.children = node.props.children.map(cleanReactTree).filter(Boolean);
            } else {
                const cleaned = cleanReactTree(node.props.children);
                node.props.children = cleaned;
            }
        }
    }
    return node;
}

var plugin = {
    onLoad: () => {
        try {
            console.log("[HideShitPro] Injecting stealth patchers...");

            // 1. Hook Settings Overview UI component
            const UserSettingsOverview = metro.findByDisplayName("UserSettingsOverview") || metro.findByProps("UserSettingsOverview");
            if (UserSettingsOverview) {
                const renderName = UserSettingsOverview.default ? "default" : "render";
                patches.push(patcher.after(renderName, UserSettingsOverview, (args, res) => {
                    if (storage.hideShit.isHidden) {
                        return cleanReactTree(res);
                    }
                    return res;
                }));
            }

            // 2. Hook raw settings builder modules as a secondary level defense
            const settingsModule = metro.findByProps("getDeveloperSettings") || metro.findByProps("getSettingRows");
            if (settingsModule) {
                for (const key of Object.keys(settingsModule)) {
                    if (typeof settingsModule[key] === "function") {
                        patches.push(patcher.after(key, settingsModule, (args, res) => {
                            if (storage.hideShit.isHidden && Array.isArray(res)) {
                                return res.filter(item => {
                                    const label = item?.title || item?.label || "";
                                    return !(
                                        label.includes("Bunny") || 
                                        label.includes("Vendetta") || 
                                        label.includes("Kettu") || 
                                        label.includes("Brooki")
                                    );
                                });
                            }
                            return res;
                        }));
                    }
                }
            }

            // 3. Register Slash Commands
            if (commands && typeof commands.registerCommand === "function") {
                // /hide Command
                patches.push(commands.registerCommand({
                    name: "hide",
                    description: "Conceal Brooki settings and mod menu entries.",
                    type: 1,
                    options: [],
                    execute: () => {
                        storage.hideShit.isHidden = true;
                        return {
                            content: "🔒 Brooki settings list has been hidden successfully."
                        };
                    }
                }));

                // /show Command
                patches.push(commands.registerCommand({
                    name: "show",
                    description: "Reveal Brooki settings and mod menu entries.",
                    type: 1,
                    options: [],
                    execute: () => {
                        storage.hideShit.isHidden = false;
                        return {
                            content: "🔓 Brooki settings list has been restored successfully."
                        };
                    }
                }));
            }

        } catch (e) {
            console.error("[HideShitPro] Error during load:", e);
        }
    },
    onUnload: () => {
        console.log("[HideShitPro] Disabling stealth mode.");
        for (const unpatch of patches) {
            if (typeof unpatch === "function") unpatch();
        }
        patches = [];
    },
    settings: SettingsView
};
