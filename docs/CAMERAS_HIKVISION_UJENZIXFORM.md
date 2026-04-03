# Hikvision-style solar / 4G cameras and UjenziXform Monitoring

UjenziXform **does not** run RTSP inside the browser. It **does** support:

- **HTTPS** direct video (e.g. `.mp4`, `.webm`) where the host allows cross-origin playback
- **HLS** (`.m3u8`) via the in-app player
- **YouTube / Vimeo** page URLs (embedded)
- **Vendor iframe HTML** pasted into the admin camera **Embed code** field

## What to put in Admin → Monitoring

1. **Preferred:** A stable **HTTPS HLS** URL from your NVR, cloud relay, or on-site **MediaMTX** (see [MONITORING_STREAMING_IMPLEMENTATION_STEPS.md](./MONITORING_STREAMING_IMPLEMENTATION_STEPS.md) and [examples/mediamtx-rtsp-to-hls/README.md](./examples/mediamtx-rtsp-to-hls/README.md)).
2. **Alternative:** If the vendor gives a **web viewer** or **iframe snippet** (Hik-Connect style), choose **Embed code** and paste the iframe HTML.
3. **Connection type:** Use **Solar / 4G IP** when the camera is on cellular; it is the same as “Web link” for playback but shows setup hints in admin.

## RTSP from the camera

Many Hikvision devices expose **main** and **sub** streams (e.g. channel `101` / `102`). Browsers still cannot play `rtsp://` URLs. For **site-vision workers** and bandwidth, prefer the **sub-stream** RTSP in your relay; for **Monitoring**, store the resulting **HLS** or **embed**, not raw RTSP.

## Regional / SIM (e.g. Kenya)

Confirm the **SKU / modem variant** matches local **LTE bands** and your carrier. That is procurement and field setup, not an app change.

## Product boundaries

Native **Hik-Connect API**, **ISAPI** tunneling, or **signed URL refresh** are **not** implemented in the web app today. If you need that, plan a small gateway service and treat it as infrastructure (see [INFRA_VENDOR_ML_BOUNDARIES.md](./INFRA_VENDOR_ML_BOUNDARIES.md)).
