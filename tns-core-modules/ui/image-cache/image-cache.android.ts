﻿import * as common from "./image-cache-common";
import * as trace from "../../trace";

var LruBitmapCacheClass;
function ensureLruBitmapCacheClass() {
    if (LruBitmapCacheClass) {
        return;
    }

    class LruBitmapCache extends android.util.LruCache<string, android.graphics.Bitmap> {
        constructor(cacheSize: number) {
            super(cacheSize);
            return global.__native(this);
        }

        public sizeOf(key: string, bitmap: android.graphics.Bitmap): number {
            // The cache size will be measured in kilobytes rather than
            // number of items.
            var result = Math.round(bitmap.getByteCount() / 1024);
            //console.log("sizeOf key: " + result);
            return result;
        }

        //protected entryRemoved(evicted: boolean, key: string, oldValue: android.graphics.Bitmap, newValue: android.graphics.Bitmap): void {
        //    console.log("entryRemoved("+evicted+", "+key+", "+oldValue+", "+newValue+")");
        //}
    };

    LruBitmapCacheClass = LruBitmapCache;
}

export class Cache extends common.Cache {
    private _callback: any;
    private _cache: android.util.LruCache<string, android.graphics.Bitmap>;

    constructor() {
        super();

        ensureLruBitmapCacheClass();
        var maxMemory = java.lang.Runtime.getRuntime().maxMemory() / 1024;
        var cacheSize = maxMemory / 8;
        this._cache = new LruBitmapCacheClass(cacheSize);

        var that = new WeakRef(this);
        this._callback = new org.nativescript.widgets.Async.CompleteCallback({
            onComplete: function (result: any, context: any) {
                var instance = that.get();
                if (instance) {
                    if (result) {
                        instance._onDownloadCompleted(context, result);
                    } else {
                        instance._onDownloadError(context, new Error("No result in CompletionCallback"));
                    }
                }
            },
            onError: function (err: string, context: any) {
                var instance = that.get();
                if (instance) {
                    instance._onDownloadError(context, new Error(err));
                }
            }
        });
    }

    public _downloadCore(request: common.DownloadRequest) {
        org.nativescript.widgets.Async.Image.download(request.url, this._callback, request.key);
    }

    public get(key: string): any {
        var result = this._cache.get(key);
        return result;
    }

    public set(key: string, image: any): void {
        try {
            if (key && image) {
                this._cache.put(key, image);
            }
        } catch (err) {
            trace.write("Cache set error: " + err, trace.categories.Error, trace.messageType.error);
        }
    }

    public remove(key: string): void {
        this._cache.remove(key);
    }

    public clear() {
        this._cache.evictAll();
    }
}
