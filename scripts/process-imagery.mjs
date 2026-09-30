/**
 * Processes client originals from incoming/ into public/images/.
 * - Max 2400px on the long edge (sources are all smaller: no upscale).
 * - EXIF/GPS stripped (sharp drops metadata unless withMetadata is set).
 * - Re-encoded as quality-82 JPEGs with kebab-case names.
 * - Rebuilds the IMAGES registry block in lib/imagery.ts.
 * - Copies the hero still as public/images/hero/hero-poster.jpg.
 * - Never touches Exhibit 1 (third-party watermark): stays in incoming/.
 *
 * Run: node scripts/process-imagery.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const INCOMING = join(ROOT, "incoming");
const OUT = join(ROOT, "public", "images");
const CREDIT = "African Bison Classic Tours // TODO confirm credit";

/** [source, out, id, alt, focal, slots, credit?] */
const MAPPING = [
  ["hot air balloon.jpg", "hero/balloon-basket-sunrise.jpg", "balloon-basket-sunrise",
    "Hot air balloon basket carrying guests over wildebeest and zebra herds at sunrise", "70% 25%", ["hero.primary"]],
  ["hot air ballon over wildbeasts.jpg", "hero/balloon-over-herds.jpg", "balloon-over-herds",
    "Hot air balloon drifting over a grazing wildebeest herd in golden grass", "50% 55%", ["closing.background"]],
  ["zebras and giraffes.jpg", "hero/savanna-sunset-encounter.jpg", "savanna-sunset-encounter",
    "Giraffes and zebras gathered beside a safari vehicle at sunset", "50% 35%", ["statement.break"]],
  ["wildbeast migration.jpg", "hero/migration-river-sunset.jpg", "migration-river-sunset",
    "Wildebeest crossing a river at sunset, seen from above", "50% 40%", ["migration.scene"]],
  ["Masai Mara Game Reserve 3.jpg", "tours/mara-migration-descent.jpg", "mara-migration-descent",
    "Wildebeest descending a dusty bank toward a river in the Maasai Mara", "50% 40%", ["tours/category/kenya-tanzania"]],
  ["Masai Mara Game Reserve 4.jpg", "tours/mara-game-drive-herd.jpg", "mara-game-drive-herd",
    "Open safari vehicle parked before a grazing wildebeest herd in the Maasai Mara", "50% 45%", ["tours/category/kenya"]],
  ["Serengeti National Park 1.jpg", "tours/serengeti-river-crossing.jpg", "serengeti-river-crossing",
    "Wildebeest crossing a rocky river in the Serengeti", "50% 55%", ["tours/category/tanzania", "tours/category/kenya-tanzania", "destinations/serengeti"]],
  ["Serengeti National Park 2.jpg", "tours/serengeti-zebra-river.jpg", "serengeti-zebra-river",
    "Zebra herd wading through a river under acacia trees in the Serengeti", "50% 55%", ["tours/category/tanzania"], "Cem Sural // TODO confirm licence"],
  ["Masai Mara Game Reserve.jpg", "tours/mara-lion-vehicle.jpg", "mara-lion-vehicle",
    "Male lion standing beside a safari vehicle in the Maasai Mara", "55% 45%", ["tours/category/kenya"]],
  ["Lions in maasai mara.jpg", "tours/mara-lion-pride.jpg", "mara-lion-pride",
    "Lion pride resting beside a safari vehicle with guests in the Maasai Mara", "50% 45%", ["tours/category/kenya"]],
  ["Zebras in maasai mara.jpg", "tours/mara-zebras-dusk.jpg", "mara-zebras-dusk",
    "Zebras walking past a safari vehicle with guests at dusk in the Maasai Mara", "50% 60%", ["tours/category/kenya", "destinations/masai-mara"]],
  ["Serengeti National Park.jpg", "tours/serengeti-gate.jpg", "serengeti-gate",
    "Safari vehicle passing the Serengeti National Park entrance gate", "50% 60%", ["tours/category/tanzania"]],
  ["Serengeti tanzania game drive.jpg", "tours/serengeti-game-drive.jpg", "serengeti-game-drive",
    "Game drive in the Serengeti, Tanzania", "50% 40%", ["tours/category/tanzania"]],
  ["Serengeti National Park 3.jpg", "tours/serengeti-plains.jpg", "serengeti-plains",
    "Safari scene in Serengeti National Park", "50% 40%", ["tours/category/tanzania"]],
  ["Masai Mara Game Reserve 1.jpg", "tours/mara-plains-1.jpg", "mara-plains-1",
    "Safari scene in the Maasai Mara Game Reserve", "50% 40%", ["tours/category/kenya"]],
  ["Masai Mara Game Reserve 2.jpg", "tours/mara-plains-2.jpg", "mara-plains-2",
    "Safari scene in the Maasai Mara Game Reserve", "50% 40%", ["tours/category/kenya"]],
  ["Masai Mara Game Reserve 5.jpg", "tours/mara-plains-3.jpg", "mara-plains-3",
    "Safari scene in the Maasai Mara Game Reserve", "50% 40%", ["tours/category/kenya"]],
  ["Amboseli National Park 1.jpg", "tours/amboseli-scene-1.jpg", "amboseli-scene-1",
    "Safari scene in Amboseli National Park", "50% 40%", ["tours/category/kenya"]],
  ["Amboseli National Park.jpg", "tours/amboseli-scene-2.jpg", "amboseli-scene-2",
    "Safari scene in Amboseli National Park", "50% 40%", ["tours/category/kenya", "tours/category/nairobi-day"]],
  ["Amboseli National Park 2.jpg", "destinations/amboseli-elephants-egrets.jpg", "amboseli-elephants-egrets",
    "Elephants with egrets in Amboseli National Park, safari vehicles behind", "50% 45%", ["destinations/amboseli"]],
  ["Lake Manyara.jpg", "destinations/manyara-flamingo-lake.jpg", "manyara-flamingo-lake",
    "Buffalo and gazelles before the flamingo covered lake in Lake Manyara", "50% 40%", ["destinations/lake-manyara"]],
  ["Lake Nakuru National Park 1.jpg", "destinations/nakuru-buffalo-flamingos.jpg", "nakuru-buffalo-flamingos",
    "Buffalo resting in shallow water with flamingos behind in Lake Nakuru National Park", "50% 45%", ["destinations/lake-nakuru"]],
  ["Lake Nakuru National Park 2.jpg", "destinations/nakuru-wildlife-2.jpg", "nakuru-wildlife-2",
    "Wildlife at Lake Nakuru National Park", "50% 40%", ["destinations/lake-nakuru"]],
  ["Lake Nakuru National Park 3.jpg", "destinations/nakuru-wildlife-3.jpg", "nakuru-wildlife-3",
    "Wildlife at Lake Nakuru National Park", "50% 40%", ["destinations/lake-nakuru"]],
  ["Lake Nakuru National Park.jpg", "destinations/nakuru-wildlife-4.jpg", "nakuru-wildlife-4",
    "Wildlife at Lake Nakuru National Park", "50% 40%", ["destinations/lake-nakuru"]],
  ["Ngorongoro Crater.jpg", "destinations/ngorongoro-crater-aerial.jpg", "ngorongoro-crater-aerial",
    "Ngorongoro Crater lake from above with elephants at dawn", "50% 45%", ["destinations/ngorongoro"]],
  ["Tarangire national park.jpg", "destinations/tarangire-river-elephants.jpg", "tarangire-river-elephants",
    "Elephants in a wide riverbed in Tarangire National Park, seen from above", "50% 40%", ["destinations/tarangire"]],
  ["Aberdare national park 2.jpg", "destinations/aberdare-moorland-hikers.jpg", "aberdare-moorland-hikers",
    "Hikers walking moorland between rock towers in Aberdare National Park", "50% 55%", ["destinations/aberdares"]],
  ["Aberdare national park 1.jpg", "destinations/aberdare-highlands-1.jpg", "aberdare-highlands-1",
    "Highland scenery in Aberdare National Park", "50% 40%", ["destinations/aberdares"]],
  ["Aberdare national park 3.jpg", "destinations/aberdare-highlands-2.jpg", "aberdare-highlands-2",
    "Highland scenery in Aberdare National Park", "50% 40%", ["destinations/aberdares"]],
  ["Aberdare national park.jpg", "destinations/aberdare-highlands-3.jpg", "aberdare-highlands-3",
    "Highland scenery in Aberdare National Park", "50% 40%", ["destinations/aberdares"]],
  ["Giraffe centre 1.jpg", "experiences/giraffe-centre-sign.jpg", "giraffe-centre-sign",
    "Giraffe Centre entrance sign in Nairobi, Kenya", "50% 40%", ["experiences/giraffe-centre"]],
  ["Giraffe centre 2.jpg", "experiences/giraffe-feeding-platform.jpg", "giraffe-feeding-platform",
    "Giraffes at the feeding platform at the Giraffe Centre, Nairobi", "50% 40%", ["experiences/giraffe-centre"]],
  ["Giraffe centre 3.jpg", "experiences/giraffe-hand-feeding.jpg", "giraffe-hand-feeding",
    "Giraffe taking food from a visitor's hand at the Giraffe Centre, Nairobi", "50% 40%", ["experiences/giraffe-centre"]],
  ["Daphne Sheldrick Elephant Orphanage 1.jpg", "experiences/sheldrick-bottle-feeding.jpg", "sheldrick-bottle-feeding",
    "Keeper bottle feeding a young elephant at the Sheldrick Elephant Orphanage, Nairobi", "50% 40%", ["experiences/sheldrick-elephant-orphanage"]],
  ["Daphne Sheldrick Elephant Orphanage 2.jpg", "experiences/sheldrick-calf-line.jpg", "sheldrick-calf-line",
    "Keeper walking with young orphan elephants at the Sheldrick Elephant Orphanage, Nairobi", "50% 40%", ["experiences/sheldrick-elephant-orphanage"]],
  ["Daphne Sheldrick Elephant Orphanage 3.jpg", "experiences/sheldrick-calf-bottle.jpg", "sheldrick-calf-bottle",
    "Young elephant drinking from a milk bottle at the Sheldrick Elephant Orphanage, Nairobi", "50% 40%", ["experiences/sheldrick-elephant-orphanage"]],
  ["Daphne Sheldrick Elephant Orphanage.jpg", "experiences/sheldrick-calf-visitors.jpg", "sheldrick-calf-visitors",
    "Young elephant with visitors at the Sheldrick Elephant Orphanage, Nairobi", "50% 40%", ["experiences/sheldrick-elephant-orphanage"]],
  ["Nairobi national museum entrance.jpg", "experiences/nairobi-museum-entrance.jpg", "nairobi-museum-entrance",
    "Nairobi National Museum entrance with a metal sculpture", "50% 45%", ["experiences/nairobi-national-museum", "destinations/nairobi"]],
  ["Exhibit 2 inside the museum.jpg", "experiences/nairobi-museum-culture.jpg", "nairobi-museum-culture",
    "Visitor viewing a cultural wildlife display inside the Nairobi National Museum", "50% 40%", ["experiences/nairobi-national-museum"]],
  ["Bomas of kenya 1.jpg", "experiences/bomas-dancers.jpg", "bomas-dancers",
    "Dancers leaping on stage with baskets and drums at Bomas of Kenya", "50% 40%", ["experiences/bomas-of-kenya"]],
  ["Bomas of kenya.jpg", "experiences/bomas-dancers-costume.jpg", "bomas-dancers-costume",
    "Dancers in costume performing on stage at Bomas of Kenya", "50% 40%", ["experiences/bomas-of-kenya"]],
  ["Bomas of Kenya Auditorium.jfif", "experiences/bomas-auditorium.jpg", "bomas-auditorium",
    "Auditorium with a red stage floor at Bomas of Kenya", "50% 40%", ["experiences/bomas-of-kenya"]],
  ["carnivore restaurant naiobi 1.jpg", "experiences/carnivore-carver.jpg", "carnivore-carver",
    "Carver holding roasted meat before the menu board at Carnivore Restaurant, Nairobi", "50% 40%", ["experiences/carnivore-restaurant"]],
  ["carnivore restaurant naiobi.jpg", "experiences/carnivore-service.jpg", "carnivore-service",
    "Carver serving roasted meat to a guest at Carnivore Restaurant, Nairobi", "50% 40%", ["experiences/carnivore-restaurant"]],
  ["A meal at maasai mara.jpg", "journal/mara-bush-meal.jpg", "mara-bush-meal",
    "Bush meal spread in the Maasai Mara", "50% 40%", ["journal.generic"]],
  ["A meal in the game reserve.jpg", "journal/bush-picnic.jpg", "bush-picnic",
    "Picnic lunch set before a safari vehicle in a game reserve", "50% 40%", ["journal.generic"]],
  ["Out door meals.jpg", "journal/bush-breakfast-table.jpg", "bush-breakfast-table",
    "Bush breakfast table set outdoors beside a safari vehicle", "50% 40%", ["journal.generic"]],
  ["sundowner at maasai mara.jpg", "journal/mara-sundowner.jpg", "mara-sundowner",
    "Sundowner drinks in the Maasai Mara at dusk", "50% 40%", ["journal.generic"]],
  ["Queen Elizabeth National Park 2.jpg", "journal/queen-elizabeth-shoreline.jpg", "queen-elizabeth-shoreline",
    "Elephants, hippos and waterbirds sharing a shoreline in Queen Elizabeth National Park", "50% 40%", ["journal.generic"]],
  ["Queen Elizabeth National Park 1.jpg", "journal/queen-elizabeth-1.jpg", "queen-elizabeth-1",
    "Wildlife in Queen Elizabeth National Park", "50% 40%", ["journal.generic"]],
  ["Queen Elizabeth National Park.jpg", "journal/queen-elizabeth-2.jpg", "queen-elizabeth-2",
    "Wildlife in Queen Elizabeth National Park", "50% 40%", ["journal.generic"]],
  ["Bwindi Impenetrable National Park 2.jpg", "journal/bwindi-trek.jpg", "bwindi-trek",
    "Guided group trekking up green hillsides in Bwindi Impenetrable National Park", "50% 45%", ["journal.generic"]],
  ["Bwindi Impenetrable National Park 1.jpg", "journal/bwindi-forest-1.jpg", "bwindi-forest-1",
    "Gorillas in the forest of Bwindi Impenetrable National Park", "50% 40%", ["journal.generic"]],
  ["Bwindi Impenetrable National Park 3.jpg", "journal/bwindi-forest-2.jpg", "bwindi-forest-2",
    "Gorilla in the forest of Bwindi Impenetrable National Park", "50% 40%", ["journal.generic"]],
  ["Bwindi Impenetrable National Park.jpg", "journal/bwindi-forest-3.jpg", "bwindi-forest-3",
    "Forest hillside in Bwindi Impenetrable National Park", "50% 40%", ["journal.generic"]],
  ["samburu northern road.jpg", "destinations/samburu-road-aerial.jpg", "samburu-road-aerial",
    "Aerial view of the northern road through Samburu country toward a flat-topped mountain", "50% 40%", ["destinations/samburu"]],
  ["Buffalo springs samburu.jpg", "journal/samburu-buffalo-springs.jpg", "samburu-buffalo-springs",
    "Safari scene at Buffalo Springs, Samburu", "50% 40%", ["journal.generic"]],
  ["samburu national reserve 1.jpg", "journal/samburu-reserve-1.jpg", "samburu-reserve-1",
    "Safari scene in Samburu National Reserve", "50% 40%", ["journal.generic"]],
  ["samburu national reserve.jpg", "journal/samburu-reserve-2.jpg", "samburu-reserve-2",
    "Safari scene in Samburu National Reserve", "50% 40%", ["journal.generic"]],
  ["Nairobi national park 1.jpg", "experiences/nairobi-park-lion-vehicles.jpg", "nairobi-park-lion-vehicles",
    "Lioness resting beside the track as safari vehicles watch in Nairobi National Park", "50% 55%", ["experiences/nairobi-national-park"]],
  ["Nairobi national park 2.jpg", "experiences/nairobi-park-drive.jpg", "nairobi-park-drive",
    "Game drive in Nairobi National Park", "50% 40%", ["experiences/nairobi-national-park"]],
  ["Nairobi national park.jpg", "experiences/nairobi-park-wildlife.jpg", "nairobi-park-wildlife",
    "Wildlife in Nairobi National Park", "50% 40%", ["experiences/nairobi-national-park"]],
  ["Lake Naivasha 1.jpg", "destinations/naivasha-boat-ride.jpg", "naivasha-boat-ride",
    "Guests on a boat ride across Lake Naivasha at dusk", "50% 45%", ["destinations/lake-naivasha"]],
  ["Lake Naivasha.jpg", "destinations/naivasha-lake.jpg", "naivasha-lake",
    "Lake Naivasha, Kenya", "50% 40%", ["destinations/lake-naivasha"]],
  ["Tsavo east.jpg", "destinations/tsavo-east-elephants.jpg", "tsavo-east-elephants",
    "Elephants drinking at a waterhole in Tsavo East", "50% 45%", ["destinations/tsavo-east"]],
  ["Tsavo west.jpg", "destinations/tsavo-west-elephants.jpg", "tsavo-west-elephants",
    "Red elephants at a waterhole in Tsavo West", "50% 45%", ["destinations/tsavo-west"]],
  ["Tsavo.jpg", "journal/tsavo-scene.jpg", "tsavo-scene",
    "Safari scene in Tsavo", "50% 40%", ["journal.generic"]],
  ["Kilimanjaro summit.jpg", "destinations/kilimanjaro-summit.jpg", "kilimanjaro-summit",
    "Hikers on the rocky summit ridge of Mount Kilimanjaro above the clouds at sunrise", "50% 35%", ["destinations/kilimanjaro"]],
  ["Mount Kilimanjaro 1.jpg", "destinations/kilimanjaro-uhuru-sign.jpg", "kilimanjaro-uhuru-sign",
    "Uhuru Peak signpost at the summit of Mount Kilimanjaro, Tanzania", "50% 40%", ["destinations/kilimanjaro"]],
  ["Mount Kilimanjaro.jpg", "destinations/kilimanjaro-mountain.jpg", "kilimanjaro-mountain",
    "Mount Kilimanjaro, Tanzania", "50% 40%", ["destinations/kilimanjaro"]],
  ["salaam cave zanzibar.jpg", "journal/zanzibar-salaam-turtles.jpg", "zanzibar-salaam-turtles",
    "Sea turtles swimming in clear water at Salaam Cave, Zanzibar", "50% 40%", ["journal.generic"]],
  ["Stone town zanzibar.jpg", "journal/zanzibar-stone-town.jpg", "zanzibar-stone-town",
    "Carved wooden balconies on a historic building in Stone Town, Zanzibar", "50% 35%", ["journal.generic"]],
  ["Zanzibar.jpg", "journal/zanzibar-island.jpg", "zanzibar-island",
    "Zanzibar island", "50% 40%", ["journal.generic"]],
  ["safari vehicle interior.jpg", "journal/vehicle-interior-track.jpg", "vehicle-interior-track",
    "View from the rear seats of a safari Land Cruiser down a bush track", "50% 40%", ["journal.generic"]],
  ["safari vehicle interior 1.jpg", "journal/vehicle-interior.jpg", "vehicle-interior",
    "Inside a safari Land Cruiser", "50% 40%", ["journal.generic"]],
  ["safari vehicle.jpg", "journal/vehicle-guests-roof.jpg", "vehicle-guests-roof",
    "Guests waving from the pop-up roof of a safari Land Cruiser", "50% 45%", ["journal.generic"]],
  ["Family moment 1.jpg", "journal/group-serengeti-sign.jpg", "group-serengeti-sign",
    "Group of travellers posed at the Serengeti National Park entrance sign", "50% 40%", ["journal.generic"]],
  ["Family moment 2.jpg", "journal/travellers-safari-2.jpg", "travellers-safari-2",
    "Travellers enjoying a safari", "50% 40%", ["journal.generic"]],
  ["Family moment.jpg", "journal/travellers-safari-3.jpg", "travellers-safari-3",
    "Travellers enjoying a safari", "50% 40%", ["journal.generic"]],
  ["Lodge interior 4.jpg", "journal/lodge-deck-elephants.jpg", "lodge-deck-elephants",
    "Lodge deck with chairs overlooking elephants at a waterhole", "50% 45%", ["stay/lodge-deck", "journal.generic"]],
  ["Lodge interior 1.jpg", "journal/lodge-lounge.jpg", "lodge-lounge",
    "Tented lodge lounge with rattan lamps opening onto a deck", "50% 45%", ["stay/lodge-lounge", "journal.generic"]],
  ["Lodge interior 2.jpg", "journal/lodge-deck-sunset.jpg", "lodge-deck-sunset",
    "Lodge deck with loungers overlooking elephants at a waterhole at sunset", "50% 45%", ["stay/lodge-deck-sunset", "journal.generic"]],
  ["Lodge interior 3.jpg", "journal/lodge-pool.jpg", "lodge-pool",
    "Lodge swimming pool with loungers under acacia trees", "50% 45%", ["stay/lodge-pool", "journal.generic"]],
  ["Lodge interior.jpg", "journal/lodge-bedroom.jpg", "lodge-bedroom",
    "Lodge bedroom with thatched roof opening onto a deck", "50% 45%", ["stay/lodge-bedroom", "journal.generic"]],
  ["Honeymoon moment.jpg", "journal/honeymoon-roof.jpg", "honeymoon-roof",
    "Couple sharing champagne on a vehicle roof deck at sunset with elephants behind", "50% 40%", ["stay/honeymoon", "journal.generic"]],
  ["Honeymoon moment 1.jpg", "journal/honeymoon-dinner.jpg", "honeymoon-dinner",
    "Private dinner with fire pit on a lodge deck at dusk", "50% 45%", ["stay/honeymoon-dinner", "journal.generic"]],
  ["Honeymoon moment 2.jpg", "journal/honeymoon-pool.jpg", "honeymoon-pool",
    "Couple in a plunge pool watching elephants at sunset", "50% 40%", ["stay/honeymoon-pool", "journal.generic"]],
  ["Night sky.jpg", "texture/night-dinner.jpg", "night-dinner",
    "Lantern-lit bush dinner under an acacia tree at night", "50% 40%", ["texture/night-dinner", "journal.generic"]],
  ["Night sky 1.jpg", "texture/night-stars.jpg", "night-stars",
    "Guests stargazing from an open safari vehicle under the Milky Way", "50% 30%", ["texture/night-sky", "journal.generic"]],
  ["Museum hall.jpg", "experiences/nairobi-museum-hall.jpg", "nairobi-museum-hall",
    "Art gallery hall inside the Nairobi National Museum", "50% 45%", ["experiences/nairobi-national-museum"]],
  ["Guide potrait.jpg", "journal/guide-portrait.jpg", "guide-portrait",
    "Smiling safari guide with a radio, elephants behind", "50% 35%", ["team/guide", "journal.generic"]],
];
// NOTE: "Guide potrait.png" arrived as a 0-byte file and is superseded by
// the re-sent "Guide potrait.jpg".

const seen = new Set();
for (const row of MAPPING) {
  if (seen.has(row[1])) throw new Error(`duplicate target ${row[1]}`);
  seen.add(row[1]);
}

const entries = [];
let totalIn = 0;
let totalOut = 0;

for (const [source, out, id, alt, focal, slots, credit] of MAPPING) {
  const srcPath = join(INCOMING, source);
  if (!existsSync(srcPath)) throw new Error(`missing source: ${source}`);
  const destPath = join(OUT, out);
  mkdirSync(join(destPath, ".."), { recursive: true });
  const input = await sharp(srcPath).rotate();
  const meta = await input.metadata();
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  const pipeline = longest > 2400
    ? input.resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    : input;
  const info = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(destPath);
  const { statSync } = await import("node:fs");
  totalIn += statSync(srcPath).size;
  totalOut += info.size;
  const orientation = info.width === info.height ? "square" : info.width > info.height ? "landscape" : "portrait";
  entries.push({ id, src: `/images/${out}`, alt, width: info.width, height: info.height, focal, orientation, slots, credit: credit ?? CREDIT });
  console.log(`${String(info.width).padStart(5)}x${String(info.height).padStart(5)} ${orientation.padEnd(9)} ${(info.size / 1024).toFixed(0).padStart(5)}KB :: ${out}`);
}

// Logo copies (unregistered brand assets, used directly by the header).
// Each source is optional: older originals may leave incoming/.
{
  const brandDir = join(OUT, "brand");
  mkdirSync(brandDir, { recursive: true });
  const reference = join(INCOMING, "African Bison Classic Tours Logo.jfif");
  if (existsSync(reference)) {
    await sharp(reference).rotate().jpeg({ quality: 82, mozjpeg: true }).toFile(join(brandDir, "logo-reference.jpg"));
  }
  // Transparent PNG keeps its alpha channel: resize only, never flatten.
  const transparent = join(INCOMING, "TRANSPARENT LOGO.png");
  if (existsSync(transparent)) {
    await sharp(transparent).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).png().toFile(join(brandDir, "logo.png"));
  }
  console.log("logo copies written (unregistered)");
}

// Hero poster: reuse the hero still until a video frame is supplied.
copyFileSync(join(OUT, "hero", "balloon-basket-sunrise.jpg"), join(OUT, "hero", "hero-poster.jpg"));
console.log("hero poster copied from hero still");

// Report unmapped files (expected: Exhibit 1 watermark + .gitkeep).
const mapped = new Set([...MAPPING.map((row) => row[0]), "African Bison Classic Tours Logo.jfif"]);
for (const file of readdirSync(INCOMING)) {
  if (!mapped.has(file)) console.log(`UNMAPPED (stays in incoming): ${file}`);
}
console.log(`in ${(totalIn / 1024 / 1024).toFixed(1)}MB -> out ${(totalOut / 1024 / 1024).toFixed(1)}MB, ${entries.length} images`);

// Rewrite the IMAGES registry block in lib/imagery.ts.
const libPath = join(ROOT, "lib", "imagery.ts");
const lib = readFileSync(libPath, "utf8");
const block = `export const IMAGES: ImageEntry[] = ${JSON.stringify(entries, null, 2)};`;
const next = lib.replace(/\/\/ GENERATED:BEGIN[\s\S]*?\/\/ GENERATED:END/, `// GENERATED:BEGIN\n${block}\n// GENERATED:END`);
if (next === lib) throw new Error("marker block not found in lib/imagery.ts");
writeFileSync(libPath, next);
console.log("lib/imagery.ts registry rebuilt");
