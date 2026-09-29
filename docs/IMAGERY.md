# Imagery (cinematic revamp)

Source: 58 client-attached photos including the logo. No stock, no
hotlinking, no remote hosts. CSP keeps `media-src 'self'` and
`img-src 'self' data: https:` unchanged.

## Drop points (your addresses)

- Hero video: `public/video/hero.mp4` (optional `hero.webm`,
  poster `public/images/hero/hero-poster.jpg`). No video yet, so the
  hero runs the still fallback with a slow Ken Burns zoom and upgrades
  automatically once the file exists. No code change needed.
- Video spec: no audio track, about 1280px wide, 24fps, under 4 MB
  per file (warn if over 5 MB):
  `ffmpeg -i in.mp4 -an -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow -movflags +faststart public/video/hero.mp4`
- Photo originals: drop into `incoming/` (repo root, never committed).
  Processed files go to `public/images/{hero,destinations,tours,
  experiences,journal,texture}/` with kebab-case names, max 2400px on
  the long edge, EXIF/GPS stripped, reasonably small.
- Manifest: `lib/imagery.ts` (`IMAGES` registry + `SLOT_PLAN`).
  Helpers `imageForTour`, `imageForDestination`, `imageForPost`,
  `imageForSlot`, `imageById` all return `null` until files land.

## Placement plan

| File | Slot | Alt text | Credit |
|---|---|---|---|
| hero/balloon-basket-sunrise.jpg | hero.primary | Hot air balloon basket over wildebeest and zebra herds at sunrise | African Bison Classic Tours // TODO confirm credit |
| hero/giraffe-zebra-vehicle-sunset.jpg | hero.alternate | Giraffes and zebras beside a safari vehicle at sunset | African Bison Classic Tours // TODO confirm credit |
| hero/migration-aerial-vehicle.jpg | statement.break | Safari vehicle on a track beside wildebeest and zebra herds | African Bison Classic Tours // TODO confirm credit |
| tours/migration-river-crossing-sunset.jpg | migration.scene | Wildebeest crossing a river at sunset, seen from above | African Bison Classic Tours // TODO confirm credit |
| tours/migration-river-bank-line.jpg | tours/category/kenya-tanzania | Wildebeest walking a rocky riverbank during migration season | African Bison Classic Tours // TODO confirm credit |
| tours/migration-dust-descent.jpg | tours/category/kenya-tanzania | Wildebeest descending a dusty bank toward a river | African Bison Classic Tours // TODO confirm credit |
| tours/migration-splash-closeup.jpg | tours/category/kenya-tanzania | Wildebeest splashing through river water at close range | African Bison Classic Tours // TODO confirm credit |
| tours/balloon-over-herds.jpg | tours/category/kenya-tanzania | Hot air balloon drifting over wildebeest herds | African Bison Classic Tours // TODO confirm credit |
| tours/balloons-launch-5y-zjr.jpg | tours/category/kenya | Hot air balloons inflating beside safari vehicles at dawn | African Bison Classic Tours // TODO confirm credit |
| tours/lion-vehicle-plains.jpg | tours/category/kenya | Male lion standing on open plains near a safari vehicle | African Bison Classic Tours // TODO confirm credit |
| tours/lion-pride-vehicle.jpg | tours/category/kenya | Lion pride resting in green grass beside a safari vehicle | African Bison Classic Tours // TODO confirm credit |
| tours/zebra-vehicle-dusk.jpg | tours/category/kenya | Zebras walking past a safari vehicle with guests at dusk | African Bison Classic Tours // TODO confirm credit |
| tours/zebra-river-signed.jpg | journal.generic | Zebra herd wading through a shallow river under acacia trees | Confirm credit, signature visible in source |
| tours/bush-breakfast-guests.jpg | journal.generic | Guests eating breakfast outdoors beside a safari vehicle | African Bison Classic Tours // TODO confirm credit |
| tours/bush-breakfast-spread.jpg | journal.generic | Bush breakfast spread with fruit and coffee before a safari vehicle | African Bison Classic Tours // TODO confirm credit |
| tours/picnic-maasai-cloth.jpg | journal.generic | Picnic lunch with checked cloth set before a safari vehicle | African Bison Classic Tours // TODO confirm credit |
| tours/sundowner-red-cushions.jpg | journal.generic | Sundowner setup with red cushions and drinks in open grassland | African Bison Classic Tours // TODO confirm credit |
| tours/sundowner-acacia-toast.jpg | journal.generic | Guests toasting drinks under an acacia tree beside a safari vehicle | African Bison Classic Tours // TODO confirm credit |
| tours/vehicle-herd-kay-280l.jpg | journal.generic | Open safari vehicle parked before a grazing wildebeest herd | African Bison Classic Tours // TODO confirm credit |
| destinations/serengeti-gate.jpg | destinations/serengeti | Serengeti National Park entrance gate with a safari vehicle | African Bison Classic Tours // TODO confirm credit |
| destinations/amboseli-elephants-kilimanjaro.jpg | destinations/amboseli | Elephant herd grazing with snow capped Kilimanjaro behind | African Bison Classic Tours // TODO confirm credit |
| destinations/amboseli-cheetah-cairn.jpg | destinations/amboseli | Two cheetahs resting on a signed stone cairn in open plains | African Bison Classic Tours // TODO confirm credit |
| destinations/crater-lake-aerial.jpg | destinations/crater-lake | Crater lake from above with elephants and flamingos at dawn | Do not label Ngorongoro until confirmed |
| destinations/flamingo-lake-shore.jpg | destinations/flamingo-lake | Buffalo and gazelles before a lake edged with flamingos | Do not claim Nakuru or Manyara until confirmed |
| destinations/rhino-flamingo-shore.jpg | destinations/flamingo-lake | Rhino grazing at a lake edge lined with flamingos | Do not claim Nakuru until confirmed |
| destinations/buffalo-flamingo-shallows.jpg | destinations/flamingo-lake | Buffalo resting in shallow water with flamingos behind | African Bison Classic Tours // TODO confirm credit |
| destinations/flamingos-close.jpg | destinations/flamingo-lake | Flamingos walking through shallow lake water at close range | African Bison Classic Tours // TODO confirm credit |
| destinations/flamingos-flight.jpg | destinations/flamingo-lake | Flamingos landing on a lake crowded with birds | African Bison Classic Tours // TODO confirm credit |
| destinations/elephants-river-aerial.jpg | destinations/riverine | Elephants in a wide riverbed seen from above | African Bison Classic Tours // TODO confirm credit |
| destinations/impala-elephant-waterhole.jpg | destinations/waterhole | Impalas drinking at a waterhole with elephants behind | African Bison Classic Tours // TODO confirm credit |
| destinations/buffalo-herd-grass.jpg | destinations/savanna | Buffalo herd standing in tall savanna grass | African Bison Classic Tours // TODO confirm credit |
| destinations/topi-herd-golden.jpg | destinations/savanna | Antelopes grazing in golden grass under acacia trees | African Bison Classic Tours // TODO confirm credit |
| destinations/elephants-egrets-vehicles.jpg | destinations/savanna | Elephants with egrets in grassland, safari vehicles behind | African Bison Classic Tours // TODO confirm credit |
| destinations/elephants-forest-edge.jpg | destinations/savanna | Elephants partly hidden in thick green bush | African Bison Classic Tours // TODO confirm credit |
| destinations/red-elephants-lodge.jpg | destinations/savanna | Elephants walking before a safari lodge and muddy pool | Do not name the lodge or park |
| destinations/birdlife-shoreline.jpg | destinations/wetland | Cormorants, storks, hippos and elephants sharing a shoreline | African Bison Classic Tours // TODO confirm credit |
| destinations/highland-waterfall.jpg | destinations/highlands | Tall waterfall dropping through a green highland gorge | Do not claim Aberdares until confirmed |
| destinations/moorland-hikers.jpg | destinations/highlands | Hikers walking moorland between rock towers | Confirm Mount Kenya before naming |
| experiences/giraffe-centre-sign.jpg | experiences/giraffe-centre | Giraffe Centre entrance sign in Nairobi Kenya | African Bison Classic Tours // TODO confirm credit |
| experiences/giraffe-feeding-platform.jpg | experiences/giraffe-centre | Giraffes reaching for food at a raised feeding platform | African Bison Classic Tours // TODO confirm credit |
| experiences/giraffe-hand-feed.jpg | experiences/giraffe-centre | Giraffe taking food from a visitor's hand at close range | African Bison Classic Tours // TODO confirm credit |
| experiences/orphan-calves-line.jpg | experiences/elephant-orphanage | Keeper walking with a line of young orphan elephants | Confirm naming before publishing |
| experiences/calf-bottle-crowd.jpg | experiences/elephant-orphanage | Young elephant lifting a milk bottle before visitors | African Bison Classic Tours // TODO confirm credit |
| experiences/calf-bottle-keeper.jpg | experiences/elephant-orphanage | Keeper bottle feeding a young elephant under acacia trees | Trust logo on coat, keep or crop |
| experiences/calf-playing-keeper.jpg | experiences/elephant-orphanage | Young elephant playing with a keeper on sandy ground | Photographer credit in source, confirm credit |
| experiences/nairobi-museum-entrance.jpg | experiences/nairobi-museum | Nairobi National Museum entrance with a metal sculpture | African Bison Classic Tours // TODO confirm credit |
| experiences/nairobi-museum-hall.jpg | experiences/nairobi-museum | Museum hall with elephant, giraffe and zebra displays | Third-party watermark, needs clean export |
| experiences/nairobi-museum-culture.jpg | experiences/nairobi-museum | Visitor viewing a cultural display with leopard figures | African Bison Classic Tours // TODO confirm credit |
| experiences/dancers-baskets-stage.jpg | experiences/bomas | Dancers leaping on stage with baskets and drums | Confirm Bomas before naming |
| experiences/dancers-red-costume.jpg | experiences/bomas | Dancers in red and straw costume performing on stage | Confirm Bomas before naming |
| experiences/auditorium-red-floor.jpg | experiences/bomas | Empty auditorium with a red stage floor and tiered seats | Confirm Bomas before naming |
| experiences/carnivore-carver.jpg | experiences/carnivore | Carver holding roasted meat before a menu board | African Bison Classic Tours // TODO confirm credit |
| experiences/carnivore-service.jpg | experiences/carnivore | Carver serving roasted meat to a guest at a table | African Bison Classic Tours // TODO confirm credit |
| journal/trek-hillside-group.jpg | journal.generic | Guided group trekking up a green hillside | Do not imply gorilla trekking |
| texture/savanna-dusk.jpg | closing.background | Savanna at sunset with a safari vehicle and wildlife | African Bison Classic Tours // TODO confirm credit |

## Unplaced from the batch

- Gorilla forest portraits (3): catalogue has no Uganda product, so
  journal or generic texture only, never a destination claim.
- Supplied circular buffalo logo: needs cleanup to a solid-background
  PNG plus an original circular text ring for the header badge and
  favicon. Not placed as a photo.

## Still needing photography

Nairobi National Park (no image in batch), beach or Zanzibar,
Tarangire baobab, Lake Naivasha boat, Samburu, true lodge interior,
vehicle interior detail, guide portrait, family or honeymoon moment,
night sky.
