#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreVideo/CoreVideo.h>
#import <CoreMedia/CoreMedia.h>
#import <AudioToolbox/AudioToolbox.h>

#import "Fonts.h"
#import "LoaderConfig.h"
#import "Logger.h"
#import "Settings.h"
#import "Themes.h"
#import "Utils.h"

static NSURL         *source;
static NSString      *bunnyPatchesBundlePath;
static NSURL         *pyoncordDirectory;
static LoaderConfig  *loaderConfig;
static NSTimeInterval shakeStartTime = 0;
static BOOL           isShaking      = NO;
id                    gBridge        = nil;

%hook RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async
{
    if (![url.absoluteString containsString:@"main.jsbundle"])
    {
        return %orig;
    }

    gBridge = self;
    BunnyLog(@"Stored bridge reference: %@", gBridge);

    NSBundle *bunnyPatchesBundle = [NSBundle bundleWithPath:bunnyPatchesBundlePath];
    if (!bunnyPatchesBundle)
    {
        BunnyLog(@"Failed to load BunnyPatches bundle from path: %@", bunnyPatchesBundlePath);
        showErrorAlert(@"Loader Error",
                       @"Failed to initialize mod loader. Please reinstall the tweak.", nil);
        return %orig;
    }

    NSURL *patchPath = [bunnyPatchesBundle URLForResource:@"payload-base" withExtension:@"js"];
    if (!patchPath)
    {
        BunnyLog(@"Failed to find payload-base.js in bundle");
        showErrorAlert(@"Loader Error",
                       @"Failed to initialize mod loader. Please reinstall the tweak.", nil);
        return %orig;
    }

    NSData *patchData = [NSData dataWithContentsOfURL:patchPath];
    BunnyLog(@"Injecting loader");
    %orig(patchData, source, YES);

    __block NSData *bundle =
        [NSData dataWithContentsOfURL:[pyoncordDirectory URLByAppendingPathComponent:@"bundle.js"]];

    dispatch_group_t group = dispatch_group_create();
    dispatch_group_enter(group);

    NSURL *bundleUrl;
    if (loaderConfig.customLoadUrlEnabled && loaderConfig.customLoadUrl)
    {
        bundleUrl = loaderConfig.customLoadUrl;
        BunnyLog(@"Using custom load URL: %@", bundleUrl.absoluteString);
    }
    else
    {
        bundleUrl = [NSURL
            URLWithString:@"https://raw.githubusercontent.com/boop809/Brooki/main/dist/brooki.js"];
        BunnyLog(@"Using default bundle URL: %@", bundleUrl.absoluteString);
    }

    NSMutableURLRequest *bundleRequest =
        [NSMutableURLRequest requestWithURL:bundleUrl
                                cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                            timeoutInterval:3.0];

    NSString *bundleEtag = [NSString
        stringWithContentsOfURL:[pyoncordDirectory URLByAppendingPathComponent:@"etag.txt"]
                       encoding:NSUTF8StringEncoding
                          error:nil];
    if (bundleEtag && bundle)
    {
        [bundleRequest setValue:bundleEtag forHTTPHeaderField:@"If-None-Match"];
    }

    NSURLSession *session            = [NSURLSession
        sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]];
    __block BOOL  downloadSuccessful = NO;

    [[session
        dataTaskWithRequest:bundleRequest
          completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
              if ([response isKindOfClass:[NSHTTPURLResponse class]])
              {
                  NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *) response;
                  if (httpResponse.statusCode == 200 && data && data.length > 0)
                  {
                      bundle             = data;
                      downloadSuccessful = YES;
                      [bundle
                          writeToURL:[pyoncordDirectory URLByAppendingPathComponent:@"bundle.js"]
                          atomically:YES];

                      NSString *etag = [httpResponse.allHeaderFields objectForKey:@"Etag"];
                      if (etag)
                      {
                          [etag
                              writeToURL:[pyoncordDirectory URLByAppendingPathComponent:@"etag.txt"]
                              atomically:YES
                                encoding:NSUTF8StringEncoding
                                   error:nil];
                      }

                      BunnyLog(@"Bundle download successful, cleaning up backup");
                      cleanupBundleBackup();
                  }
                  else if (httpResponse.statusCode == 304)
                  {
                      BunnyLog(@"Bundle not modified (304), cleaning up backup");
                      downloadSuccessful = YES;
                      cleanupBundleBackup();
                  }
                  else
                  {
                      BunnyLog(@"Bundle download failed with status: %ld",
                               (long) httpResponse.statusCode);
                  }
              }
              else if (error)
              {
                  BunnyLog(@"Bundle download error: %@", error.localizedDescription);
              }

              if (!downloadSuccessful && !bundle)
              {
                  BunnyLog(@"No bundle available, attempting to restore from backup");
                  if (restoreBundleFromBackup())
                  {
                      bundle = [NSData
                          dataWithContentsOfURL:[pyoncordDirectory
                                                    URLByAppendingPathComponent:@"bundle.js"]];
                      if (bundle)
                      {
                          BunnyLog(@"Successfully restored bundle from backup");
                      }
                  }
                  else
                  {
                      BunnyLog(@"Failed to restore bundle from backup");
                  }
              }

              dispatch_group_leave(group);
          }] resume];

    dispatch_group_wait(group, DISPATCH_TIME_FOREVER);

    NSData *themeData =
        [NSData dataWithContentsOfURL:[pyoncordDirectory
                                          URLByAppendingPathComponent:@"current-theme.json"]];
    if (themeData)
    {
        NSError      *jsonError;
        NSDictionary *themeDict = [NSJSONSerialization JSONObjectWithData:themeData
                                                                  options:0
                                                                    error:&jsonError];
        if (!jsonError)
        {
            BunnyLog(@"Loading theme data...");
            if (themeDict[@"data"])
            {
                NSDictionary *data = themeDict[@"data"];
                if (data[@"semanticColors"] && data[@"rawColors"])
                {
                    BunnyLog(@"Initializing theme colors from theme data");
                    initializeThemeColors(data[@"semanticColors"], data[@"rawColors"]);
                }
            }

            NSString *jsCode =
                [NSString stringWithFormat:@"globalThis.__PYON_LOADER__.storedTheme=%@",
                                           [[NSString alloc] initWithData:themeData
                                                                 encoding:NSUTF8StringEncoding]];
            %orig([jsCode dataUsingEncoding:NSUTF8StringEncoding], source, async);
        }
        else
        {
            BunnyLog(@"Error parsing theme JSON: %@", jsonError);
        }
    }
    else
    {
        BunnyLog(@"No theme data found at path: %@",
                 [pyoncordDirectory URLByAppendingPathComponent:@"current-theme.json"]);
    }

    NSData *fontData = [NSData
        dataWithContentsOfURL:[pyoncordDirectory URLByAppendingPathComponent:@"fonts.json"]];
    if (fontData)
    {
        NSError      *jsonError;
        NSDictionary *fontDict = [NSJSONSerialization JSONObjectWithData:fontData
                                                                 options:0
                                                                   error:&jsonError];
        if (!jsonError && fontDict[@"main"])
        {
            BunnyLog(@"Found font configuration, applying...");
            patchFonts(fontDict[@"main"], fontDict[@"name"]);
        }
    }

    if (bundle)
    {
        BunnyLog(@"Executing JS bundle");
        %orig(bundle, source, async);
    }
    else
    {
        BunnyLog(@"ERROR: No bundle available to execute!");
        showErrorAlert(
            @"Bundle Error",
            @"Failed to load bundle. Please check your internet connection and restart the app.",
            nil);
    }

    NSURL *preloadsDirectory = [pyoncordDirectory URLByAppendingPathComponent:@"preloads"];
    if ([[NSFileManager defaultManager] fileExistsAtPath:preloadsDirectory.path])
    {
        NSError *error = nil;
        NSArray *contents =
            [[NSFileManager defaultManager] contentsOfDirectoryAtURL:preloadsDirectory
                                          includingPropertiesForKeys:nil
                                                             options:0
                                                               error:&error];
        if (!error)
        {
            for (NSURL *fileURL in contents)
            {
                if ([[fileURL pathExtension] isEqualToString:@"js"])
                {
                    BunnyLog(@"Executing preload JS file %@", fileURL.absoluteString);
                    NSData *data = [NSData dataWithContentsOfURL:fileURL];
                    if (data)
                    {
                        %orig(data, source, async);
                    }
                }
            }
        }
        else
        {
            BunnyLog(@"Error reading contents of preloads directory");
        }
    }

    %orig(script, url, async);
}

%end

static CVPixelBufferRef gFakeCamPixelBuffer = NULL;
static NSString *gFakeCamCurrentImageURL = nil;

static void updateFakeCamImage(NSString *urlString) {
    if (!urlString || urlString.length == 0) return;
    if ([urlString isEqualToString:gFakeCamCurrentImageURL] && gFakeCamPixelBuffer != NULL) return;
    
    @try {
        NSURL *url = [NSURL URLWithString:urlString];
        if ([urlString hasPrefix:@"/"] || [urlString hasPrefix:@"file:"]) {
            url = [NSURL fileURLWithPath:[urlString stringByReplacingOccurrencesOfString:@"file://" withString:@""]];
        }
        
        NSData *data = [NSData dataWithContentsOfURL:url];
        if (!data) return;
        
        UIImage *image = [UIImage imageWithData:data];
        if (!image) return;
        
        if (gFakeCamPixelBuffer != NULL) {
            CVPixelBufferRelease(gFakeCamPixelBuffer);
            gFakeCamPixelBuffer = NULL;
        }
        
        CGImageRef cgImage = image.CGImage;
        NSDictionary *options = @{
            (id)kCVPixelBufferCGImageCompatibilityKey: @YES,
            (id)kCVPixelBufferCGBitmapContextCompatibilityKey: @YES
        };
        
        size_t width = CGImageGetWidth(cgImage);
        size_t height = CGImageGetHeight(cgImage);
        
        CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, (__bridge CFDictionaryRef)options, &gFakeCamPixelBuffer);
        
        CVPixelBufferLockBaseAddress(gFakeCamPixelBuffer, 0);
        void *pxdata = CVPixelBufferGetBaseAddress(gFakeCamPixelBuffer);
        
        CGColorSpaceRef rgbColorSpace = CGColorSpaceCreateDeviceRGB();
        CGContextRef context = CGBitmapContextCreate(pxdata, width, height, 8, CVPixelBufferGetBytesPerRow(gFakeCamPixelBuffer), rgbColorSpace, kCGBitmapByteOrder32Little | kCGImageAlphaPremultipliedFirst);
        
        CGContextDrawImage(context, CGRectMake(0, 0, width, height), cgImage);
        
        CGColorSpaceRelease(rgbColorSpace);
        CGContextRelease(context);
        
        CVPixelBufferUnlockBaseAddress(gFakeCamPixelBuffer, 0);
        
        gFakeCamCurrentImageURL = urlString;
    } @catch (NSException *e) {
        BunnyLog(@"Error loading FakeCam image: %@", e);
    }
}

static CMSampleBufferRef createSampleBufferFromPixelBuffer(CVPixelBufferRef pixelBuffer, CMSampleBufferRef originalSampleBuffer) {
    CMSampleBufferRef newSampleBuffer = NULL;
    CMSampleTimingInfo timingInfo;
    
    OSStatus status = CMSampleBufferGetSampleTimingInfo(originalSampleBuffer, 0, &timingInfo);
    if (status != noErr) return NULL;
    
    CMVideoFormatDescriptionRef formatDescription = NULL;
    status = CMVideoFormatDescriptionCreateForImageBuffer(kCFAllocatorDefault, pixelBuffer, &formatDescription);
    if (status != noErr) return NULL;
    
    status = CMSampleBufferCreateForImageBuffer(kCFAllocatorDefault, pixelBuffer, YES, NULL, NULL, formatDescription, &timingInfo, &newSampleBuffer);
    
    CFRelease(formatDescription);
    
    if (status != noErr) return NULL;
    return newSampleBuffer;
}

%hook RTCCameraVideoCapturer

- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer fromConnection:(AVCaptureConnection *)connection {
    BOOL fakeCamEnabled = NO;
    NSString *fakeCamURL = nil;
    @try {
        NSURL *docDir = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].lastObject;
        NSURL *mmkvDir = [docDir URLByAppendingPathComponent:@"vd_mmkv"];
        
        NSFileManager *fm = [NSFileManager defaultManager];
        if ([fm fileExistsAtPath:mmkvDir.path]) {
            NSArray *files = [fm contentsOfDirectoryAtURL:mmkvDir includingPropertiesForKeys:nil options:0 error:nil];
            for (NSURL *fileURL in files) {
                NSString *filename = fileURL.lastPathComponent;
                if ([filename.lowercaseString containsString:@"fakecam"]) {
                    NSData *data = [NSData dataWithContentsOfURL:fileURL];
                    if (data) {
                        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
                        if ([dict isKindOfClass:[NSDictionary class]]) {
                            NSDictionary *fcDict = dict[@"fakeCam"];
                            if (fcDict) {
                                fakeCamEnabled = [[fcDict objectForKey:@"enabled"] boolValue];
                                fakeCamURL = [fcDict objectForKey:@"imageUrl"];
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        if (!fakeCamEnabled) {
            NSURL *settingsURL = [mmkvDir URLByAppendingPathComponent:@"VENDETTA_SETTINGS"];
            NSData *data = [NSData dataWithContentsOfURL:settingsURL];
            if (data) {
                NSDictionary *settings = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
                NSDictionary *plugins = settings[@"plugins"];
                if (plugins) {
                    for (NSString *key in plugins) {
                        if ([key.lowercaseString containsString:@"fakecam"]) {
                            NSDictionary *plStorage = plugins[key];
                            NSDictionary *fcDict = plStorage[@"fakeCam"];
                            if (fcDict) {
                                fakeCamEnabled = [[fcDict objectForKey:@"enabled"] boolValue];
                                fakeCamURL = [fcDict objectForKey:@"imageUrl"];
                                break;
                            }
                        }
                    }
                }
            }
        }
    } @catch (NSException *e) {
        BunnyLog(@"Error loading FakeCam settings: %@", e);
    }
    
    if (fakeCamEnabled && fakeCamURL && fakeCamURL.length > 0) {
        static dispatch_queue_t fakeCamQueue = nil;
        static dispatch_once_t onceToken;
        dispatch_once(&onceToken, ^{
            fakeCamQueue = dispatch_queue_create("com.brooki.fakecam", DISPATCH_QUEUE_SERIAL);
        });
        
        dispatch_async(fakeCamQueue, ^{
            updateFakeCamImage(fakeCamURL);
        });
        
        if (gFakeCamPixelBuffer != NULL) {
            CMSampleBufferRef fakeSampleBuffer = createSampleBufferFromPixelBuffer(gFakeCamPixelBuffer, sampleBuffer);
            if (fakeSampleBuffer != NULL) {
                %orig(output, fakeSampleBuffer, connection);
                CFRelease(fakeSampleBuffer);
                return;
            }
        }
    }
    
    %orig(output, sampleBuffer, connection);
}

%end

// Screen recording & recaudio settings check helper
static BOOL isScreenRecordBypassEnabled(void) {
    @try {
        NSURL *docDir = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].lastObject;
        NSURL *mmkvDir = [docDir URLByAppendingPathComponent:@"vd_mmkv"];
        
        // 1. Check separate plugin store files
        NSFileManager *fm = [NSFileManager defaultManager];
        if ([fm fileExistsAtPath:mmkvDir.path]) {
            NSArray *files = [fm contentsOfDirectoryAtURL:mmkvDir includingPropertiesForKeys:nil options:0 error:nil];
            for (NSURL *fileURL in files) {
                NSString *filename = fileURL.lastPathComponent;
                if ([filename.lowercaseString containsString:@"screenrecord"] || [filename.lowercaseString containsString:@"recaudio"]) {
                    NSData *data = [NSData dataWithContentsOfURL:fileURL];
                    if (data) {
                        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
                        if ([dict isKindOfClass:[NSDictionary class]]) {
                            NSDictionary *raDict = dict[@"recAudio"];
                            if (raDict) {
                                return [[raDict objectForKey:@"enabled"] boolValue];
                            }
                            if ([[dict objectForKey:@"enabled"] boolValue]) {
                                return YES;
                            }
                        }
                    }
                }
            }
        }
        
        // 2. Check inside VENDETTA_SETTINGS
        NSURL *settingsURL = [mmkvDir URLByAppendingPathComponent:@"VENDETTA_SETTINGS"];
        NSData *data = [NSData dataWithContentsOfURL:settingsURL];
        if (data) {
            NSDictionary *settings = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            if ([[settings objectForKey:@"screenRecordBypass"] boolValue]) {
                return YES;
            }
            NSDictionary *plugins = settings[@"plugins"];
            if (plugins) {
                for (NSString *key in plugins) {
                    if ([key.lowercaseString containsString:@"screenrecord"] || [key.lowercaseString containsString:@"recaudio"]) {
                        NSDictionary *plStorage = plugins[key];
                        NSDictionary *raDict = plStorage[@"recAudio"];
                        if (raDict && [[raDict objectForKey:@"enabled"] boolValue]) {
                            return YES;
                        }
                        if ([[plStorage objectForKey:@"enabled"] boolValue]) {
                            return YES;
                        }
                    }
                }
            }
        }
        
        // 3. Check inside VENDETTA_PLUGINS
        NSURL *pluginsURL = [mmkvDir URLByAppendingPathComponent:@"VENDETTA_PLUGINS"];
        NSData *pluginsData = [NSData dataWithContentsOfURL:pluginsURL];
        if (pluginsData) {
            NSDictionary *plugins = [NSJSONSerialization JSONObjectWithData:pluginsData options:0 error:nil];
            if ([plugins isKindOfClass:[NSDictionary class]]) {
                for (NSString *key in plugins) {
                    if ([key.lowercaseString containsString:@"screenrecord"] || [key.lowercaseString containsString:@"recaudio"]) {
                        NSDictionary *entry = plugins[key];
                        if ([entry isKindOfClass:[NSDictionary class]] && [[entry objectForKey:@"enabled"] boolValue]) {
                            return YES;
                        }
                    }
                }
            }
        }
    } @catch (NSException *e) {
        BunnyLog(@"Error checking screen record bypass: %@", e);
    }
    return NO;
}

// Voice Changer settings and state variables
static BOOL gVoiceChangerEnabled = NO;
static float gVoiceChangerPitch = 0.0f;
static float gVoiceChangerEcho = 0.0f;
static float gVoiceChangerReverb = 0.0f;

static void updateVoiceChangerSettings(void) {
    gVoiceChangerEnabled = NO;
    gVoiceChangerPitch = 0.0f;
    gVoiceChangerEcho = 0.0f;
    gVoiceChangerReverb = 0.0f;
    
    @try {
        NSURL *docDir = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].lastObject;
        NSURL *mmkvDir = [docDir URLByAppendingPathComponent:@"vd_mmkv"];
        
        // 1. Check separate plugin store files
        NSFileManager *fm = [NSFileManager defaultManager];
        if ([fm fileExistsAtPath:mmkvDir.path]) {
            NSArray *files = [fm contentsOfDirectoryAtURL:mmkvDir includingPropertiesForKeys:nil options:0 error:nil];
            for (NSURL *fileURL in files) {
                NSString *filename = fileURL.lastPathComponent;
                if ([filename.lowercaseString containsString:@"voicechanger"]) {
                    NSData *data = [NSData dataWithContentsOfURL:fileURL];
                    if (data) {
                        NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
                        if ([dict isKindOfClass:[NSDictionary class]]) {
                            NSDictionary *vcDict = dict[@"voiceChanger"];
                            if (vcDict) {
                                gVoiceChangerEnabled = [[vcDict objectForKey:@"enabled"] boolValue];
                                gVoiceChangerPitch = [[vcDict objectForKey:@"pitch"] floatValue];
                                gVoiceChangerEcho = [[vcDict objectForKey:@"echo"] floatValue];
                                gVoiceChangerReverb = [[vcDict objectForKey:@"reverb"] floatValue];
                                return;
                            }
                        }
                    }
                }
            }
        }
        
        // 2. Check inside VENDETTA_SETTINGS
        NSURL *settingsURL = [mmkvDir URLByAppendingPathComponent:@"VENDETTA_SETTINGS"];
        NSData *data = [NSData dataWithContentsOfURL:settingsURL];
        if (data) {
            NSDictionary *settings = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            NSDictionary *plugins = settings[@"plugins"];
            if (plugins) {
                for (NSString *key in plugins) {
                    if ([key.lowercaseString containsString:@"voicechanger"]) {
                        NSDictionary *plStorage = plugins[key];
                        NSDictionary *vcDict = plStorage[@"voiceChanger"];
                        if (vcDict) {
                            gVoiceChangerEnabled = [[vcDict objectForKey:@"enabled"] boolValue];
                            gVoiceChangerPitch = [[vcDict objectForKey:@"pitch"] floatValue];
                            gVoiceChangerEcho = [[vcDict objectForKey:@"echo"] floatValue];
                            gVoiceChangerReverb = [[vcDict objectForKey:@"reverb"] floatValue];
                            return;
                        }
                    }
                }
            }
        }
    } @catch (NSException *e) {
        BunnyLog(@"Error updating Voice Changer settings: %@", e);
    }
}

// DSP functions for Voice Changer
static float pitchShiftSample(float inputSample, float semitones) {
    if (semitones == 0.0f) return inputSample;
    
    float ratio = powf(2.0f, semitones / 12.0f);
    
    #define BUF_SIZE 8192
    #define WINDOW_SIZE 2048
    
    static float buffer[BUF_SIZE] = {0};
    static int writePos = 0;
    static float delay1 = 100.0f;
    static float delay2 = 100.0f + (WINDOW_SIZE / 2);
    
    buffer[writePos] = inputSample;
    
    float readIdx1 = (float)writePos - delay1;
    while (readIdx1 < 0) readIdx1 += BUF_SIZE;
    while (readIdx1 >= BUF_SIZE) readIdx1 -= BUF_SIZE;
    
    float readIdx2 = (float)writePos - delay2;
    while (readIdx2 < 0) readIdx2 += BUF_SIZE;
    while (readIdx2 >= BUF_SIZE) readIdx2 -= BUF_SIZE;
    
    int idx1 = (int)readIdx1;
    int next1 = (idx1 + 1) % BUF_SIZE;
    float frac1 = readIdx1 - idx1;
    float sample1 = (1.0f - frac1) * buffer[idx1] + frac1 * buffer[next1];
    
    int idx2 = (int)readIdx2;
    int next2 = (idx2 + 1) % BUF_SIZE;
    float frac2 = readIdx2 - idx2;
    float sample2 = (1.0f - frac2) * buffer[idx2] + frac2 * buffer[next2];
    
    float weight = (delay1 - 100.0f) / (float)WINDOW_SIZE;
    if (weight < 0.0f) weight = 0.0f;
    if (weight > 1.0f) weight = 1.0f;
    
    float outputSample = (1.0f - weight) * sample1 + weight * sample2;
    
    writePos = (writePos + 1) % BUF_SIZE;
    
    delay1 += (1.0f - ratio);
    delay2 += (1.0f - ratio);
    
    float minDelay = 100.0f;
    float maxDelay = 100.0f + WINDOW_SIZE;
    
    if (delay1 >= maxDelay) delay1 -= WINDOW_SIZE;
    if (delay1 < minDelay) delay1 += WINDOW_SIZE;
    
    if (delay2 >= maxDelay) delay2 -= WINDOW_SIZE;
    if (delay2 < minDelay) delay2 += WINDOW_SIZE;
    
    return outputSample;
}

static float applyEcho(float inputSample, float feedback) {
    if (feedback <= 0.0f) return inputSample;
    float fbValue = feedback / 100.0f;
    if (fbValue > 0.85f) fbValue = 0.85f;
    
    #define ECHO_BUF_SIZE 24000
    static float echoBuffer[ECHO_BUF_SIZE] = {0};
    static int echoWritePos = 0;
    
    int delaySamples = 12000;
    int echoReadPos = (echoWritePos - delaySamples + ECHO_BUF_SIZE) % ECHO_BUF_SIZE;
    
    float echoSample = echoBuffer[echoReadPos];
    float outputSample = inputSample + echoSample * fbValue;
    
    echoBuffer[echoWritePos] = inputSample + echoSample * fbValue * 0.5f;
    echoWritePos = (echoWritePos + 1) % ECHO_BUF_SIZE;
    
    return outputSample;
}

static float applyReverb(float inputSample, float level) {
    if (level <= 0.0f) return inputSample;
    float wet = level / 100.0f;
    if (wet > 0.8f) wet = 0.8f;
    
    #define REV_BUF_SIZE 8192
    static float revBuffer[REV_BUF_SIZE] = {0};
    static int revWritePos = 0;
    
    int tap1 = (revWritePos - 1200 + REV_BUF_SIZE) % REV_BUF_SIZE;
    int tap2 = (revWritePos - 2700 + REV_BUF_SIZE) % REV_BUF_SIZE;
    int tap3 = (revWritePos - 4300 + REV_BUF_SIZE) % REV_BUF_SIZE;
    
    float revSample = (revBuffer[tap1] * 0.4f + revBuffer[tap2] * 0.3f + revBuffer[tap3] * 0.2f);
    float outputSample = (1.0f - wet) * inputSample + wet * revSample;
    
    revBuffer[revWritePos] = inputSample + revSample * 0.4f;
    revWritePos = (revWritePos + 1) % REV_BUF_SIZE;
    
    return outputSample;
}

static void processAudioBuffer(int16_t *samples, UInt32 numFrames) {
    updateVoiceChangerSettings();
    if (!gVoiceChangerEnabled) return;
    
    for (UInt32 i = 0; i < numFrames; i++) {
        float floatSample = (float)samples[i] / 32768.0f;
        
        floatSample = pitchShiftSample(floatSample, gVoiceChangerPitch);
        floatSample = applyEcho(floatSample, gVoiceChangerEcho);
        floatSample = applyReverb(floatSample, gVoiceChangerReverb);
        
        if (floatSample > 1.0f) floatSample = 1.0f;
        else if (floatSample < -1.0f) floatSample = -1.0f;
        
        samples[i] = (int16_t)(floatSample * 32767.0f);
    }
}

// Hook AudioUnitRender to capture microphone input
%hookf(OSStatus, AudioUnitRender, AudioUnit inUnit, AudioUnitRenderActionFlags *ioActionFlags, const AudioTimeStamp *inTimeStamp, UInt32 inBusNumber, UInt32 inNumberFrames, AudioBufferList *ioData) {
    OSStatus status = %orig(inUnit, ioActionFlags, inTimeStamp, inBusNumber, inNumberFrames, ioData);
    if (status == noErr && ioData != NULL && inBusNumber == 1) {
        for (UInt32 i = 0; i < ioData->mNumberBuffers; i++) {
            AudioBuffer *buffer = &ioData->mBuffers[i];
            if (buffer->mData != NULL && buffer->mDataByteSize > 0) {
                int16_t *samples = (int16_t *)buffer->mData;
                UInt32 numSamples = buffer->mDataByteSize / sizeof(int16_t);
                processAudioBuffer(samples, numSamples);
            }
        }
    }
    return status;
}

%hook AVAudioSession

- (BOOL)setCategory:(NSString *)category error:(NSError **)outError
{
    BOOL screenRecordBypass = isScreenRecordBypassEnabled();
    if (screenRecordBypass && [category isEqualToString:@"AVAudioSessionCategoryPlayAndRecord"])
    {
        NSUInteger options = AVAudioSessionCategoryOptionMixWithOthers |
                             AVAudioSessionCategoryOptionDefaultToSpeaker |
                             AVAudioSessionCategoryOptionAllowBluetooth |
                             AVAudioSessionCategoryOptionAllowBluetoothA2DP |
                             AVAudioSessionCategoryOptionAllowAirPlay;
        return [self setCategory:category withOptions:options error:outError];
    }
    return %orig;
}

- (BOOL)setCategory:(NSString *)category withOptions:(NSUInteger)options error:(NSError **)outError
{
    BOOL screenRecordBypass = isScreenRecordBypassEnabled();
    if (screenRecordBypass && [category isEqualToString:@"AVAudioSessionCategoryPlayAndRecord"])
    {
        options |= AVAudioSessionCategoryOptionMixWithOthers;
        options |= AVAudioSessionCategoryOptionDefaultToSpeaker;
        options |= AVAudioSessionCategoryOptionAllowBluetooth;
        options |= AVAudioSessionCategoryOptionAllowBluetoothA2DP;
        options |= AVAudioSessionCategoryOptionAllowAirPlay;
    }
    return %orig(category, options, outError);
}

- (BOOL)setCategory:(NSString *)category mode:(NSString *)mode options:(NSUInteger)options error:(NSError **)outError
{
    BOOL screenRecordBypass = isScreenRecordBypassEnabled();
    if (screenRecordBypass && [category isEqualToString:@"AVAudioSessionCategoryPlayAndRecord"])
    {
        options |= AVAudioSessionCategoryOptionMixWithOthers;
        options |= AVAudioSessionCategoryOptionDefaultToSpeaker;
        options |= AVAudioSessionCategoryOptionAllowBluetooth;
        options |= AVAudioSessionCategoryOptionAllowBluetoothA2DP;
        options |= AVAudioSessionCategoryOptionAllowAirPlay;
    }
    return %orig(category, mode, options, outError);
}

%end

%hook UIWindow

- (void)motionBegan:(UIEventSubtype)motion withEvent:(UIEvent *)event
{
    if (motion == UIEventSubtypeMotionShake)
    {
        isShaking      = YES;
        shakeStartTime = [[NSDate date] timeIntervalSince1970];
    }
    %orig;
}

- (void)motionEnded:(UIEventSubtype)motion withEvent:(UIEvent *)event
{
    if (motion == UIEventSubtypeMotionShake && isShaking)
    {
        NSTimeInterval currentTime   = [[NSDate date] timeIntervalSince1970];
        NSTimeInterval shakeDuration = currentTime - shakeStartTime;

        if (shakeDuration >= 0.5 && shakeDuration <= 2.0)
        {
            dispatch_async(dispatch_get_main_queue(), ^{ showSettingsSheet(); });
        }
        isShaking = NO;
    }
    %orig;
}

%end

%ctor
{
    @autoreleasepool
    {
        source = [NSURL URLWithString:@"brooki"];

        NSString *install_prefix = @"/var/jb";
        isJailbroken             = [[NSFileManager defaultManager] fileExistsAtPath:install_prefix];
        BOOL jbPathExists        = [[NSFileManager defaultManager] fileExistsAtPath:install_prefix];

        NSString *bundlePath =
            [NSString stringWithFormat:@"%@/Library/Application Support/BunnyResources.bundle",
                                       install_prefix];
        BunnyLog(@"Is jailbroken: %d", isJailbroken);
        BunnyLog(@"Bundle path for jailbroken: %@", bundlePath);

        NSString *jailedPath = [[NSBundle mainBundle].bundleURL.path
            stringByAppendingPathComponent:@"BunnyResources.bundle"];
        BunnyLog(@"Bundle path for jailed: %@", jailedPath);

        bunnyPatchesBundlePath = isJailbroken ? bundlePath : jailedPath;
        BunnyLog(@"Selected bundle path: %@", bunnyPatchesBundlePath);

        BOOL bundleExists =
            [[NSFileManager defaultManager] fileExistsAtPath:bunnyPatchesBundlePath];
        BunnyLog(@"Bundle exists at path: %d", bundleExists);

        if (jbPathExists)
        {
            BunnyLog(@"Jailbreak path exists, attempting to load bundle from: %@", bundlePath);

            BOOL      bundleExists = [[NSFileManager defaultManager] fileExistsAtPath:bundlePath];
            NSBundle *testBundle   = [NSBundle bundleWithPath:bundlePath];

            if (bundleExists && testBundle)
            {
                bunnyPatchesBundlePath = bundlePath;
                BunnyLog(@"Successfully loaded bundle from jailbroken path");
            }
            else
            {
                BunnyLog(@"Bundle not found or invalid at jailbroken path, falling back to jailed");
                bunnyPatchesBundlePath = jailedPath;
            }
        }
        else
        {
            BunnyLog(@"Not jailbroken, using jailed bundle path");
            bunnyPatchesBundlePath = jailedPath;
        }

        BunnyLog(@"Selected bundle path: %@", bunnyPatchesBundlePath);

        NSBundle *bunnyPatchesBundle = [NSBundle bundleWithPath:bunnyPatchesBundlePath];
        if (!bunnyPatchesBundle)
        {
            BunnyLog(@"Failed to load bunnyPatches bundle from any path");
            BunnyLog(@"  Jailbroken path: %@", bundlePath);
            BunnyLog(@"  Jailed path: %@", jailedPath);
            BunnyLog(@"  /var/jb exists: %d", jbPathExists);

            bunnyPatchesBundlePath = nil;
        }
        else
        {
            BunnyLog(@"Bundle loaded successfully");
            NSError *error = nil;
            NSArray *bundleContents =
                [[NSFileManager defaultManager] contentsOfDirectoryAtPath:bunnyPatchesBundlePath
                                                                    error:&error];
            if (error)
            {
                BunnyLog(@"Error listing bundle contents: %@", error);
            }
            else
            {
                BunnyLog(@"Bundle contents: %@", bundleContents);
            }
        }

        pyoncordDirectory = getPyoncordDirectory();
        loaderConfig      = [[LoaderConfig alloc] init];
        [loaderConfig loadConfig];

        @try {
            NSURL *docDir = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].lastObject;
            NSURL *mmkvDir = [docDir URLByAppendingPathComponent:@"vd_mmkv"];
            NSURL *pluginsSettingsURL = [mmkvDir URLByAppendingPathComponent:@"VENDETTA_PLUGINS"];
            
            NSString *bundledPluginsPath = [bunnyPatchesBundlePath stringByAppendingPathComponent:@"VENDETTA_PLUGINS"];
            if ([[NSFileManager defaultManager] fileExistsAtPath:bundledPluginsPath]) {
                NSData *bundledData = [NSData dataWithContentsOfFile:bundledPluginsPath];
                if (bundledData) {
                    NSDictionary *bundledDict = [NSJSONSerialization JSONObjectWithData:bundledData options:0 error:nil];
                    if (bundledDict && [bundledDict isKindOfClass:[NSDictionary class]]) {
                        NSMutableDictionary *mergedDict = [NSMutableDictionary dictionary];
                        
                        if ([[NSFileManager defaultManager] fileExistsAtPath:pluginsSettingsURL.path]) {
                            NSData *existingData = [NSData dataWithContentsOfURL:pluginsSettingsURL];
                            if (existingData) {
                                NSDictionary *existingDict = [NSJSONSerialization JSONObjectWithData:existingData options:0 error:nil];
                                if (existingDict && [existingDict isKindOfClass:[NSDictionary class]]) {
                                    [mergedDict addEntriesFromDictionary:existingDict];
                                }
                            }
                        }
                        
                        NSString* (^normalizeID)(NSString*) = ^NSString*(NSString *idStr) {
                            if (!idStr) return @"";
                            NSString *norm = [idStr lowercaseString];
                            if ([norm hasSuffix:@"/"]) norm = [norm substringToIndex:norm.length - 1];
                            norm = [norm stringByReplacingOccurrencesOfString:@"/manifest.json" withString:@""];
                            return norm;
                        };

                        for (NSString *bundledKey in bundledDict) {
                            NSDictionary *bundledPlugin = bundledDict[bundledKey];
                            NSString *bundledNorm = normalizeID(bundledKey);
                            
                            NSString *matchedExistingKey = nil;
                            NSDictionary *existingPlugin = nil;
                            
                            for (NSString *existingKey in [mergedDict allKeys]) {
                                if ([normalizeID(existingKey) isEqualToString:bundledNorm]) {
                                    matchedExistingKey = existingKey;
                                    existingPlugin = mergedDict[existingKey];
                                    break;
                                }
                            }
                            
                            NSMutableDictionary *newPlugin = [bundledPlugin mutableCopy];
                            if (existingPlugin) {
                                newPlugin[@"enabled"] = existingPlugin[@"enabled"];
                                if (matchedExistingKey) {
                                    [mergedDict removeObjectForKey:matchedExistingKey];
                                }
                            }
                            mergedDict[bundledKey] = newPlugin;
                        }
                        
                        [[NSFileManager defaultManager] createDirectoryAtURL:mmkvDir withIntermediateDirectories:YES attributes:nil error:nil];
                        NSData *mergedData = [NSJSONSerialization dataWithJSONObject:mergedDict options:NSJSONWritingPrettyPrinted error:nil];
                        if (mergedData) {
                            [mergedData writeToURL:pluginsSettingsURL atomically:YES];
                            BunnyLog(@"Successfully updated and merged bundled plugins in vd_mmkv/VENDETTA_PLUGINS");
                        }
                    }
                }
            } else {
                BunnyLog(@"Bundled VENDETTA_PLUGINS not found at: %@", bundledPluginsPath);
            }
        } @catch (NSException *exception) {
            BunnyLog(@"Exception during plugin merge: %@", exception);
        }

        %init;
    }
}
