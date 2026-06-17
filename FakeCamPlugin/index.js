// FakeCam Pro - Brooki/Pyoncord Plugin
// Inject custom image feeds into Discord camera stream with a premium monitoring UI.

(() => {
try {
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
    TextInput, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet, 
    Animated,
    ActivityIndicator,
    NativeModules
} = metro.common?.ReactNative || metro.ReactNative || metro.findByProps("View", "Text");

// Retrieve standard switches and UI controls
const FormSwitch = metro.findByDisplayName("FormSwitch") || metro.findByProps("Switch")?.Switch;

// Initialize storage for setting persistence
storage.fakeCam = storage.fakeCam || {
    enabled: false,
    imageUrl: "https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif", // Default Rickroll
    preset: "rickroll",
    scanlines: true,
    blink: true,
    shake: true
};

const PRESETS = [
    { id: "rickroll", name: "Rick Roll", icon: "🕺", url: "https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif" },
    { id: "difficulties", name: "Offline", icon: "⚠️", url: "https://i.imgur.com/YwN9v85.png" }, // SMPTE Color Bars
    { id: "gaming", name: "Gaming Room", icon: "🎮", url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600" },
    { id: "anime", name: "Anime Space", icon: "🌸", url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600" }
];

function SettingsView() {
    const [enabled, setEnabled] = React.useState(storage.fakeCam.enabled);
    const [imageUrl, setImageUrl] = React.useState(storage.fakeCam.imageUrl);
    const [selectedPreset, setSelectedPreset] = React.useState(storage.fakeCam.preset);
    const [scanlines, setScanlines] = React.useState(storage.fakeCam.scanlines);
    const [blink, setBlink] = React.useState(storage.fakeCam.blink);
    const [shake, setShake] = React.useState(storage.fakeCam.shake);
    const [loadingLocal, setLoadingLocal] = React.useState(false);

    // Animation values
    const blinkAnim = React.useRef(new Animated.Value(1)).current;
    const shakeAnim = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const [timecode, setTimecode] = React.useState("00:00:00:00");

    // 1. Blinking REC Indicator Animation
    React.useEffect(() => {
        let animation;
        if (enabled && blink) {
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(blinkAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
                    Animated.timing(blinkAnim, { toValue: 1.0, duration: 600, useNativeDriver: true })
                ])
            );
            animation.start();
        } else {
            blinkAnim.setValue(1);
        }
        return () => animation?.stop();
    }, [enabled, blink]);

    // 2. Camera Shake Animation (Simulates hand-held camera vibration)
    React.useEffect(() => {
        let active = true;
        const startShake = () => {
            if (!active || !enabled || !shake) {
                shakeAnim.setValue({ x: 0, y: 0 });
                return;
            }
            Animated.timing(shakeAnim, {
                toValue: {
                    x: (Math.random() - 0.5) * 4,
                    y: (Math.random() - 0.5) * 4
                },
                duration: 250 + Math.random() * 250,
                useNativeDriver: true
            }).start(() => {
                if (active) startShake();
            });
        };

        if (enabled && shake) {
            startShake();
        } else {
            shakeAnim.setValue({ x: 0, y: 0 });
        }

        return () => { active = false; };
    }, [enabled, shake]);

    // 3. Viewfinder Live Timecode Counter
    React.useEffect(() => {
        let interval;
        if (enabled) {
            let frames = 0;
            let seconds = 0;
            let minutes = 0;
            let hours = 0;

            interval = setInterval(() => {
                frames += 2; // Simulating 30fps ticks
                if (frames >= 30) {
                    frames = 0;
                    seconds++;
                }
                if (seconds >= 60) {
                    seconds = 0;
                    minutes++;
                }
                if (minutes >= 60) {
                    minutes = 0;
                    hours++;
                }
                const pad = (num) => String(num).padStart(2, "0");
                setTimecode(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`);
            }, 66); // ~15 ticks per second
        } else {
            setTimecode("00:00:00:00");
        }
        return () => clearInterval(interval);
    }, [enabled]);

    // Save configuration updates
    const updateSetting = (key, value) => {
        storage.fakeCam[key] = value;
        if (key === "enabled") setEnabled(value);
        if (key === "imageUrl") {
            setImageUrl(value);
            // If matches a preset, select it, otherwise set to custom/local
            const matched = PRESETS.find(p => p.url === value);
            setSelectedPreset(matched ? matched.id : "custom");
        }
        if (key === "preset") {
            setSelectedPreset(value);
            const found = PRESETS.find(p => p.id === value);
            if (found) {
                setImageUrl(found.url);
                storage.fakeCam.imageUrl = found.url;
            }
        }
        if (key === "scanlines") setScanlines(value);
        if (key === "blink") setBlink(value);
        if (key === "shake") setShake(value);
    };

    // Open native image picker to select local photo from library
    const pickLocalImage = async () => {
        try {
            setLoadingLocal(true);
            const ImagePicker = NativeModules.DCDImageHelper || NativeModules.ImagePickerManager || NativeModules.MediaManager;
            
            if (ImagePicker && typeof ImagePicker.showImagePicker === "function") {
                ImagePicker.showImagePicker({
                    title: "Select FakeCam Feed",
                    mediaType: "photo",
                    storageOptions: { skipBackup: true, path: "images" }
                }, (response) => {
                    setLoadingLocal(false);
                    if (response && response.uri) {
                        updateSetting("imageUrl", response.uri);
                        setSelectedPreset("local");
                    }
                });
            } else if (NativeModules.DocumentPicker && typeof NativeModules.DocumentPicker.show === "function") {
                const result = await NativeModules.DocumentPicker.show({
                    type: ["public.image"]
                });
                setLoadingLocal(false);
                if (result && result.uri) {
                    updateSetting("imageUrl", result.uri);
                    setSelectedPreset("local");
                }
            } else {
                setLoadingLocal(false);
                console.error("[FakeCamPro] Native image picker modules not found.");
            }
        } catch (err) {
            setLoadingLocal(false);
            console.error("[FakeCamPro] Failed to pick image:", err);
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header Title */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>FakeCam Pro</Text>
                    <Text style={styles.headerSubtitle}>Inject custom feeds into video calls</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.masterSwitch, enabled ? styles.masterSwitchOn : styles.masterSwitchOff]}
                    onPress={() => updateSetting("enabled", !enabled)}
                >
                    <Text style={styles.masterSwitchText}>{enabled ? "ON AIR" : "MUTED"}</Text>
                </TouchableOpacity>
            </View>

            {/* Live Camera Viewfinder Preview */}
            <View style={styles.viewfinderContainer}>
                <Animated.View 
                    style={[
                        styles.viewfinder,
                        { transform: [{ translateX: shakeAnim.x }, { translateY: shakeAnim.y }] }
                    ]}
                >
                    {imageUrl ? (
                        <Image 
                            source={{ uri: imageUrl }} 
                            style={styles.previewImage} 
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.placeholderView}>
                            <Text style={styles.placeholderText}>NO SIGNAL</Text>
                        </View>
                    )}

                    {/* Scanline overlay */}
                    {scanlines && <View style={styles.scanlineOverlay} pointerEvents="none" />}

                    {/* Viewfinder Overlays */}
                    <View style={styles.viewfinderHUD} pointerEvents="none">
                        {/* Top HUD */}
                        <View style={styles.hudRow}>
                            <View style={styles.recContainer}>
                                <Animated.View style={[styles.recDot, { opacity: blinkAnim }]} />
                                <Text style={styles.hudText}>REC</Text>
                            </View>
                            <Text style={styles.hudText}>1080P 60FPS</Text>
                        </View>

                        {/* Bottom HUD */}
                        <View style={[styles.hudRow, styles.hudRowBottom]}>
                            <Text style={styles.hudText}>{timecode}</Text>
                            <Text style={styles.hudText}>🔋 100%</Text>
                        </View>
                    </View>
                </Animated.View>
                <Text style={styles.viewfinderTitle}>LIVE MONITOR PREVIEW</Text>
            </View>

            {/* Custom URL Input & Pick Local button */}
            <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>Input Custom Image URL</Text>
                <TextInput
                    style={styles.textInput}
                    value={imageUrl.startsWith("file://") || imageUrl.startsWith("ph://") ? "Local Image Selected" : imageUrl}
                    onChangeText={(val) => updateSetting("imageUrl", val)}
                    placeholder="https://example.com/image.gif"
                    placeholderTextColor="#72767D"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                
                <View style={styles.divider} />

                {/* Local Gallery Picker Button */}
                <TouchableOpacity 
                    style={styles.pickerButton} 
                    onPress={pickLocalImage}
                    disabled={loadingLocal}
                >
                    {loadingLocal ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.pickerButtonText}>🖼️ Select Image From Camera Roll</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Presets Grid */}
            <Text style={styles.sectionTitle}>Feed Presets</Text>
            <View style={styles.grid}>
                {PRESETS.map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    return (
                        <TouchableOpacity
                            key={preset.id}
                            style={[
                                styles.card,
                                isSelected && styles.cardSelected
                            ]}
                            onPress={() => updateSetting("preset", preset.id)}
                        >
                            <Text style={styles.cardIcon}>{preset.icon}</Text>
                            <Text style={styles.cardName}>{preset.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* VFX Settings switches */}
            <View style={styles.optionsSection}>
                <Text style={styles.sectionTitle}>Monitor Visual Effects</Text>
                
                <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Scanline CRT Effect</Text>
                    {FormSwitch ? (
                        <FormSwitch 
                            value={scanlines} 
                            onValueChange={(val) => updateSetting("scanlines", val)} 
                        />
                    ) : (
                        <TouchableOpacity onPress={() => updateSetting("scanlines", !scanlines)}>
                            <Text style={styles.fallbackToggle}>{scanlines ? "YES" : "NO"}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Blinking REC Indicator</Text>
                    {FormSwitch ? (
                        <FormSwitch 
                            value={blink} 
                            onValueChange={(val) => updateSetting("blink", val)} 
                        />
                    ) : (
                        <TouchableOpacity onPress={() => updateSetting("blink", !blink)}>
                            <Text style={styles.fallbackToggle}>{blink ? "YES" : "NO"}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Simulate Camera Shake</Text>
                    {FormSwitch ? (
                        <FormSwitch 
                            value={shake} 
                            onValueChange={(val) => updateSetting("shake", val)} 
                        />
                    ) : (
                        <TouchableOpacity onPress={() => updateSetting("shake", !shake)}>
                            <Text style={styles.fallbackToggle}>{shake ? "YES" : "NO"}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0C0C0F",
        padding: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(22, 22, 28, 0.8)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
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
        backgroundColor: "#E84118",
    },
    masterSwitchOff: {
        backgroundColor: "#2F3136",
    },
    masterSwitchText: {
        color: "#FFFFFF",
        fontWeight: "900",
        fontSize: 12,
        letterSpacing: 1,
    },
    viewfinderContainer: {
        backgroundColor: "rgba(18, 18, 24, 0.9)",
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 20,
        alignItems: "center",
    },
    viewfinder: {
        width: "100%",
        aspectRatio: 16 / 9,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#000",
        position: "relative",
    },
    previewImage: {
        width: "100%",
        height: "100%",
    },
    placeholderView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        color: "#E84118",
        fontSize: 24,
        fontWeight: "bold",
        letterSpacing: 3,
    },
    scanlineOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.08)",
        borderBottomWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.03)",
    },
    viewfinderHUD: {
        ...StyleSheet.absoluteFillObject,
        padding: 10,
        justifyContent: "space-between",
    },
    hudRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    hudRowBottom: {
        alignItems: "flex-end",
    },
    recContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    recDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#E84118",
        marginRight: 6,
    },
    hudText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "700",
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 3,
    },
    viewfinderTitle: {
        color: "#72767D",
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 2,
        marginTop: 10,
    },
    inputSection: {
        backgroundColor: "rgba(22, 22, 28, 0.8)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    textInput: {
        backgroundColor: "#09090C",
        borderRadius: 10,
        padding: 12,
        color: "#FFFFFF",
        fontSize: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        marginVertical: 14,
    },
    pickerButton: {
        backgroundColor: "#5865F2",
        borderRadius: 10,
        paddingVertical: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    pickerButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 13,
    },
    grid: {
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
        marginBottom: 20,
    },
    card: {
        width: "23%",
        backgroundColor: "rgba(22, 22, 28, 0.8)",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.03)",
    },
    cardSelected: {
        borderColor: "#E84118",
        backgroundColor: "rgba(232, 65, 24, 0.08)",
    },
    cardIcon: {
        fontSize: 22,
        marginBottom: 4,
    },
    cardName: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#FFFFFF",
        textAlign: "center",
    },
    optionsSection: {
        backgroundColor: "rgba(22, 22, 28, 0.8)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 40,
    },
    optionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.04)",
    },
    optionLabel: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "500",
    },
    fallbackToggle: {
        color: "#E84118",
        fontWeight: "bold",
    }
});

return {
    onLoad: () => {
        try {
            console.log("[FakeCamPro] Plugin Loaded!");
        } catch (e) {
            console.error(e);
        }
    },
    onUnload: () => {
        console.log("[FakeCamPro] Plugin Unloaded!");
    },
    settings: SettingsView
};

} catch (e) {
    console.error("[Plugin Init Failure] ", e);
    if (typeof alert !== "undefined") {
        alert("Plugin Init Error (" + "FakeCamPlugin" + "): " + e.message + "\n" + e.stack);
    }
    return {
        onLoad: () => {
            if (typeof alert !== "undefined") {
                alert("Plugin onLoad failed (" + "FakeCamPlugin" + "): " + e.message);
            }
        },
        onUnload: () => {}
    };
}
})()