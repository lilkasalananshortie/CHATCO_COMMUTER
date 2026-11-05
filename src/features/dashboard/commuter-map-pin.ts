/** Same MDI account geometry and sizing as web components/maps/commuter-pin.ts.
 * See MDI_LICENSE.txt. */
export const COMMUTER_PIN_SIZE = 30;
export const COMMUTER_ACCOUNT_PATH = "M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z";

export function commuterLocationCss(isLight: boolean): string {
  return `
    .commuter-location-marker { width:30px;height:30px;background:#1A5FB4;border:2px solid #FFFFFF;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer; }
    .chatco-location-popup .leaflet-popup-content-wrapper { padding:0;border:1px solid ${isLight ? '#e5e7eb' : '#2a3a55'};border-radius:14px;background:${isLight ? '#FFFFFF' : '#0d192a'};overflow:hidden; }
    .chatco-location-popup .leaflet-popup-content { margin:0;font-family:Poppins,system-ui,sans-serif;font-size:12px;line-height:1.5;color:${isLight ? '#374151' : '#e2e8f0'}; }
    .chatco-location-popup .leaflet-popup-tip { background:${isLight ? '#FFFFFF' : '#0d192a'}; }
    .chatco-unit-popup .leaflet-popup-content-wrapper { padding:0;border:1px solid ${isLight ? '#e5e7eb' : '#2a3a55'};border-radius:14px;background:${isLight ? '#fff' : '#0d192a'};overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,.3); }
    .chatco-unit-popup .leaflet-popup-content { margin:0;max-width:calc(100vw - 48px);font-family:Poppins,system-ui,sans-serif;font-size:12px;line-height:1.5;color:${isLight ? '#374151' : '#e2e8f0'}; }
    .chatco-unit-popup .leaflet-popup-tip { background:${isLight ? '#fff' : '#0d192a'}; }
    .unit-popup { width:290px;max-width:calc(100vw - 48px); }
    .unit-popup-header { display:flex;align-items:center;gap:10px;padding:16px 16px 14px;border-bottom:1px solid ${isLight ? '#e5e7eb' : '#23344f'}; }
    .unit-popup-icon { flex-shrink:0;width:34px;height:34px;color:${isLight ? '#1a5fb4' : '#62a0ea'}; }
    .unit-popup-subtitle { color:${isLight ? '#6b7280' : '#94a3b8'};font-size:10px; }
    .unit-popup-title { margin-top:2px;color:${isLight ? '#111827' : '#f8fafc'};font-size:16px;font-weight:600;overflow-wrap:anywhere; }
    .unit-popup-body { padding:14px 16px 16px; }
    .unit-popup-status { text-align:center;font-size:13px;font-weight:600; }
    .unit-popup-status.success { color:${isLight ? '#047857' : '#86efac'}; }
    .unit-popup-status.warning { color:${isLight ? '#b45309' : '#fde68a'}; }
    .unit-popup-status.danger { color:${isLight ? '#b91c1c' : '#fca5a5'}; }
    .unit-popup-details { display:grid;gap:10px;margin-top:14px; }
    .unit-popup-row { display:grid;grid-template-columns:max-content auto;gap:16px;align-items:start; }
    .unit-popup-row span:first-child { color:${isLight ? '#6b7280' : '#94a3b8'}; }
    .unit-popup-row span:last-child { text-align:right;font-weight:500;overflow-wrap:anywhere; }
    .unit-popup-notes { margin-top:14px;padding-top:12px;border-top:1px solid ${isLight ? '#e5e7eb' : '#23344f'}; }
    .unit-popup-note { padding:8px 10px;border-radius:6px;font-size:11px; }
    .unit-popup-note.warning { color:${isLight ? '#b45309' : '#fde68a'};background:${isLight ? '#fffbeb' : 'rgba(234,179,8,.08)'}; }
    .unit-popup-note.danger { color:${isLight ? '#b91c1c' : '#fca5a5'};background:${isLight ? '#fef2f2' : 'rgba(239,68,68,.08)'}; }
    .commuter-popup-header { display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:16px 16px 14px;border-bottom:1px solid ${isLight ? '#e5e7eb' : '#23344f'}; }
    .commuter-popup-icon { width:34px;height:34px;fill:${isLight ? '#1a5fb4' : '#62a0ea'}; }
    .commuter-popup-subtitle { color:${isLight ? '#6b7280' : '#94a3b8'};font-size:10px; }
    .commuter-popup-title { margin-top:2px;color:${isLight ? '#111827' : '#f8fafc'};font-size:16px;font-weight:600; }
    .commuter-popup-status { display:block;text-align:center;font-size:13px;font-weight:600;padding:14px 16px 16px;color:${isLight ? '#1a5fb4' : '#8cb9f0'}; }
    .commuter-you-direction { position:absolute;z-index:1000;display:none;flex-direction:column;align-items:center;pointer-events:none;transform:translate(-50%,-50%); }
    .commuter-you-arrow { width:32px;height:32px;color:${isLight ? '#1A5FB4' : '#62A0EA'};filter:drop-shadow(0 4px 8px rgba(0,0,0,.7));animation:commuter-you-pulse 1.8s ease-in-out infinite; }
    .commuter-you-label { margin-top:4px;padding:2px 6px;border:1px solid rgba(255,255,255,.2);border-radius:6px;background:rgba(7,26,46,.9);box-shadow:0 4px 8px rgba(0,0,0,.35);color:#fff;font-size:9px;font-weight:700;line-height:1.25; }
    @keyframes commuter-you-pulse { 0%,100% { opacity:1; } 50% { opacity:.65; } }
  `;
}
