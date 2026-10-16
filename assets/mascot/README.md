# Commuter mascot assets

Used only by ChatCo Commuter Mobile. Original user-supplied JPGs are preserved
unchanged in `references/`; the application uses the transparent PNGs.

Created with the built-in image generation tool (not the CLI). Each PNG was
generated in its own request and visually inspected before integration.

Prompt set: preserve the reference's fluffy round blue character, pale-blue
face/hands, two round-tipped antennae, navy conductor cap, navy cross-body
satchel, proportions and 3D fur. Full body on genuine transparency, centered
square with safe margins, no scene, text or watermark.

- greeting / phone / not-found: remove only the black background and floor
  shadow from the corresponding supplied reference, preserving pose and props.
- envelope: hold a cream envelope with a reassuring smile.
- key: hold a golden key for password recovery.
- reward: hold a blue/gold wrapped gift and raise the other hand in celebration.
- thanks: clasp both hands at chest height with a warm grateful smile.
- noticeboard: hold a cork board with a blank pinned note.
- offline: hold a phone showing crossed-out Wi-Fi; reassuring raised palm.

All production references use static Metro `require` calls in `Mascot.tsx`.
No remote image request, runtime image generation, or asset credential is used.

## Walkthrough action poses

Created with the built-in image generation tool using `mascot-phone.png` as the
character identity reference. Common prompt: preserve the fluffy royal-blue
character, pale-blue face/hands, two antennae, navy cap and satchel, friendly
3D fur; full body with props and safe margins; genuine transparency; no text,
backdrop, other characters or watermark.

- fleet-action: face right, hold a phone showing a map/vehicle pin, point toward
  the approaching jeep with the other hand and follow the finger with the eyes.
- scan-action: face left, lean forward, extend the phone toward the separate POS
  QR, steady it with the other hand; camera back visible; focused expression.
- guardian-action: grip a red protective shield with both hands, white check
  mark on shield, confidently guard the trip; no key or phone.
- vault-action: face right, lean forward, extend a gold-rimmed magnifying glass
  toward the recovered belongings; inspect through it, not a head-scratching pose.

The walkthrough now uses these cutouts as standalone hero mascots on subtle
topic-colored circles and rings. The previous SVG scenes and scene-specific
animation loops were removed at the user's request; original slide titles,
descriptions, storage key, and login/register destinations remain unchanged.

## Login boarding sequence

`mascot-boarding-sheet.png`: built-in image generation, using `mascot-phone.png`
as the character reference. Prompt: six equal cells in a 3-column/2-row sheet,
same blue furry mascot and white/blue Philippine jeepney, consistent camera;
approach open passenger doorway, grip handrail and lift foot onto step, climb,
enter behind door frame, sit inside behind glass, then wave. Preserve cap,
antennae and satchel; physical contact and occlusion; no labels or UI.
The resulting artwork includes a studio background (not a transparent cutout).
Playback uses complete rendered frames rather than pasted mascot overlays;
it is a six-pose sequence, not a fully rigged 3D/video animation.

### Refined boarding artwork (active)

`mascot-boarding-sheet-v2.png` is the active login asset; the original remains.
Created using the built-in image generation tool, editing the original sheet.
Prompt: preserve the exact 1536x1024 three-column/two-row layout, six boarding
poses, fixed camera, blue furry 3D mascot identity, navy cap and satchel;
soft neutral lighting, matte white/blue jeepney panels, restrained fur texture,
subtle contact shadows and dark navy background; remove neon headlights,
bloom, chrome sparkle, plastic-looking highlights and oversharpened fur;
keep doorway mechanics and character proportions consistent; no text or UI.
Login, session persistence and animation timing are unchanged.
