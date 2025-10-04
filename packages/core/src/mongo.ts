import mongoose from "mongoose";
export const RawPage = mongoose.model("raw_pages", new mongoose.Schema({
  url: { type: String, index: true }, html: String, site: String, fetchedAt: Date
}));

export const RawTranscript = mongoose.model("raw_transcripts", new mongoose.Schema({
  videoId: { type: String, index: true }, channel: String, text: String, lang: String, duration: Number, fetchedAt: Date
}));

export const RawComments = mongoose.model("raw_comments", new mongoose.Schema({
  videoId: String, comments: [Object], fetchedAt: Date
}));

export async function connectMongo(){
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URL!);
}