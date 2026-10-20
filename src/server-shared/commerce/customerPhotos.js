const sharp = require("sharp");

/** Small, metadata-free JPEGs; originals and arbitrary file formats are never stored. */
async function preparePhoto(value, size = 960) {
  if (
    typeof value !== "string" ||
    value.length > 170000 ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    throw Error("Choose a JPEG photo smaller than 120 KB.");
  const input = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  if (input.length > 120 * 1024) throw Error("Choose a smaller photo.");
  try {
    const image = sharp(input, {
      limitInputPixels: 16000000,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (meta.format !== "jpeg") throw Error("Invalid photo format.");
    const output = await image
      .rotate()
      .resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 68, mozjpeg: true })
      .toBuffer();
    if (output.length > 80 * 1024) throw Error("Photo is too large.");
    return {
      data: output.toString("base64"),
      content_type: "image/jpeg",
      updated_at: new Date().toISOString(),
    };
  } catch {
    throw Error(
      "This photo could not be processed. Choose a smaller JPEG image.",
    );
  }
}

async function saveProfilePhoto(db, input, uid) {
  const ref = db.doc(`users/${uid}/media/profile`);
  if (input.photo === null) await ref.delete();
  else await ref.set(await preparePhoto(input.photo, 320));
  return { saved: true };
}
module.exports = { preparePhoto, saveProfilePhoto };
