#import <Foundation/Foundation.h>
#import <ReplayKit/ReplayKit.h>
#import <Photos/Photos.h>
#import "Logger.h"

// Declare React Native RCTBridgeModule protocol and registration functions manually
// so we don't depend on React framework headers at build time.
@protocol RCTBridgeModule <NSObject>
+ (NSString *)moduleName;
@optional
- (dispatch_queue_t)methodQueue;
@end

typedef struct RCTMethodInfo {
  const char *jsName;
  const char *objcName;
  BOOL isSync;
} RCTMethodInfo;

typedef void (^RCTPromiseResolveBlock)(id result);
typedef void (^RCTPromiseRejectBlock)(NSString *code, NSString *message, NSError *error);

extern void RCTRegisterModule(Class);

@interface RecAudioRecorder : NSObject <RCTBridgeModule>
@end

@implementation RecAudioRecorder

+ (NSString *)moduleName {
    return @"RecAudioRecorder";
}

+ (void)load {
    RCTRegisterModule(self);
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

// 1. Export startRecording method
+ (const RCTMethodInfo *)__rct_export__startRecording {
    static RCTMethodInfo config = {
        "",
        "startRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject",
        NO
    };
    return &config;
}

- (void)startRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    BunnyLog(@"[RecAudioRecorder] startRecording called");
    
    RPScreenRecorder *recorder = [RPScreenRecorder sharedRecorder];
    if (recorder.isRecording) {
        resolve(@NO);
        return;
    }
    
    // Check permission
    PHAuthorizationStatus status = [PHPhotoLibrary authorizationStatus];
    if (status == PHAuthorizationStatusAuthorized) {
        [self performStartRecording:resolve rejecter:reject];
    } else if (status == PHAuthorizationStatusNotDetermined) {
        [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus newStatus) {
            dispatch_async(dispatch_get_main_queue(), ^{
                if (newStatus == PHAuthorizationStatusAuthorized) {
                    [self performStartRecording:resolve rejecter:reject];
                } else {
                    reject(@"permission_denied", @"Photo Library access is required to save recorded videos.", nil);
                }
            });
        }];
    } else {
        if (@available(iOS 14.0, *)) {
            PHAuthorizationStatus levelStatus = [PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelAddOnly];
            if (levelStatus == PHAuthorizationStatusAuthorized || levelStatus == PHAuthorizationStatusLimited) {
                [self performStartRecording:resolve rejecter:reject];
                return;
            }
        }
        reject(@"permission_denied", @"Photo Library access is required to save recorded videos.", nil);
    }
}

- (void)performStartRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    RPScreenRecorder *recorder = [RPScreenRecorder sharedRecorder];
    recorder.microphoneEnabled = YES;
    
    [recorder startRecordingWithHandler:^(NSError * _Nullable error) {
        if (error) {
            BunnyLog(@"[RecAudioRecorder] failed to start recording: %@", error);
            reject(@"start_failed", error.localizedDescription, error);
        } else {
            BunnyLog(@"[RecAudioRecorder] recording started successfully");
            resolve(@YES);
        }
    }];
}

// 2. Export stopRecording method
+ (const RCTMethodInfo *)__rct_export__stopRecording {
    static RCTMethodInfo config = {
        "",
        "stopRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject",
        NO
    };
    return &config;
}

- (void)stopRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    BunnyLog(@"[RecAudioRecorder] stopRecording called");
    
    RPScreenRecorder *recorder = [RPScreenRecorder sharedRecorder];
    if (!recorder.isRecording) {
        resolve(@NO);
        return;
    }
    
    // Create temporary file path in Documents/
    NSURL *docDir = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].lastObject;
    NSString *fileName = [NSString stringWithFormat:@"RecAudio-%ld.mp4", (long)[[NSDate date] timeIntervalSince1970]];
    NSURL *outputURL = [docDir URLByAppendingPathComponent:fileName];
    
    // Delete if already exists
    [[NSFileManager defaultManager] removeItemAtURL:outputURL error:nil];
    
    if (@available(iOS 14.0, *)) {
        [recorder stopRecordingWithOutputURL:outputURL completionHandler:^(NSError * _Nullable error) {
            if (error) {
                BunnyLog(@"[RecAudioRecorder] stopRecording failed: %@", error);
                reject(@"stop_failed", error.localizedDescription, error);
                return;
            }
            
            BunnyLog(@"[RecAudioRecorder] stopped recording. Saving to photo album: %@", outputURL.path);
            
            [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
                [PHAssetChangeRequest creationRequestForAssetFromVideoAtFileURL:outputURL];
            } completionHandler:^(BOOL success, NSError * _Nullable phError) {
                // Remove the temp file
                [[NSFileManager defaultManager] removeItemAtURL:outputURL error:nil];
                
                dispatch_async(dispatch_get_main_queue(), ^{
                    if (success) {
                        BunnyLog(@"[RecAudioRecorder] saved successfully to album");
                        resolve(@YES);
                    } else {
                        BunnyLog(@"[RecAudioRecorder] failed to save to album: %@", phError);
                        reject(@"save_failed", phError ? phError.localizedDescription : @"Failed to save to Photos", phError);
                    }
                });
            }];
        }];
    } else {
        // Fallback for older iOS versions using preview path
        [recorder stopRecordingWithHandler:^(RPPreviewViewController * _Nullable previewViewController, NSError * _Nullable error) {
            if (error) {
                reject(@"stop_failed", error.localizedDescription, error);
                return;
            }
            resolve(@YES);
        }];
    }
}

// 3. Export isRecording method
+ (const RCTMethodInfo *)__rct_export__isRecording {
    static RCTMethodInfo config = {
        "",
        "isRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject",
        NO
    };
    return &config;
}

- (void)isRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    resolve(@([RPScreenRecorder sharedRecorder].isRecording));
}

@end
