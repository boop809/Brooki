// EditUsers Pro - Brooki/Pyoncord Plugin
// Premium mobile port of Vencord's EditUsers. Customizes everything client-side.

const modApi = (typeof bunny !== "undefined" ? bunny : (typeof vendetta !== "undefined" ? vendetta : window.bunny || window.vendetta));
const { metro, patcher, storage } = modApi;

// Retrieve standard React and React Native components
const React = metro.findByProps("createElement", "useState", "useEffect");
const { 
    View, 
    Text, 
    TextInput, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet,
    ActivityIndicator,
    FlatList
} = metro.findByProps("View", "Text");

// Initialize storage structure
storage.editUsers = storage.editUsers || {};

// Discord Store Lookups
const UserStore = metro.findByProps("getUser", "getCurrentUser");
const UserProfileStore = metro.findByProps("getUserProfile") || metro.findByProps("getUserProfileStore");
const IconUtils = metro.findByProps("getUserAvatarURL", "getBadgeIconURL");
const FluxDispatcher = metro.findByProps("dispatch", "subscribe");
const FormSwitch = metro.findByDisplayName("FormSwitch") || metro.findByProps("Switch")?.Switch;

// Unicode Font Transformations
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const FONTS = {
    "bold": "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳",
    "italic": "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧",
    "bold-italic": "𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛",
    "cursive": "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏",
    "cursive-bold": "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃",
    "gothic": "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷",
    "gothic-bold": "𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟",
    "double-struck": "𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤放𝕦𝕧𝕨𝕩𝕪𝕫",
    "monospace": "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒操控𝚓操控𝚔操控𝚕操控𝚖操控𝚗操控𝚘操控𝚙操控𝚚操控𝚛操控𝚜操控𝚝操控𝚞操控𝚠操控𝚡操控𝚢操控𝚣"
};

function applyUnicodeFont(text, style) {
    if (!text || !style || style === "none") return text;
    const fontStr = FONTS[style];
    if (!fontStr) return text;
    const fontArr = Array.from(fontStr);
    return Array.from(text).map(char => {
        const idx = ALPHABET.indexOf(char);
        return idx !== -1 ? fontArr[idx] : char;
    }).join("");
}

// Predefined Official Badges
const GITHUB_BASE = "https://raw.githubusercontent.com/mezotv/discord-badges/main";
const BADGE_GROUPS = [
    {
        category: "Staff & General",
        items: [
            { name: "Active Developer", iconSrc: `${GITHUB_BASE}/assets/activedeveloper.svg` },
            { name: "Early Supporter", iconSrc: `${GITHUB_BASE}/assets/discordearlysupporter.svg` },
            { name: "Discord Staff", iconSrc: `${GITHUB_BASE}/assets/discordstaff.svg` },
            { name: "Partnered Server Owner", iconSrc: `${GITHUB_BASE}/assets/discordpartner.svg` },
            { name: "Moderator Programs Alumni", iconSrc: `${GITHUB_BASE}/assets/discordmod.svg` },
            { name: "Early Verified Bot Developer", iconSrc: `${GITHUB_BASE}/assets/discordbotdev.svg` },
            { name: "HypeSquad Events", iconSrc: `${GITHUB_BASE}/assets/hypesquadevents.svg` },
            { name: "HypeSquad Brilliance", iconSrc: `${GITHUB_BASE}/assets/hypesquadbrilliance.svg` },
            { name: "HypeSquad Bravery", iconSrc: `${GITHUB_BASE}/assets/hypesquadbravery.svg` },
            { name: "HypeSquad Balance", iconSrc: `${GITHUB_BASE}/assets/hypesquadbalance.svg` },
            { name: "Discord Bug Hunter (Tier 1)", iconSrc: `${GITHUB_BASE}/assets/discordbughunter1.svg` },
            { name: "Discord Bug Hunter (Tier 2)", iconSrc: `${GITHUB_BASE}/assets/discordbughunter2.svg` },
            { name: "Originally known as", iconSrc: `${GITHUB_BASE}/assets/username.png` },
            { name: "Completed a Quest", iconSrc: `${GITHUB_BASE}/assets/quest.png` }
        ]
    },
    {
        category: "Nitro Tiers",
        items: [
            { name: "Nitro Bronze (1 Month)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/bronze.png` },
            { name: "Nitro Silver (3 Months)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/silver.png` },
            { name: "Nitro Gold (6 Months)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/gold.png` },
            { name: "Nitro Platinum (12 Months)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/platinum.png` },
            { name: "Nitro Diamond (24 Months)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/diamond.png` },
            { name: "Nitro Emerald (36 Months)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/emerald.png` },
            { name: "Nitro Ruby (60 Months)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/ruby.png` },
            { name: "Nitro Opal (72+ Months)", iconSrc: `${GITHUB_BASE}/assets/subscriptions/badges/opal.png` }
        ]
    },
    {
        category: "Boosting Tiers",
        items: [
            { name: "Boost (1 Month)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost1.svg` },
            { name: "Boost (2 Months)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost2.svg` },
            { name: "Boost (3 Months)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost3.svg` },
            { name: "Boost (6 Months)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost4.svg` },
            { name: "Boost (9 Months)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost5.svg` },
            { name: "Boost (1 Year)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost6.svg` },
            { name: "Boost (1 Year 3 Months)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost7.svg` },
            { name: "Boost (1 Year 6 Months)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost8.svg` },
            { name: "Boost (2 Years)", iconSrc: `${GITHUB_BASE}/assets/boosts/discordboost9.svg` }
        ]
    }
];

function SettingsView() {
    const currentUser = UserStore?.getCurrentUser();
    
    // Editor State
    const [targetId, setTargetId] = React.useState(currentUser?.id || "");
    const [displayName, setDisplayName] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [avatarUrl, setAvatarUrl] = React.useState("");
    const [bannerUrl, setBannerUrl] = React.useState("");
    const [bio, setBio] = React.useState("");
    const [pronouns, setPronouns] = React.useState("");
    const [fontStyle, setFontStyle] = React.useState("none");
    const [primaryColor, setPrimaryColor] = React.useState("");
    const [accentColor, setAccentColor] = React.useState("");
    const [avatarDecorationURL, setAvatarDecorationURL] = React.useState("");
    const [profileEffectId, setProfileEffectId] = React.useState("");
    const [createdAt, setCreatedAt] = React.useState("");

    // Badges
    const [selectedBadges, setSelectedBadges] = React.useState([]);

    // Extra Custom Badges
    const [customBadges, setCustomBadges] = React.useState([]);
    const [customBadgeName, setCustomBadgeName] = React.useState("");
    const [customBadgeUrl, setCustomBadgeUrl] = React.useState("");

    const addCustomBadge = () => {
        if (!customBadgeName.trim() || !customBadgeUrl.trim()) return;
        const newBadge = { name: customBadgeName.trim(), iconSrc: customBadgeUrl.trim() };
        const updated = [...customBadges, newBadge];
        setCustomBadges(updated);
        setCustomBadgeName("");
        setCustomBadgeUrl("");
    };

    const removeCustomBadge = (index) => {
        const updated = customBadges.filter((_, i) => i !== index);
        setCustomBadges(updated);
    };

    // Cloning state
    const [cloneId, setCloneId] = React.useState("");
    const [cloning, setCloning] = React.useState(false);

    // List of currently spoofed users
    const [spoofedUsersList, setSpoofedUsersList] = React.useState([]);

    const loadSpoofedList = () => {
        const list = [];
        for (const [id, data] of Object.entries(storage.editUsers)) {
            list.push({ id, ...data });
        }
        setSpoofedUsersList(list);
    };

    React.useEffect(() => {
        loadSpoofedList();
    }, []);

    // Load custom data when targetId changes
    React.useEffect(() => {
        if (!targetId) return;
        const custom = storage.editUsers[targetId] || {};
        const originalUser = UserStore?.getUser(targetId);

        setDisplayName(custom.globalName || originalUser?.globalName || "");
        setUsername(custom.username || originalUser?.username || "");
        setAvatarUrl(custom.avatarURL || originalUser?.getAvatarURL?.() || "");
        setBannerUrl(custom.bannerURL || "");
        setBio(custom.bio || "");
        setPronouns(custom.pronouns || "");
        setFontStyle(custom.fontStyle || "none");
        setPrimaryColor(custom.primaryColor || "");
        setAccentColor(custom.accentColor || "");
        setAvatarDecorationURL(custom.avatarDecorationURL || "");
        setProfileEffectId(custom.profileEffectId || "");
        setCreatedAt(custom.createdAt || "");
        setSelectedBadges(custom.officialBadges || []);
        setCustomBadges(custom.customBadges || []);
    }, [targetId]);

    // Dispatch update to refresh UI
    const triggerUserRefresh = (id) => {
        if (!id || !FluxDispatcher) return;
        const user = UserStore?.getUser(id);
        if (user) {
            FluxDispatcher.dispatch({
                type: "USER_UPDATE",
                user: { ...user }
            });
        }
    };

    const handleSave = () => {
        if (!targetId) return;

        storage.editUsers[targetId] = {
            globalName: displayName,
            username: username,
            avatarURL: avatarUrl,
            bannerURL: bannerUrl,
            bio: bio,
            pronouns: pronouns,
            fontStyle: fontStyle,
            primaryColor: primaryColor,
            accentColor: accentColor,
            avatarDecorationURL: avatarDecorationURL,
            profileEffectId: profileEffectId,
            createdAt: createdAt,
            officialBadges: selectedBadges,
            customBadges: customBadges
        };

        triggerUserRefresh(targetId);
        loadSpoofedList();
    };

    const handleDelete = (id) => {
        delete storage.editUsers[id];
        triggerUserRefresh(id);
        loadSpoofedList();
        if (targetId === id) {
            setTargetId("");
        }
    };

    // Account Cloning Core Logic
    const handleClone = async () => {
        const id = cloneId.replace(/\D/g, "");
        if (id.length < 17 || id.length > 20) {
            return;
        }

        setCloning(true);
        try {
            let cloneUser = UserStore?.getUser(id);

            // Fetch profile using Discord API internally
            const ProfileFetcher = metro.findByProps("fetchProfile");
            if (ProfileFetcher?.fetchProfile) {
                try {
                    await ProfileFetcher.fetchProfile(id);
                } catch (e) {
                    console.log("Profile Fetch Error: ", e);
                }
            }

            const cloneProfile = UserProfileStore?.getUserProfile(id) || {};
            
            if (!cloneUser) {
                cloneUser = cloneProfile?.user;
            }

            if (cloneUser) {
                setDisplayName(cloneUser.globalName || cloneUser.global_name || "");
                setUsername(cloneUser.username || "");
                setAvatarUrl(cloneUser.getAvatarURL?.() || "");
                
                // Colors
                if (cloneProfile.themeColors && cloneProfile.themeColors.length >= 2) {
                    const toHex = (num) => "#" + num.toString(16).padStart(6, "0");
                    setPrimaryColor(toHex(cloneProfile.themeColors[0]));
                    setAccentColor(toHex(cloneProfile.themeColors[1]));
                }
                
                // Deco & effect
                if (cloneUser.avatarDecorationData?.asset) {
                    setAvatarDecorationURL(`https://cdn.discordapp.com/avatar-decoration-presets/${cloneUser.avatarDecorationData.asset}.png`);
                }
                setProfileEffectId(cloneProfile.profileEffectId || "");
                setBio(cloneProfile.bio || "");
                setPronouns(cloneProfile.pronouns || "");

                // Map official badges
                if (cloneProfile.badges) {
                    const mapped = cloneProfile.badges.map(b => ({
                        name: b.description || b.id || "Badge",
                        iconSrc: `https://cdn.discordapp.com/badge-icons/${b.icon}.png`
                    }));
                    setSelectedBadges(mapped);
                }
            }
        } catch (err) {
            console.error("[EditUsersPro] Clone error: ", err);
        }
        setCloning(false);
    };

    const toggleBadge = (badge) => {
        const index = selectedBadges.findIndex(b => b.iconSrc === badge.iconSrc);
        if (index > -1) {
            setSelectedBadges(selectedBadges.filter(b => b.iconSrc !== badge.iconSrc));
        } else {
            setSelectedBadges([...selectedBadges, badge]);
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>EditUsers Pro</Text>
                    <Text style={styles.headerSubtitle}>Full Profile & Identity Cloning Tool</Text>
                </View>
                <Text style={styles.proBadge}>PARITY V2</Text>
            </View>

            {/* Account Cloner */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Clone Account</Text>
                <View style={styles.row}>
                    <TextInput
                        style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                        value={cloneId}
                        onChangeText={setCloneId}
                        placeholder="Paste User ID to copy profile..."
                        placeholderTextColor="#72767D"
                        keyboardType="numeric"
                    />
                    <TouchableOpacity 
                        style={styles.cloneBtn}
                        onPress={handleClone}
                        disabled={cloning}
                    >
                        {cloning ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.cloneBtnText}>Copy Profile</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Profile Selection */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>1. Target User</Text>
                <View style={styles.quickButtons}>
                    <TouchableOpacity 
                        style={styles.quickBtn}
                        onPress={() => currentUser && setTargetId(currentUser.id)}
                    >
                        <Text style={styles.quickBtnText}>👤 Edit Myself</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.quickBtn, styles.quickBtnPurple]}
                        onPress={() => setTargetId("")}
                    >
                        <Text style={styles.quickBtnText}>🔍 Reset Target</Text>
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={styles.textInput}
                    value={targetId}
                    onChangeText={setTargetId}
                    placeholder="Custom User ID..."
                    placeholderTextColor="#72767D"
                    keyboardType="numeric"
                />
            </View>

            {/* Live Profile Card Preview */}
            <Text style={styles.sectionTitle}>Live Preview</Text>
            <View style={styles.previewCard}>
                {/* Banner */}
                <View style={[styles.previewBanner, bannerUrl ? null : styles.previewBannerDefault, primaryColor ? { backgroundColor: primaryColor } : null]}>
                    {bannerUrl ? (
                        <Image source={{ uri: bannerUrl }} style={styles.fullImage} resizeMode="cover" />
                    ) : null}
                </View>

                {/* Profile Header */}
                <View style={styles.previewInfo}>
                    {/* Avatar */}
                    <View style={styles.avatarWrapper}>
                        <Image 
                            source={{ uri: avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png" }} 
                            style={styles.previewAvatar} 
                        />
                    </View>

                    {/* Badges Container */}
                    <View style={styles.badgesRow}>
                        {selectedBadges.concat(customBadges).map((badge, i) => (
                            <Image key={i} source={{ uri: badge.iconSrc }} style={styles.previewBadgeImg} />
                        ))}
                    </View>

                    {/* Names */}
                    <Text style={styles.previewGlobalName}>
                        {applyUnicodeFont(displayName, fontStyle) || "Display Name"}
                    </Text>
                    <Text style={styles.previewUsername}>
                        @{applyUnicodeFont(username, fontStyle) || "username"}
                    </Text>

                    {/* Pronouns */}
                    {pronouns ? <Text style={styles.previewPronouns}>{pronouns}</Text> : null}

                    <View style={styles.previewDivider} />

                    {/* Bio */}
                    <Text style={styles.bioTitle}>ABOUT ME</Text>
                    <Text style={styles.bioText}>{bio || "No biography provided."}</Text>
                </View>
            </View>

            {/* Editing Form Fields */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>2. Identity Customization</Text>
                
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                    style={styles.textInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display Name"
                    placeholderTextColor="#72767D"
                />

                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                    style={styles.textInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Username"
                    placeholderTextColor="#72767D"
                    autoCapitalize="none"
                />

                {/* Font Styles Selection */}
                <Text style={styles.inputLabel}>Unicode Font Style</Text>
                <View style={styles.fontSelectRow}>
                    {Object.keys(FONTS).concat(["none"]).map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.fontChip, fontStyle === f && styles.fontChipActive]}
                            onPress={() => setFontStyle(f)}
                        >
                            <Text style={[styles.fontChipText, fontStyle === f && styles.fontChipTextActive]}>
                                {f.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.inputLabel}>Avatar Image URL</Text>
                <TextInput
                    style={styles.textInput}
                    value={avatarUrl}
                    onChangeText={setAvatarUrl}
                    placeholder="https://example.com/avatar.png"
                    placeholderTextColor="#72767D"
                    autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Profile Banner URL</Text>
                <TextInput
                    style={styles.textInput}
                    value={bannerUrl}
                    onChangeText={setBannerUrl}
                    placeholder="https://example.com/banner.gif"
                    placeholderTextColor="#72767D"
                    autoCapitalize="none"
                />

                {/* Profile Custom Colors */}
                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>Primary Color</Text>
                        <TextInput
                            style={styles.textInput}
                            value={primaryColor}
                            onChangeText={setPrimaryColor}
                            placeholder="#5865f2"
                            placeholderTextColor="#72767D"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Accent Color</Text>
                        <TextInput
                            style={styles.textInput}
                            value={accentColor}
                            onChangeText={setAccentColor}
                            placeholder="#ffffff"
                            placeholderTextColor="#72767D"
                        />
                    </View>
                </View>

                {/* Decoration and Effects */}
                <Text style={styles.inputLabel}>Avatar Decoration URL</Text>
                <TextInput
                    style={styles.textInput}
                    value={avatarDecorationURL}
                    onChangeText={setAvatarDecorationURL}
                    placeholder="Decoration URL..."
                    placeholderTextColor="#72767D"
                    autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Profile Effect ID</Text>
                <TextInput
                    style={styles.textInput}
                    value={profileEffectId}
                    onChangeText={setProfileEffectId}
                    placeholder="Collectible Effect ID..."
                    placeholderTextColor="#72767D"
                    autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Pronouns</Text>
                <TextInput
                    style={styles.textInput}
                    value={pronouns}
                    onChangeText={setPronouns}
                    placeholder="they/them"
                    placeholderTextColor="#72767D"
                />

                <Text style={styles.inputLabel}>Biography (Bio)</Text>
                <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="About me..."
                    placeholderTextColor="#72767D"
                    multiline
                    numberOfLines={3}
                />
            </View>

            {/* Badges Visual Selector Grid */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>3. Official Badges Selector</Text>
                
                {BADGE_GROUPS.map((group) => (
                    <View key={group.category} style={{ marginBottom: 12 }}>
                        <Text style={styles.badgeGroupTitle}>{group.category}</Text>
                        <View style={styles.badgeSelectorGrid}>
                            {group.items.map((badge) => {
                                const isSelected = selectedBadges.some(b => b.iconSrc === badge.iconSrc);
                                return (
                                    <TouchableOpacity
                                        key={badge.iconSrc}
                                        style={[styles.badgeChip, isSelected && styles.badgeChipActive]}
                                        onPress={() => toggleBadge(badge)}
                                    >
                                        <Image source={{ uri: badge.iconSrc }} style={styles.badgeSelectorImg} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </View>

            {/* Custom Badges Section */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>4. Custom Badges</Text>
                
                <Text style={styles.inputLabel}>Badge Name / Tooltip</Text>
                <TextInput
                    style={styles.textInput}
                    value={customBadgeName}
                    onChangeText={setCustomBadgeName}
                    placeholder="E.g., Brooki Developer"
                    placeholderTextColor="#72767D"
                />

                <Text style={styles.inputLabel}>Badge Image URL</Text>
                <TextInput
                    style={styles.textInput}
                    value={customBadgeUrl}
                    onChangeText={setCustomBadgeUrl}
                    placeholder="https://example.com/badge.png"
                    placeholderTextColor="#72767D"
                    autoCapitalize="none"
                />

                <TouchableOpacity 
                    style={[styles.quickBtn, styles.quickBtnPurple, { width: "100%", marginBottom: 12 }]}
                    onPress={addCustomBadge}
                >
                    <Text style={styles.quickBtnText}>✨ Add Custom Badge</Text>
                </TouchableOpacity>

                {/* List of current custom badges */}
                {customBadges.length > 0 && (
                    <View style={styles.customBadgesList}>
                        <Text style={styles.inputLabel}>Added Custom Badges:</Text>
                        <View style={styles.customBadgeChipsContainer}>
                            {customBadges.map((badge, index) => (
                                <View key={index} style={styles.customBadgeChip}>
                                    <Image source={{ uri: badge.iconSrc }} style={styles.badgeSelectorImg} />
                                    <Text style={styles.customBadgeChipText}>{badge.name}</Text>
                                    <TouchableOpacity onPress={() => removeCustomBadge(index)}>
                                        <Text style={styles.removeBadgeText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
                style={styles.saveBtn}
                onPress={handleSave}
            >
                <Text style={styles.saveBtnText}>💾 Save Profiles Changes</Text>
            </TouchableOpacity>

            {/* Customized Users list */}
            {spoofedUsersList.length > 0 ? (
                <View style={[styles.card, { marginBottom: 40 }]}>
                    <Text style={styles.sectionTitle}>Active Customized Profiles</Text>
                    {spoofedUsersList.map((usr) => (
                        <View key={usr.id} style={styles.userRow}>
                            <Image 
                                source={{ uri: usr.avatarURL || "https://cdn.discordapp.com/embed/avatars/0.png" }} 
                                style={styles.listAvatar} 
                            />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.userNameText}>{usr.globalName || usr.username || "User"}</Text>
                                <Text style={styles.userIdText}>ID: {usr.id}</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.deleteBtn}
                                onPress={() => handleDelete(usr.id)}
                            >
                                <Text style={styles.deleteBtnText}>🗑️ Reset</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            ) : null}
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
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    cloneBtn: {
        backgroundColor: "#E84118",
        borderRadius: 10,
        paddingHorizontal: 16,
        justifyContent: "center",
        height: 42,
        marginLeft: 8,
    },
    cloneBtnText: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 13,
    },
    quickButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    quickBtn: {
        flex: 0.48,
        backgroundColor: "#3A3C43",
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
    },
    quickBtnPurple: {
        backgroundColor: "#5865F2",
    },
    quickBtnText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 12,
    },
    textInput: {
        backgroundColor: "#070809",
        borderRadius: 10,
        padding: 12,
        color: "#FFFFFF",
        fontSize: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 10,
    },
    textArea: {
        height: 70,
        textAlignVertical: "top",
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#8E9297",
        marginBottom: 6,
        textTransform: "uppercase",
        paddingLeft: 2,
    },
    fontSelectRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 14,
    },
    fontChip: {
        backgroundColor: "#1A1C20",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    fontChipActive: {
        backgroundColor: "#E84118",
        borderColor: "#E84118",
    },
    fontChipText: {
        fontSize: 9,
        color: "#B9BBBE",
        fontWeight: "bold",
    },
    fontChipTextActive: {
        color: "#FFF",
    },
    previewCard: {
        backgroundColor: "#18191c",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
        marginBottom: 20,
    },
    previewBanner: {
        height: 95,
        width: "100%",
        position: "relative",
    },
    previewBannerDefault: {
        backgroundColor: "#5865F2",
    },
    fullImage: {
        width: "100%",
        height: "100%",
    },
    previewInfo: {
        padding: 16,
        paddingTop: 36,
        position: "relative",
    },
    avatarWrapper: {
        position: "absolute",
        top: -36,
        left: 16,
        borderWidth: 5,
        borderColor: "#18191c",
        borderRadius: 39,
        overflow: "hidden",
    },
    previewAvatar: {
        width: 68,
        height: 68,
        backgroundColor: "#2F3136",
    },
    badgesRow: {
        flexDirection: "row",
        position: "absolute",
        top: 10,
        right: 16,
        backgroundColor: "#111214",
        borderRadius: 10,
        padding: 4,
        alignItems: "center",
        gap: 4,
    },
    previewBadgeImg: {
        width: 14,
        height: 14,
        resizeMode: "contain",
    },
    previewGlobalName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    previewUsername: {
        fontSize: 12,
        color: "#B9BBBE",
        marginTop: 2,
    },
    previewPronouns: {
        fontSize: 11,
        color: "#72767D",
        marginTop: 4,
        backgroundColor: "#2f3136",
        alignSelf: "flex-start",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    previewDivider: {
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        marginVertical: 14,
    },
    bioTitle: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#8E9297",
        marginBottom: 4,
    },
    bioText: {
        fontSize: 12,
        color: "#DDF1FF",
        lineHeight: 16,
    },
    badgeGroupTitle: {
        fontSize: 10,
        color: "#8E9297",
        fontWeight: "bold",
        marginBottom: 6,
        textTransform: "uppercase",
    },
    badgeSelectorGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    badgeChip: {
        backgroundColor: "#111214",
        padding: 6,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.03)",
    },
    badgeChipActive: {
        borderColor: "#E84118",
        backgroundColor: "rgba(232, 65, 24, 0.08)",
    },
    badgeSelectorImg: {
        width: 16,
        height: 16,
        resizeMode: "contain",
    },
    saveBtn: {
        backgroundColor: "#E84118",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 20,
    },
    saveBtnText: {
        color: "#FFFFFF",
        fontWeight: "900",
        fontSize: 14,
        letterSpacing: 0.5,
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#111214",
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
    },
    listAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#2F3136",
    },
    userNameText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 13,
    },
    userIdText: {
        color: "#72767D",
        fontSize: 10,
        marginTop: 2,
    },
    deleteBtn: {
        backgroundColor: "#EA2027",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    deleteBtnText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 10,
    },
    customBadgesList: {
        marginTop: 10,
    },
    customBadgeChipsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 4,
    },
    customBadgeChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#111214",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        gap: 6,
    },
    customBadgeChipText: {
        fontSize: 11,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    removeBadgeText: {
        fontSize: 12,
        color: "#EA2027",
        fontWeight: "bold",
        marginLeft: 4,
        paddingHorizontal: 2,
    }
});

// Patches Registry
let patches = [];

var plugin = {
    onLoad: () => {
        try {
            console.log("[EditUsersPro] Injecting client spoof hooks...");
            
            // 1. Hook UserStore.getUser to inject custom username, globalName, premiumType, and avatarDecoration
            if (UserStore) {
                patches.push(patcher.after("getUser", UserStore, (args, user) => {
                    if (user && storage.editUsers[user.id]) {
                        const custom = storage.editUsers[user.id];
                        if (custom.username) {
                            Object.defineProperty(user, "username", {
                                get: () => applyUnicodeFont(custom.username, custom.fontStyle),
                                configurable: true
                            });
                        }
                        if (custom.globalName) {
                            Object.defineProperty(user, "globalName", {
                                get: () => applyUnicodeFont(custom.globalName, custom.fontStyle),
                                configurable: true
                            });
                            Object.defineProperty(user, "global_name", {
                                get: () => applyUnicodeFont(custom.globalName, custom.fontStyle),
                                configurable: true
                            });
                        }
                        // Spoof Nitro
                        Object.defineProperty(user, "premiumType", {
                            get: () => 2,
                            configurable: true
                        });
                        
                        // Avatar Decoration
                        if (custom.avatarDecorationURL) {
                            Object.defineProperty(user, "avatarDecorationData", {
                                get: () => ({
                                    asset: custom.avatarDecorationURL,
                                    skuId: "editusers_custom"
                                }),
                                configurable: true
                            });
                        }
                    }
                    return user;
                }));

                patches.push(patcher.after("getCurrentUser", UserStore, (args, user) => {
                    if (user && storage.editUsers[user.id]) {
                        const custom = storage.editUsers[user.id];
                        if (custom.username) {
                            Object.defineProperty(user, "username", {
                                get: () => applyUnicodeFont(custom.username, custom.fontStyle),
                                configurable: true
                            });
                        }
                        if (custom.globalName) {
                            Object.defineProperty(user, "globalName", {
                                get: () => applyUnicodeFont(custom.globalName, custom.fontStyle),
                                configurable: true
                            });
                            Object.defineProperty(user, "global_name", {
                                get: () => applyUnicodeFont(custom.globalName, custom.fontStyle),
                                configurable: true
                            });
                        }
                        Object.defineProperty(user, "premiumType", {
                            get: () => 2,
                            configurable: true
                        });
                    }
                    return user;
                }));
            }

            // 2. Intercept avatar, banner and avatar decoration URLs
            if (IconUtils) {
                patches.push(patcher.instead("getUserAvatarURL", IconUtils, (args, orig) => {
                    const [user] = args;
                    if (user && user.id && storage.editUsers[user.id]?.avatarURL) {
                        return storage.editUsers[user.id].avatarURL;
                    }
                    return orig.apply(this, args);
                }));

                if (IconUtils.getUserBannerURL) {
                    patches.push(patcher.instead("getUserBannerURL", IconUtils, (args, orig) => {
                        const [user] = args;
                        const userId = user?.id || user;
                        if (userId && typeof userId === "string" && storage.editUsers[userId]?.bannerURL) {
                            return storage.editUsers[userId].bannerURL;
                        }
                        return orig.apply(this, args);
                    }));
                }

                if (IconUtils.getAvatarDecorationURL) {
                    patches.push(patcher.instead("getAvatarDecorationURL", IconUtils, (args, orig) => {
                        const [obj] = args;
                        const decorData = obj?.avatarDecoration || obj?.avatarDecorationData;
                        if (decorData && decorData.asset && (decorData.asset.startsWith("http") || decorData.asset.startsWith("data:"))) {
                            return decorData.asset;
                        }
                        return orig.apply(this, args);
                    }));
                }

                // Patch getBadgeIconURL to render external custom badge URLs
                if (IconUtils.getBadgeIconURL) {
                    patches.push(patcher.instead("getBadgeIconURL", IconUtils, (args, orig) => {
                        const [badge] = args;
                        const icon = badge?.icon || badge;
                        if (typeof icon === "string" && (icon.startsWith("http") || icon.startsWith("data:"))) {
                            return icon;
                        }
                        return orig.apply(this, args);
                    }));
                }
            }

            // 3. Inject bio, pronouns, themeColors, profileEffectId and custom badges
            if (UserProfileStore) {
                patches.push(patcher.after("getUserProfile", UserProfileStore, (args, res) => {
                    const [id] = args;
                    if (res && storage.editUsers[id]) {
                        const custom = storage.editUsers[id];
                        if (custom.bio) {
                            Object.defineProperty(res, "bio", {
                                get: () => custom.bio,
                                configurable: true
                            });
                        }
                        if (custom.pronouns) {
                            Object.defineProperty(res, "pronouns", {
                                get: () => custom.pronouns,
                                configurable: true
                            });
                        }
                        if (custom.profileEffectId) {
                            Object.defineProperty(res, "profileEffectId", {
                                get: () => custom.profileEffectId,
                                configurable: true
                            });
                        }

                        // Colors conversion hex -> dec
                        if (custom.primaryColor || custom.accentColor) {
                            const hexToDec = (hex) => {
                                const clean = (hex || "").replace("#", "").trim();
                                return clean ? parseInt(clean, 16) : 0;
                            };
                            Object.defineProperty(res, "themeColors", {
                                get: () => [hexToDec(custom.primaryColor), hexToDec(custom.accentColor)],
                                configurable: true
                            });
                        }

                        // Badges Injection
                        res.badges = res.badges || [];
                        const allBadges = [
                            ...(custom.officialBadges || []),
                            ...(custom.customBadges || [])
                        ];
                        for (const b of allBadges) {
                            if (!res.badges.some(existing => existing.description === b.name)) {
                                res.badges.push({
                                    id: b.name,
                                    description: b.name,
                                    icon: b.iconSrc
                                });
                            }
                        }
                    }
                    return res;
                }));
            }

        } catch (e) {
            console.error("[EditUsersPro] Loading error: ", e);
        }
    },
    onUnload: () => {
        console.log("[EditUsersPro] Restoring original profiles.");
        for (const unpatch of patches) {
            if (typeof unpatch === "function") unpatch();
        }
        patches = [];
    },
    settings: SettingsView
};
