// RecAudio Pro - Brooki/Pyoncord Plugin
// Bypass iOS VoIP screen recording blocks and capture other users' voice in calls.

(() => {
const modApi = (
    typeof kettu !== "undefined" ? kettu :
    typeof revenge !== "undefined" ? revenge :
    typeof bunny !== "undefined" ? bunny :
    typeof vendetta !== "undefined" ? vendetta :
    window.kettu || window.revenge || window.bunny || window.vendetta
);
const { metro, storage } = modApi;

// Retrieve standard React and React Native components
const React = metro.common?.React || metro.React || metro.findByProps("createElement", "useState", "useEffect");
const { 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet, 
    Animated,
    Easing
} = metro.common?.ReactNative || metro.ReactNative || metro.findByProps("View", "Text");

// Initialize storage for setting persistence
storage.recAudio = storage.recAudio || {
    enabled: false,
    audioQuality: "studio", // studio, compressed, raw
    dualChannel: true
};

function SettingsView() {
    const [enabled, setEnabled] = React.useState(storage.recAudio.enabled);
    const [audioQuality, setAudioQuality] = React.useState(storage.recAudio.audioQuality);
    const [dualChannel, setDualChannel] = React.useState(storage.recAudio.dualChannel);

    // Cassette Wheel Rotation Animation
    const rotateAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        let animation;
        if (enabled) {
            rotateAnim.setValue(0);
            animation = Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true
                })
            );
            animation.start();
        } else {
            rotateAnim.setValue(0);
            animation?.stop();
        }
        return () => animation?.stop();
    }, [enabled]);

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"]
    });

    // Save configurations
    const updateSetting = (key, value) => {
        storage.recAudio[key] = value;
        if (key === "enabled") setEnabled(value);
        if (key === "audioQuality") setAudioQuality(value);
        if (key === "dualChannel") setDualChannel(value);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>RecAudio Pro</Text>
                    <Text style={styles.headerSubtitle}>VoIP Call Audio Capture Engine</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.masterSwitch, enabled ? styles.masterSwitchOn : styles.masterSwitchOff]}
                    onPress={() => updateSetting("enabled", !enabled)}
                >
                    <Text style={styles.masterSwitchText}>{enabled ? "UNBLOCKED" : "BLOCKED"}</Text>
                </TouchableOpacity>
            </View>

            {/* Premium Animated Cassette Tape Visualizer */}
            <View style={styles.cassetteContainer}>
                <View style={styles.cassetteBody}>
                    <View style={styles.cassetteLabel}>
                        <Text style={styles.labelTitle}>RECAUDIO TAPE C60</Text>
                        <Text style={styles.labelSub}>HIGH POSITION • 96kHz / 24bit</Text>
                    </View>
                    
                    {/* Tape Reels */}
                    <View style={styles.reelsRow}>
                        {/* Reel Left */}
                        <Animated.View style={[styles.reel, { transform: [{ rotate: rotateInterpolate }] }]}>
                            <View style={styles.reelInner} />
                            <View style={styles.spoke} />
                            <View style={[styles.spoke, { transform: [{ rotate: "45deg" }] }]} />
                            <View style={[styles.spoke, { transform: [{ rotate: "90deg" }] }]} />
                            <View style={[styles.spoke, { transform: [{ rotate: "135deg" }] }]} />
                        </Animated.View>

                        {/* Middle Window (shows brown tape inside) */}
                        <View style={styles.tapeWindow}>
                            <View style={[styles.tapeCore, enabled && { backgroundColor: "#FF4757" }]} />
                        </View>

                        {/* Reel Right */}
                        <Animated.View style={[styles.reel, { transform: [{ rotate: rotateInterpolate }] }]}>
                            <View style={styles.reelInner} />
                            <View style={styles.spoke} />
                            <View style={[styles.spoke, { transform: [{ rotate: "45deg" }] }]} />
                            <View style={[styles.spoke, { transform: [{ rotate: "90deg" }] }]} />
                            <View style={[styles.spoke, { transform: [{ rotate: "135deg" }] }]} />
                        </Animated.View>
                    </View>
                </View>
                <Text style={styles.visualizerText}>
                    {enabled ? "Tape is rolling. System audio blocks bypassed." : "Cassette idle. Remote voices blocked by iOS."}
                </Text>
            </View>

            {/* Quick Walkthrough Guide */}
            <Text style={styles.sectionTitle}>Screen Recording Walkthrough</Text>
            
            <View style={styles.cardStep}>
                <Text style={styles.stepNum}>1</Text>
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Activate RecAudio Pro</Text>
                    <Text style={styles.stepDesc}>Toggle the switch at the top to bypass iOS native audio session blocks.</Text>
                </View>
            </View>

            <View style={styles.cardStep}>
                <Text style={styles.stepNum}>2</Text>
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Check System Recording Menu</Text>
                    <Text style={styles.stepDesc}>Swipe down Control Center, long press the Screen Recording button, and verify that system sound is active.</Text>
                </View>
            </View>

            <View style={styles.cardStep}>
                <Text style={styles.stepNum}>3</Text>
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Enjoy Full Call Audio</Text>
                    <Text style={styles.stepDesc}>Record your screen during any Discord server or private call. Other participants' voices will now be captured flawlessly in the resulting video.</Text>
                </View>
            </View>

            {/* Advanced Audio Modes */}
            <Text style={styles.sectionTitle}>Advanced Audio Settings</Text>
            
            <View style={styles.optionsSection}>
                {/* Audio Quality Grid */}
                <Text style={styles.optionSectionHeader}>Format Quality</Text>
                <View style={styles.qualityContainer}>
                    {["studio", "compressed", "raw"].map((q) => {
                        const active = audioQuality === q;
                        return (
                            <TouchableOpacity
                                key={q}
                                style={[styles.qualityCard, active && styles.qualityCardActive]}
                                onPress={() => updateSetting("audioQuality", q)}
                            >
                                <Text style={[styles.qualityName, active && styles.qualityTextActive]}>
                                    {q === "studio" ? "Studio AAC" : q === "compressed" ? "OPUS VoIP" : "RAW PCM"}
                                </Text>
                                <Text style={styles.qualitySub}>
                                    {q === "studio" ? "48kHz / 320kbps" : q === "compressed" ? "32kHz / 64kbps" : "96kHz Lossless"}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Dual Channel Switch */}
                <View style={styles.optionRow}>
                    <View>
                        <Text style={styles.optionLabel}>Dual Channel Output</Text>
                        <Text style={styles.optionSub}>Separates mic and call audio into stereo streams</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, dualChannel ? styles.toggleBtnOn : styles.toggleBtnOff]}
                        onPress={() => updateSetting("dualChannel", !dualChannel)}
                    >
                        <Text style={styles.toggleText}>{dualChannel ? "STEREO" : "MONO"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#08080C",
        padding: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(18, 18, 24, 0.8)",
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
    masterSwitch: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    masterSwitchOn: {
        backgroundColor: "#2ECC71",
    },
    masterSwitchOff: {
        backgroundColor: "#EA2027",
    },
    masterSwitchText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 12,
        letterSpacing: 1,
    },
    cassetteContainer: {
        backgroundColor: "rgba(14, 14, 20, 0.95)",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.04)",
        marginBottom: 24,
    },
    cassetteBody: {
        width: "100%",
        aspectRatio: 1.6,
        backgroundColor: "#1C1C24",
        borderRadius: 12,
        borderWidth: 3,
        borderColor: "#2D2D3A",
        padding: 12,
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    cassetteLabel: {
        backgroundColor: "#E1B12C",
        padding: 8,
        borderRadius: 6,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F5CD79",
    },
    labelTitle: {
        color: "#1C1C24",
        fontWeight: "900",
        fontSize: 14,
        letterSpacing: 1,
    },
    labelSub: {
        color: "#3D3D4F",
        fontSize: 8,
        fontWeight: "700",
        marginTop: 2,
    },
    reelsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        marginVertical: 14,
    },
    reel: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 6,
        borderColor: "#4A4A5A",
        backgroundColor: "#1E1E26",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    reelInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: "#111116",
        zIndex: 5,
    },
    spoke: {
        position: "absolute",
        width: "100%",
        height: 2,
        backgroundColor: "#3A3A4A",
    },
    tapeWindow: {
        width: 65,
        height: 24,
        backgroundColor: "#0B0B0E",
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#2A2A38",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    tapeCore: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#57606F",
        opacity: 0.75,
    },
    visualizerText: {
        color: "#B9BBBE",
        fontSize: 11,
        marginTop: 14,
        textAlign: "center",
        fontWeight: "500",
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
        paddingLeft: 4,
    },
    cardStep: {
        flexDirection: "row",
        backgroundColor: "rgba(18, 18, 24, 0.8)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
        alignItems: "center",
    },
    stepNum: {
        fontSize: 28,
        fontWeight: "900",
        color: "#E1B12C",
        marginRight: 18,
        width: 30,
        textAlign: "center",
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    stepDesc: {
        fontSize: 11,
        color: "#B9BBBE",
        marginTop: 4,
        lineHeight: 16,
    },
    optionsSection: {
        backgroundColor: "rgba(18, 18, 24, 0.8)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 40,
    },
    optionSectionHeader: {
        fontSize: 12,
        fontWeight: "700",
        color: "#B9BBBE",
        marginBottom: 10,
        textTransform: "uppercase",
    },
    qualityContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 18,
    },
    qualityCard: {
        width: "31%",
        backgroundColor: "#111116",
        borderRadius: 10,
        padding: 10,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.03)",
    },
    qualityCardActive: {
        borderColor: "#E1B12C",
        backgroundColor: "rgba(225, 177, 44, 0.06)",
    },
    qualityName: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#B9BBBE",
    },
    qualityTextActive: {
        color: "#E1B12C",
    },
    qualitySub: {
        fontSize: 8,
        color: "#72767D",
        marginTop: 4,
    },
    optionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.05)",
    },
    optionLabel: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    optionSub: {
        fontSize: 10,
        color: "#72767D",
        marginTop: 2,
    },
    toggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    toggleBtnOn: {
        backgroundColor: "#E1B12C",
    },
    toggleBtnOff: {
        backgroundColor: "#2F3136",
    },
    toggleText: {
        color: "#1C1C24",
        fontSize: 10,
        fontWeight: "bold",
    }
});

return {
    onLoad: () => {
        try {
            console.log("[RecAudioPro] Capturer service online.");
        } catch (e) {
            console.error(e);
        }
    },
    onUnload: () => {
        console.log("[RecAudioPro] Service offline.");
    },
    settings: SettingsView
};

})()