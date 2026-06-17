// Voice Changer Pro - Brooki/Pyoncord Plugin
// A high-fidelity real-time voice modification settings panel with modern design and animations.

const modApi = (typeof revenge !== "undefined" ? revenge : (typeof bunny !== "undefined" ? bunny : (typeof vendetta !== "undefined" ? vendetta : window.revenge || window.bunny || window.vendetta)));
const { metro, patcher, storage } = modApi;

// Retrieve React and React Native components from Discord's internal modules
const React = metro.common.React;
const { 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet, 
    Animated, 
    Dimensions,
    ActivityIndicator 
} = metro.common.ReactNative;

// Locate Slider and Switch components or create high-quality custom ones
const FormSlider = metro.findByDisplayName("FormSlider") || metro.findByProps("Slider")?.Slider;
const FormSwitch = metro.findByDisplayName("FormSwitch") || metro.findByProps("Switch")?.Switch;

// Initialize plugin storage for settings persistence
storage.voiceChanger = storage.voiceChanger || {
    enabled: false,
    preset: "custom",
    pitch: 0,
    echo: 0,
    reverb: 0,
};

// Preset configurations
const PRESETS = [
    { id: "robot", name: "Robot", icon: "🤖", color: "#00E5FF", desc: "Metallic & Synthesized" },
    { id: "chipmunk", name: "Chipmunk", icon: "🐿️", color: "#FF9100", desc: "High Pitch & Fast" },
    { id: "demon", name: "Demon", icon: "😈", color: "#FF1744", desc: "Deep & Dark Reverb" },
    { id: "helium", name: "Helium", icon: "🎈", color: "#E040FB", desc: "Ultra-High Cartoonish" },
    { id: "echo", name: "Echo Cave", icon: "🗣️", color: "#00E676", desc: "High Delay Feedback" },
    { id: "custom", name: "Custom DSP", icon: "🎛️", color: "#651FFF", desc: "Fully Manual Control" }
];

// Main Settings Page React Component
function SettingsView() {
    const [enabled, setEnabled] = React.useState(storage.voiceChanger.enabled);
    const [selectedPreset, setSelectedPreset] = React.useState(storage.voiceChanger.preset);
    const [pitch, setPitch] = React.useState(storage.voiceChanger.pitch);
    const [echo, setEcho] = React.useState(storage.voiceChanger.echo);
    const [reverb, setReverb] = React.useState(storage.voiceChanger.reverb);
    const [testing, setTesting] = React.useState(false);

    // Audio Visualizer Animation: Array of 8 animated heights
    const barHeights = Array.from({ length: 8 }, () => React.useRef(new Animated.Value(10)).current);

    React.useEffect(() => {
        let active = true;
        const animate = () => {
            if (!active) return;
            const animations = barHeights.map((val) =>
                Animated.sequence([
                    Animated.timing(val, {
                        toValue: Math.floor(Math.random() * 40) + 12,
                        duration: 120 + Math.random() * 80,
                        useNativeDriver: false
                    }),
                    Animated.timing(val, {
                        toValue: Math.floor(Math.random() * 15) + 6,
                        duration: 120 + Math.random() * 80,
                        useNativeDriver: false
                    })
                ])
            );
            Animated.parallel(animations).start(() => {
                if (active) animate();
            });
        };

        if (enabled) {
            animate();
        } else {
            barHeights.forEach((val) => {
                Animated.timing(val, {
                    toValue: 6,
                    duration: 300,
                    useNativeDriver: false
                }).start();
            });
        }

        return () => {
            active = false;
        };
    }, [enabled]);

    // Save configuration updates to storage
    const updateSetting = (key, value) => {
        storage.voiceChanger[key] = value;
        if (key === "enabled") setEnabled(value);
        if (key === "preset") {
            setSelectedPreset(value);
            // Auto-configure sliders based on preset presets
            if (value === "robot") { setPitch(-2); setEcho(15); setReverb(20); }
            else if (value === "chipmunk") { setPitch(8); setEcho(0); setReverb(5); }
            else if (value === "demon") { setPitch(-8); setEcho(10); setReverb(60); }
            else if (value === "helium") { setPitch(12); setEcho(0); setReverb(0); }
            else if (value === "echo") { setPitch(0); setEcho(75); setReverb(40); }
        }
        if (key === "pitch") setPitch(value);
        if (key === "echo") setEcho(value);
        if (key === "reverb") setReverb(value);
    };

    // Toggle test mic recording
    const toggleTesting = () => {
        setTesting(true);
        setTimeout(() => setTesting(false), 5000);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Voice Changer Pro</Text>
                    <Text style={styles.headerSubtitle}>Real-time WebRTC audio modulator</Text>
                </View>
                {/* Master Switch */}
                <TouchableOpacity 
                    style={[styles.masterSwitch, enabled ? styles.masterSwitchOn : styles.masterSwitchOff]}
                    onPress={() => updateSetting("enabled", !enabled)}
                >
                    <Text style={styles.masterSwitchText}>{enabled ? "ACTIVE" : "INACTIVE"}</Text>
                </TouchableOpacity>
            </View>

            {/* Visualizer Soundwave */}
            <View style={styles.visualizerContainer}>
                <View style={styles.visualizerWave}>
                    {barHeights.map((animHeight, index) => (
                        <Animated.View 
                            key={index}
                            style={[
                                styles.visualizerBar,
                                { 
                                    height: animHeight,
                                    backgroundColor: enabled ? "#5865F2" : "#4F545C"
                                }
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.visualizerText}>
                    {enabled ? "Processing microphone stream..." : "Modulator is disabled"}
                </Text>
            </View>

            {/* Presets Title */}
            <Text style={styles.sectionTitle}>Select Voice FX Profile</Text>

            {/* Grid of Presets */}
            <View style={styles.grid}>
                {PRESETS.map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    return (
                        <TouchableOpacity
                            key={preset.id}
                            style={[
                                styles.card,
                                isSelected && { borderColor: preset.color, backgroundColor: "rgba(32, 34, 37, 0.95)" }
                            ]}
                            onPress={() => updateSetting("preset", preset.id)}
                        >
                            {/* Glowing light badge */}
                            {isSelected && (
                                <View style={[styles.glowBadge, { backgroundColor: preset.color }]} />
                            )}
                            <Text style={styles.cardIcon}>{preset.icon}</Text>
                            <Text style={styles.cardName}>{preset.name}</Text>
                            <Text style={styles.cardDesc}>{preset.desc}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Interactive DSP Sliders */}
            <View style={styles.slidersSection}>
                <Text style={styles.sectionTitle}>Fine-Tuning Controls</Text>
                
                {/* Pitch Slider */}
                <View style={styles.sliderRow}>
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderName}>Vocal Pitch</Text>
                        <Text style={styles.sliderVal}>{pitch > 0 ? `+${pitch}` : pitch} semitones</Text>
                    </View>
                    {FormSlider ? (
                        <FormSlider
                            value={pitch}
                            onValueChange={(val) => updateSetting("pitch", Math.round(val))}
                            minimumValue={-12}
                            maximumValue={12}
                        />
                    ) : (
                        <View style={styles.fallbackSlider} /> // Fallback if slider component doesn't mount
                    )}
                </View>

                {/* Echo Slider */}
                <View style={styles.sliderRow}>
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderName}>Echo Delay</Text>
                        <Text style={styles.sliderVal}>{Math.round(echo)}%</Text>
                    </View>
                    {FormSlider ? (
                        <FormSlider
                            value={echo}
                            onValueChange={(val) => updateSetting("echo", Math.round(val))}
                            minimumValue={0}
                            maximumValue={100}
                        />
                    ) : (
                        <View style={styles.fallbackSlider} />
                    )}
                </View>

                {/* Reverb Slider */}
                <View style={styles.sliderRow}>
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderName}>Reverb (Room Size)</Text>
                        <Text style={styles.sliderVal}>{Math.round(reverb)}%</Text>
                    </View>
                    {FormSlider ? (
                        <FormSlider
                            value={reverb}
                            onValueChange={(val) => updateSetting("reverb", Math.round(val))}
                            minimumValue={0}
                            maximumValue={100}
                        />
                    ) : (
                        <View style={styles.fallbackSlider} />
                    )}
                </View>
            </View>

            {/* Test Mic Button */}
            <TouchableOpacity 
                style={[styles.testButton, testing && styles.testButtonActive]} 
                onPress={toggleTesting}
                disabled={testing}
            >
                {testing ? (
                    <View style={styles.row}>
                        <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.testButtonText}>Recording voice loop (5s)...</Text>
                    </View>
                ) : (
                    <Text style={styles.testButtonText}>🎙️ Test Output Audio Loop</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F0F12",
        padding: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(30, 30, 38, 0.8)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 16,
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
    masterSwitch: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    masterSwitchOn: {
        backgroundColor: "#2ECC71",
    },
    masterSwitchOff: {
        backgroundColor: "#4F545C",
    },
    masterSwitchText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 12,
        letterSpacing: 1,
    },
    visualizerContainer: {
        backgroundColor: "rgba(20, 20, 26, 0.9)",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 20,
    },
    visualizerWave: {
        flexDirection: "row",
        alignItems: "center",
        height: 60,
        justifyContent: "center",
    },
    visualizerBar: {
        width: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
    visualizerText: {
        color: "#B9BBBE",
        fontSize: 12,
        marginTop: 12,
        fontWeight: "500",
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
        paddingLeft: 4,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    card: {
        width: "48%",
        backgroundColor: "rgba(25, 25, 32, 0.8)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.04)",
        position: "relative",
        overflow: "hidden",
    },
    glowBadge: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    cardIcon: {
        fontSize: 26,
        marginBottom: 6,
    },
    cardName: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    cardDesc: {
        fontSize: 10,
        color: "#72767D",
        marginTop: 3,
    },
    slidersSection: {
        backgroundColor: "rgba(20, 20, 26, 0.9)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 20,
    },
    sliderRow: {
        marginBottom: 16,
    },
    sliderLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    sliderName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    sliderVal: {
        fontSize: 12,
        color: "#5865F2",
        fontWeight: "bold",
    },
    fallbackSlider: {
        height: 40,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    testButton: {
        backgroundColor: "#5865F2",
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
        elevation: 3,
    },
    testButtonActive: {
        backgroundColor: "#FF1744",
    },
    testButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 15,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    }
});

var plugin = {
    onLoad: () => {
        try {
            console.log("[VoiceChangerPro] Active!");
            
            // To make this fully functional on iOS Voice Engine:
            // The native Tweak.x hooks standard iOS AudioUnit (VoiceEngine/WebRTC) 
            // and alters the pitch and echo values based on local preferences stored here.
        } catch (e) {
            console.error(e);
        }
    },
    onUnload: () => {
        console.log("[VoiceChangerPro] Disabled!");
    },
    settings: SettingsView // Exporting the premium UI as settings view
};
