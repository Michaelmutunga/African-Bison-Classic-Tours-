# Imagery (cinematic revamp)

Source: 95 client-supplied files in `incoming/` (never committed).
Processed: 92 photos to `public/images/` (max 1800px long edge, EXIF/GPS
stripped, quality-82 JPEG, 14.8 MB total) plus the transparent brand
logo as PNG with alpha preserved. No stock, no hotlinking, no remote
hosts. CSP keeps `media-src 'self'` unchanged.

## Drop points

- Hero video: `public/video/hero.mp4` — RECEIVED at 9.2 MB, down from
  18.4 MB. Still over the 5 MB budget; if you can squeeze once more:
  `ffmpeg -i in.mp4 -an -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow -movflags +faststart public/video/hero.mp4`
  Poster `public/images/hero/hero-poster.jpg` currently reuses the hero
  still; replace with a real video frame when compressing.
- Photo originals: `incoming/` (repo root, git-ignored).
- Manifest: `lib/imagery.ts` (`IMAGES` registry, rebuilt by
  `scripts/process-imagery.mjs`). Helpers `imageForTour`,
  `imageForDestination`, `imageForPost`, `imageForSlot`,
  `imagesForSlot`, `imageById` all return `null`/empty until files land.

## Location confirmations (from supplied filenames)

Manyara, Ngorongoro, Tarangire, Aberdare, Bwindi, Queen Elizabeth,
Bomas, Sheldrick, Carnivore, Giraffe Centre and museum naming are all
confirmed by the filenames, so destination and experience slots use
real park names. Generic images never imply a park they do not show:
Lake Bogoria, Naivasha, Samburu, Tsavo and Kilimanjaro have no photo
and keep the intentional placeholder.

## Placement (processed file, slot, credit)

| File | Slot | Credit |
|---|---|---|
| hero/balloon-basket-sunrise.jpg | hero.primary + hero.sky | African Bison // TODO confirm credit |
| hero/balloon-over-herds.jpg | closing.background | African Bison // TODO confirm credit |
| hero/savanna-sunset-encounter.jpg | statement.break + hero.sunset | African Bison // TODO confirm credit |
| hero/migration-river-sunset.jpg | migration.scene + hero.savannah | African Bison // TODO confirm credit |
| tours/mara-zebras-dusk.jpg | kenya, masai-mara + hero.wildlife | African Bison // TODO confirm credit |
| tours/mara-migration-descent.jpg | kenya-tanzania | African Bison // TODO confirm credit |
| tours/mara-game-drive-herd.jpg | kenya | African Bison // TODO confirm credit |
| tours/serengeti-river-crossing.jpg | tanzania, kenya-tanzania, serengeti | African Bison // TODO confirm credit |
| tours/serengeti-zebra-river.jpg | tanzania | Cem Sural // TODO confirm licence (signature in frame) |
| tours/mara-lion-vehicle.jpg | kenya | African Bison // TODO confirm credit |
| tours/mara-lion-pride.jpg | kenya | African Bison // TODO confirm credit |
| tours/mara-zebras-dusk.jpg | kenya, masai-mara | African Bison // TODO confirm credit |
| tours/serengeti-gate.jpg | tanzania | African Bison // TODO confirm credit (third-party wheel covers visible) |
| tours/serengeti-game-drive.jpg | tanzania | African Bison // TODO confirm credit |
| tours/serengeti-plains.jpg | tanzania | African Bison // TODO confirm credit |
| tours/mara-plains-1/2/3.jpg | kenya | African Bison // TODO confirm credit |
| tours/amboseli-scene-1/2.jpg | kenya (+nairobi-day for scene-2) | African Bison // TODO confirm credit |
| destinations/amboseli-elephants-egrets.jpg | amboseli | African Bison // TODO confirm credit |
| destinations/manyara-flamingo-lake.jpg | lake-manyara | African Bison // TODO confirm credit |
| destinations/nakuru-buffalo-flamingos.jpg + nakuru-wildlife-2/3/4.jpg | lake-nakuru | African Bison // TODO confirm credit |
| destinations/ngorongoro-crater-aerial.jpg | ngorongoro | African Bison // TODO confirm credit |
| destinations/tarangire-river-elephants.jpg | tarangire | African Bison // TODO confirm credit |
| destinations/aberdare-moorland-hikers.jpg + highlands-1/2/3.jpg | aberdares | African Bison // TODO confirm credit |
| experiences/giraffe-centre-sign/feeding-platform/hand-feeding.jpg | giraffe-centre | African Bison // TODO confirm credit |
| experiences/sheldrick-bottle-feeding/calf-line/calf-bottle/calf-visitors.jpg | sheldrick-elephant-orphanage | African Bison // TODO confirm credit (Trust logo on one coat) |
| experiences/nairobi-museum-entrance/culture.jpg | nairobi-national-museum (+nairobi destination) | African Bison // TODO confirm credit |
| experiences/bomas-dancers/dancers-costume/auditorium.jpg | bomas-of-kenya | African Bison // TODO confirm credit |
| experiences/carnivore-carver/service.jpg | carnivore-restaurant | African Bison // TODO confirm credit |
| journal/mara-bush-meal/bush-picnic/bush-breakfast-table/mara-sundowner.jpg | journal.generic | African Bison // TODO confirm credit |
| journal/queen-elizabeth-shoreline/1/2.jpg | journal.generic | African Bison // TODO confirm credit (no Uganda product, journal only) |
| journal/bwindi-trek/forest-1/2/3.jpg | journal.generic | African Bison // TODO confirm credit (journal only, never imply gorilla trekking tours) |
| destinations/samburu-road-aerial.jpg | samburu | African Bison // TODO confirm credit |
| journal/samburu-buffalo-springs/reserve-1/reserve-2.jpg | journal.generic | African Bison // TODO confirm credit |
| experiences/nairobi-park-lion-vehicles/drive/wildlife.jpg | nairobi-national-park | African Bison // TODO confirm credit |
| destinations/naivasha-boat-ride.jpg + naivasha-lake.jpg | lake-naivasha | African Bison // TODO confirm credit |
| destinations/tsavo-east/west-elephants.jpg | tsavo-east, tsavo-west | African Bison // TODO confirm credit |
| journal/tsavo-scene.jpg | journal.generic | African Bison // TODO confirm credit |
| destinations/kilimanjaro-summit/uhuru-sign/mountain.jpg | kilimanjaro | African Bison // TODO confirm credit |
| journal/zanzibar-salaam-turtles/stone-town/island.jpg | journal.generic | African Bison // TODO confirm credit (no beach product, journal only) |
| journal/vehicle-interior-track/interior/guests-roof.jpg | journal.generic | African Bison // TODO confirm credit (fleet and builder use later) |
| journal/group-serengeti-sign/travellers-safari-2/3.jpg | journal.generic | African Bison // TODO confirm credit (group travel use) |
| journal/lodge-deck-elephants/lounge/deck-sunset/pool/bedroom.jpg | stay/* + journal.generic | African Bison // TODO confirm credit (do not name the lodge) |
| journal/honeymoon-roof/dinner/pool.jpg | stay/honeymoon* + journal.generic | African Bison // TODO confirm credit |
| texture/night-dinner/stars.jpg | texture/* + journal.generic | African Bison // TODO confirm credit |
| experiences/nairobi-museum-hall.jpg | nairobi-national-museum | African Bison // TODO confirm credit (clean, watermark-free) |
| journal/guide-portrait.jpg | team/guide + journal.generic | African Bison // TODO confirm credit |
| brand/logo.png | original transparent artwork (unregistered) | Client artwork, alpha preserved |
| brand/logo-192.png | header orbital badge + footer badge (192px, alpha preserved) | Resized from the transparent original, EXIF stripped |

Alt text for every image lives in `lib/imagery.ts`.

## Excluded (stays in incoming/, never committed)

- `Exhibit 1 inside the museum.jpg`: third-party "Beads Safaris
  Collection" watermark baked in. Needs a clean export.
- `African Bison Classic Tours Logo.jfif`: checkerboard background
  baked into pixels (JFIF has no transparency). Needs a transparent
  PNG export. Reference copy at `images/brand/logo-reference.jpg`.
- `Guide potrait.png`: 0-byte file, superseded by the re-sent
  `Guide potrait.jpg`.

## Still needing photography

Nothing on the shot list is outstanding. Every slot has photography:
lodge interiors, guide portrait, night skies, honeymoon moments, clean
museum hall, transparent logo, Nairobi National Park, Naivasha boat,
Samburu, Tsavo East and West, Kilimanjaro summit and Uhuru sign,
Zanzibar turtles and Stone Town, vehicle interiors, family and group
moments. Only Lake Bogoria, Ol Pejeta and Kilimanjaro-as-destination
detail beyond the summit remain imageless by choice rather than borrowing
a wrong park's photo.
